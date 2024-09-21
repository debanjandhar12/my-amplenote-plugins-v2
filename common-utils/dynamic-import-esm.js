import {memoize} from "lodash-es";
import pkgJSON from "../package.json";

const dynamicImportESM = memoize(async (pkg, pkgVersion = null) => {
    if (process.env.NODE_ENV === 'test') {
        try {
            const module = require(pkg);
            return module;
        }
        catch (e) {
            console.warn(`Failed to require ${pkg} from local: ${e.message}`);
        }
    }

    const cdnList = ['https://esm.run/', 'https://esm.sh/'];

    for (const cdn of cdnList) {
        try {
            pkgVersion = pkgVersion || pkgJSON.dependencies[pkg] || pkgJSON.devDependencies[pkg] || 'latest';
            pkgVersion = pkgVersion.startsWith('^') || pkgVersion.startsWith('~')  ? pkgVersion.substring(1) : pkgVersion;
            const url = `${cdn}${pkg}${pkgVersion !== 'latest' ? `@${pkgVersion}` : ''}`;
            const module = await import(url, { assert: { type: "json" } });
            console.log(`Imported ${pkg}@${pkgVersion} from ${url}`);
            return module;
        } catch (e) {
            console.warn(`Failed to import ${pkg} from ${cdn}: ${e.message}`);
        }
    }

    throw new Error(`Failed to import ${pkg} from all available CDNs`);
});

export default dynamicImportESM;