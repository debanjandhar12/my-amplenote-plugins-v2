import {PINECONE_API_KEY_SETTING} from "../constants.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";
import {Splitter} from "./Splitter.js";
import {chunk, isArray} from "lodash-es";
import {getCorsBypassUrl} from "../../common-utils/cors-helpers.js";

/**
 * Creates / updates / deletes notes to pinecone. This does not delete notes from pinecone.
 * @param app
 * @returns {Promise<void>}
 */
export const syncNotes = async (app) => {
    // -- Initialize pinecone client --
    const { Pinecone } = await dynamicImportESM("@pinecone-database/pinecone");
    const pineconeClient = new Pinecone({
        apiKey: app.settings[PINECONE_API_KEY_SETTING],
        fetchApi: (url, options) => {
            url = getCorsBypassUrl(url);
            return fetch(url, options);
        }
    });
    const indexName = 'amplenote';
    await createIndexIfNotExists(pineconeClient, indexName);
    const index = pineconeClient.Index(indexName);
    const noteTagNameSpace = index.namespace('note-tags');
    const noteContentNameSpace = index.namespace('note-content');

    // -- Fetch target notes from amplenote --
    const lastSyncTime = app.settings["lastSyncTime"];
    const allNotes = await app.filterNotes({});

    // -- Delete non-existent notes from pinecone --
    const notesInPinecone = [];
    let paginationToken = null;
    while (true) {
        const page = !paginationToken ? await noteTagNameSpace.listPaginated()
        : await noteTagNameSpace.listPaginated({ paginationToken, limit: 100 });
        if(page.vectors && isArray(page.vectors)) {
            // Note: vector.id is same as note.uuid for note-tags namespace
            notesInPinecone.push(...page.vectors.map(vector => vector.id));
        }
        paginationToken = page.page_token;
        if (!page.page_token || !page.vectors || !isArray(page.vectors) || page.vectors.length === 0) break;
    }
    console.log('notesInPinecone', notesInPinecone);
    for (const noteUUID of notesInPinecone) {
        const note = allNotes.find(note => note.uuid === noteUUID);
        if (!note) {
            await deleteNamespaceEntries(noteTagNameSpace, [noteUUID]);
            await deleteNamespaceEntries(noteContentNameSpace, [noteUUID]);
        }
    }

    // -- Split and create embeddings for notes which are updated or created --
    // Filter notes to retain only those updated or created after lastSyncTime
    const filteredNotes = lastSyncTime != null ? allNotes.filter(note => {
        try {
            const parsedCreatedAt = new Date(note.created || note.createdAt);
            const parsedUpdatedAt = new Date(note.updated || note.updatedAt);
            const parsedLastSyncTime = new Date(lastSyncTime);
            if (parsedCreatedAt == null || parsedUpdatedAt == null) return true;
            return parsedUpdatedAt > parsedLastSyncTime || parsedCreatedAt > parsedLastSyncTime;
        } catch (e) {
            return true;
        }
    }) : allNotes;
    console.log('filteredNotes', filteredNotes);
    // 2. Split notes into smaller chunks and add to records
    const records = [];
    const splitter = new Splitter();
    for (const note of filteredNotes) {
        const splitResultForNote = await splitter.split(app, note);
        records.push(...splitResultForNote);
    }
    // -- Add / update data to pinecone --
    for (const recordChunk of chunk(records, 32)) {
        // 1. Generate embeddings
        const embeddings = await pineconeClient.inference.embed(
            'multilingual-e5-large',
            recordChunk.map(record => record.metadata.pageContent),
            {inputType: 'passage', truncate: 'END'}
        );
        embeddings.forEach((embedding, index) => {
            recordChunk[index].values = embedding.values;
        });

        // 2. Delete all records of noteUUID for which we are gonna upsert in pinecone
        if ((recordChunk.filter(record => notesInPinecone.includes(record.metadata.noteUUID))).length > 0) {
            await deleteNamespaceEntries(noteTagNameSpace, recordChunk.filter(record => notesInPinecone.includes(record.metadata.noteUUID)).map(record => record.metadata.noteUUID));
            await deleteNamespaceEntries(noteContentNameSpace, recordChunk.filter(record => notesInPinecone.includes(record.metadata.noteUUID)).map(record => record.metadata.noteUUID));
        }

        // 3. Add / update records
        await noteTagNameSpace.upsert(recordChunk.filter(record => record.metadata.namespace === 'note-tags'));
        await noteContentNameSpace.upsert(recordChunk.filter(record => record.metadata.namespace === 'note-content'));
    }

    app.setSetting("lastSyncTime", new Date().toISOString());
}

const createIndexIfNotExists = async (pineconeClient, indexName) => {
    const indexExists = await pineconeClient.describeIndex(indexName).catch(() => false);
    if (!indexExists) {
        await pineconeClient.createIndex({
            name: indexName,
            metric: 'cosine',
            dimension: 1024,
            spec: {
                serverless: {
                    cloud: 'aws',
                    region: 'us-east-1'
                }
            }
        });
    }
}

const deleteNamespaceEntries = async (namespace, noteUUIDList) => {
    let namespaceNoteUUIds = [];
    for (const noteUUID of noteUUIDList) {
        namespaceNoteUUIds = [...namespaceNoteUUIds, ...(await namespace.listPaginated({ prefix: noteUUID, limit: 100 }))
            .vectors.map((vector) => vector.id)];
    }
    if (namespaceNoteUUIds.length > 0) {
        await namespace.deleteMany(namespaceNoteUUIds);
    }
};