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

let db, isTerminated = true, currentCollectionName, lock_count = 0;
const mutex = new Mutex();
export default class DuckDBConnectionController {
    static async getCollectionInstance(collectionName, opts = {persistent: true}) {
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
            try {
                await db.flushFiles();
                await db.dropFiles();
                await db.reset();
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (e) {console.log(e);}
            await db.open({
                path: opts.persistent ? `opfs://${collectionName}.db` : `./${collectionName}.db`,
                accessMode: 3, // DuckDBAccessMode.READ_WRITE = 3
            });
            const conn = await db.connect();
            // await conn.query("INSTALL fts");
            // await conn.query("LOAD fts");
            await conn.query("SET temp_directory='tmp'"); // does not work atm even with registerOPFSFilename
            await conn.close();
            currentCollectionName = collectionName;
            isTerminated = false;
            return db;
        });
    }

    static isTerminated() {
        return isTerminated;
    }

    static async forceTerminate() {
        if (db) {
            lock_count = 0;
            try {
                await db.flushFiles();
                await db.dropFiles();
                await db.reset();
            } catch (e) {console.log(e);}
            await db.terminate();
            db = null;
            currentCollectionName = null;
            isTerminated = true;
        }
    }

    static async lockAutoTerminate() {
        if (db) {
            lock_count++;
            debouncedTerminate.cancel();
        }
    }

    static async unlockAutoTerminate() {
        if (db) {
            lock_count = Math.max(0, lock_count - 1);
            if (lock_count === 0) {
                debouncedTerminate();
            }
        }
    }
}

const debouncedTerminate = debounce(() => {
    if (lock_count === 0) {
        DuckDBConnectionController.forceTerminate();
    }
},40 * 1000); // 40 sec
