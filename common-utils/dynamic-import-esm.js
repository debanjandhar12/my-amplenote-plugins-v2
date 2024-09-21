import { memoize } from "lodash-es";
import pkgJSON from "../package.json";

const dynamicImportESM = memoize(async (pkg, pkgVersion = null) => {
    if (process.env.NODE_ENV === 'test') {
        try {
            return require(getBasePackage(pkg));
        } catch (e) {
            console.warn(`Failed to require ${pkg} from local: ${e.message}`);
        }
        try {
            return await import(getBasePackage(pkg));
        } catch (e) {
            console.warn(`Failed to import ${pkg} from local: ${e.message}`);
        }
    }

    const cdnList = ['https://esm.run/', 'https://esm.sh/'];

    for (const cdn of cdnList) {
        try {
            const resolvedVersion = resolvePackageVersion(pkg, pkgVersion);
            const url = buildCDNUrl(cdn, pkg, resolvedVersion);
            const module = await import(url, { assert: { type: "json" } });
            console.log(`Imported ${pkg}@${resolvedVersion} from ${url}`);
            return module;
        } catch (e) {
            console.warn(`Failed to import ${pkg} from ${cdn}: ${e.message}`);
        }
    }

    throw new Error(`Failed to import ${pkg} from all available CDNs`);
});

function getBasePackage(pkg) {
    if (pkg.startsWith('@')) {
        const [scope, name] = pkg.split('/');
        return `${scope}/${name}`;
    }
    return pkg.split('/')[0];
}

function resolvePackageVersion(pkg, pkgVersion) {
    const basePkg = getBasePackage(pkg);
    const version = pkgVersion || pkgJSON.dependencies[basePkg] || pkgJSON.devDependencies[basePkg] || 'latest';
    return version.startsWith('^') || version.startsWith('~') ? version.substring(1) : version;
}

function buildCDNUrl(cdn, pkg, version) {
    let folders = [];
    if(pkg.startsWith('@')) {
        [,, ...folders] = pkg.split('/');
    }
    else {
        [, ...folders] = pkg.split('/');
    }
    const basePkg = getBasePackage(pkg);
    const versionString = version !== 'latest' ? `@${version}` : '';
    const folderString = folders && folders.length > 0 ? `/${folders.join('/')}` : '';
    return `${cdn}${basePkg}${versionString}${folderString}`;
}

export default dynamicImportESM;