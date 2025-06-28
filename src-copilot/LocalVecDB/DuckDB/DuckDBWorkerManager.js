import dynamicImportESM from "../../../common-utils/dynamic-import-esm.js";

const instanceMap = new Map();
export default class DuckDBWorkerManager {
    static async getCollectionInstance(collectionName) {
        if (instanceMap.has(collectionName)) {
            return instanceMap.get(collectionName);
        }

        const duckdb = await dynamicImportESM("@duckdb/duckdb-wasm");
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        const worker_url = bundle.mainWorker;

        if (!worker_url) {
            throw new Error("Could not determine main duckdb worker URL from bundle.");
        }

        const worker = await duckdb.createWorker(bundle.mainWorker);
        const logger = new duckdb.ConsoleLogger();
        let db = new duckdb.AsyncDuckDB(logger, worker, {
            location: `./${collectionName}.duckdb`,
            readOnly: false
        });
        instanceMap.set(collectionName, db);

        return db;
    }
}