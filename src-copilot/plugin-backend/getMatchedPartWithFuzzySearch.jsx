import {Splitter} from "../LocalVecDB/splitter/Splitter.js";
import {LOCAL_VEC_DB_MAX_TOKENS} from "../constants.js";
import dynamicImportESM from "../../common-utils/dynamic-import-esm.js";

export const getMatchedPartWithFuzzySearch = async (app, noteUUID, searchText, limit = 1) => {
    const Fuse = (await dynamicImportESM("fuse.js")).default;
    const splitter = new Splitter(LOCAL_VEC_DB_MAX_TOKENS);
    const note = await app.findNote({uuid: noteUUID});
    const splitResult = await splitter.splitNote(app, note, true);

    const fuse = new Fuse(splitResult, { keys: ['actualNoteContentPart`'], threshold: 0.4 });
    return fuse.search(searchText, { limit }).map(result => result.item.actualNoteContentPart);
}
