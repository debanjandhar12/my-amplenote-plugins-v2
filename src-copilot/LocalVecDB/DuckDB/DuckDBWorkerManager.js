import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
import {debounce} from "lodash-es";
import { Mutex } from "async-mutex";
// import {
//     AsyncDuckDB,
//     createWorker,
//     DuckDBAccessMode,
//     getJsDelivrBundles,
//     selectBundle,
//         ConsoleLogger,
//         VoidLogger
// } from "@duckdb/duckdb-wasm";

let db, isTerminated = true, currentCollectionName;
const mutex = new Mutex();
const debouncedTerminate = debounce(async () => {
    if (db) {
        await db.terminate();
        db = null;
        currentCollectionName = null;
        isTerminated = true;
    }
}, 3 * 60 * 1000); // 3 minutes
export default class DuckDBWorkerManager {
    static async getCollectionInstance(collectionName, {persistent = true}) {
        return mutex.runExclusive(async () => {
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
            if (currentCollectionName === collectionName) {
                return db;
            }
            await db.open({
                path: persistent ? `opfs://${collectionName}.db` : `./${collectionName}.db`,
                accessMode: 3, // DuckDBAccessMode.READ_WRITE = 3
            });
            currentCollectionName = collectionName;
            isTerminated = false;
            return db;
        });
    }

    static isTerminated() {
        return isTerminated;
    }

    static scheduleTerminate() {
        debouncedTerminate();
    }

    static async cancelTerminate() {
        debouncedTerminate.cancel();
    }
}
