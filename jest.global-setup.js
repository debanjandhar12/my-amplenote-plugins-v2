import * as fs from "node:fs";
import path from "node:path";

export default async function globalSetup() {
    // -- Clear allure folder --
    const dir = path.resolve("./allure");
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}