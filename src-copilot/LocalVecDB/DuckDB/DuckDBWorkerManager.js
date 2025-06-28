import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";
// import {
//     AsyncDuckDB,
//     createWorker,
//     DuckDBAccessMode,
//     getJsDelivrBundles,
//     selectBundle,
//         ConsoleLogger,
//         VoidLogger
// } from "@duckdb/duckdb-wasm";

const instanceMap = new Map();
export default class DuckDBWorkerManager {
    static async getCollectionInstance(collectionName) {
        if (instanceMap.has(collectionName)) {
            return instanceMap.get(collectionName);
        }

        const {
            AsyncDuckDB,
            createWorker,
            DuckDBAccessMode,
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
        const logger = process.env.NODE_ENV === 'development' ? new ConsoleLogger() : new VoidLogger();
        let db = new AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        const root = await navigator.storage.getDirectory();
        console.log("opfs root", root, await Array.fromAsync(root.entries()))
        await db.open({
            path: `opfs://${collectionName}.db`,
            accessMode: DuckDBAccessMode.READ_WRITE,
        });
        instanceMap.set(collectionName, db);
        return db;
    }
}