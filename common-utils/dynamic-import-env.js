import dynamicImportESM from "./dynamic-import-esm.js";

export const dynamicImportEnv = async () => {
    if (process.env.NODE_ENV === 'production') {
        return;
    }
    const dotenv = await dynamicImportESM("dotenv");
    try {
        dotenv.config();
    } catch {}
    try {
        const envMap = dotenv.parse(await fetch('/.env').then(res => res.text()));
        process.env = {...process.env, ...envMap};
    } catch {}
};