import DuckDBConnectionController from "./DuckDBConnectionController.js";
import { getJSDeliverBundleUrl } from "../../../common-utils/dynamic-import-esm.js";
import { isArray } from "lodash-es";


export class DuckDBHelpCenterManager {
    static _instance = null;

    async _performInit() {
        if (this.db && !DuckDBConnectionController.isTerminated()) return;
        try {
            this.db = await DuckDBConnectionController.getCollectionInstance('CopilotTempDB', { persistent: false });
            const conn = await this.db.connect();
            await conn.query(`CHECKPOINT;`);
            await conn.close();
        } catch (e) {
            console.error('DuckDBHelpCenterManager init error:', e);
            throw e;
        }
    }

    async searchHelpCenterRecordByEmbedding(embedding, { limit = 15, filename = 'localHelpCenterEmbeddings.parquet' } = {}) {
        let conn;
        let stmt;

        try {
            conn = await this.db.connect();

            const parquetUrl = getJSDeliverBundleUrl(filename);

            stmt = await conn.prepare(`
                SELECT
                    *,
                    list_dot_product(embedding, ?) AS similarity
                FROM
                    read_parquet('${parquetUrl}')
                ORDER BY
                    similarity DESC
                LIMIT ?;
            `);

            if (embedding instanceof Float32Array || embedding instanceof Float64Array) {
                // Convert to array so we can JSON.stringify it
                embedding = Array.from(embedding);
            }
            if (!isArray(embedding)) {
                throw new Error('Embedding must be an array of numbers.');
            }

            const result = await stmt.query(JSON.stringify(embedding), limit);
            const rows = result.toArray();
            const resArr = [];
            rows.forEach(row => {
                resArr.push({
                    id: row.id,
                    noteUUID: row.noteUUID,
                    noteTitle: row.noteTitle,
                    actualNoteContentPart: row.actualNoteContentPart,
                    similarity: row.similarity
                });
            });

            return resArr;
        } catch (e) {
            console.error("Failed to search help center records:", e);
            throw e;
        } finally {
            if (stmt) {
                await stmt.close();
            }
            if (conn) {
                await conn.close();
            }
        }
    }

    static async getInstance() {
        if (!DuckDBHelpCenterManager._instance) {
            DuckDBHelpCenterManager._instance = new DuckDBHelpCenterManager();
        }

        await DuckDBHelpCenterManager._instance._performInit();
        return DuckDBHelpCenterManager._instance;
    }
}
