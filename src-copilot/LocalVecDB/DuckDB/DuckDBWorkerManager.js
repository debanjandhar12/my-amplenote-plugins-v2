import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import * as duckdb from "@duckdb/duckdb-wasm";
import {DuckDBAccessMode, DuckDBDataProtocol} from "@duckdb/duckdb-wasm";

const instanceMap = new Map();
export default class DuckDBWorkerManager {
    static async getCollectionInstance(collectionName) {
        if (instanceMap.has(collectionName)) {
            return instanceMap.get(collectionName);
        }

        // const duckdb = await dynamicImportESM("@duckdb/duckdb-wasm");
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        console.log("JSDELIVR_BUNDLES", JSDELIVR_BUNDLES);
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        const worker_url = bundle.mainWorker;

        if (!worker_url) {
            throw new Error("Could not determine main duckdb worker URL from bundle.");
        }

        const worker = await duckdb.createWorker(worker_url);
        const logger = process.env.NODE_ENV === 'development' ? new duckdb.ConsoleLogger() : new duckdb.VoidLogger();
        let db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        const root = await navigator.storage.getDirectory();
        console.log("opfs root", root, await Array.fromAsync(root.entries()))
        await db.open({
            path: 'opfs://testf.db',
            accessMode: DuckDBAccessMode.READ_WRITE,
        });
        instanceMap.set(collectionName, db);
        return db;
    }
}