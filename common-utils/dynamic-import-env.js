import dotenv from "dotenv";

export const dynamicImportEnv = async () => {
    try {
        dotenv.config();
    } catch {}
    try {
        const envMap = dotenv.parse(await fetch('/.env').then(res => res.text()));
        process.env = {...process.env, ...envMap};
    } catch {}
};