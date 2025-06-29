import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {OPFSManager} from "./OPFSManager.js";
// import {
//     AsyncDuckDB,
//     createWorker,
//     DuckDBAccessMode,
//     getJsDelivrBundles,
//     selectBundle,
//         ConsoleLogger,
//         VoidLogger
// } from "@duckdb/duckdb-wasm";

let db, isTerminated = true;
export default class DuckDBWorkerManager {
    static async getCollectionInstance(collectionName) {
        if (!db) {
            const {
                AsyncDuckDB,
                createWorker,
                getJsDelivrBundles,
                selectBundle,
                ConsoleLogger,
                VoidLogger
            } = await dynamicImportESM("@duckdb/duckdb-wasm");
            const JSDELIVR_BUNDLES = getJsDelivrBundles();
            const bundle = await selectBundle(JSDELIVR_BUNDLES);
            const worker_url = bundle.mainWorker;

            if (!worker_url) {
                throw new Error("Could not determine main duckdb worker URL from bundle.");
            }

            const worker = await createWorker(worker_url);
            // const logger = process.env.NODE_ENV === 'development' ? new ConsoleLogger() : new VoidLogger();
            const logger = new ConsoleLogger();
            db = new AsyncDuckDB(logger, worker);
            await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        }
        await db.open({
            path: `opfs://${collectionName}.db`,
            accessMode: 3, // DuckDBAccessMode.READ_WRITE = 3
        });
        isTerminated = false;
        return db;
    }

    static isTerminated() {
        return isTerminated;
    }

    static async terminateDB() {
        if (db) {
            await db.terminate();
            db = null;
            isTerminated = true;
        }
    }
}