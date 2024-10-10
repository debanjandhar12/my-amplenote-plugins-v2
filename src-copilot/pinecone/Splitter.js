export class Splitter {
    async split(app, note) {
        const noteContent = await app.getNoteContent({uuid: note.uuid});
        let result = [];
        result.push({
                id: `${note.uuid}##${result.length}`,
                metadata: {
                    pageContent: `---\nnote-title: ${note.name}\nnote-uuid: ${note.uuid}\ncontent-heirarchy: todo\n---\n${noteContent.substring(0, 4800)}`,
                    isJournal: false,
                    noteUUID: note.uuid,
                    namespace: "note-content",
                    version: 1
                }
        });
        result.push({
            id: `${note.uuid}`,
            metadata: {
                pageContent: `---\nnote-title: ${note.name}\nnote-uuid: ${note.uuid}\nnote-tags: ${note.tags.join(", ")}\n---`,
                noteUUID: note.uuid,
                namespace: "note-tags",
                isTagOnly: true,
                version: 1
            }
        });

        return result;
    }
}