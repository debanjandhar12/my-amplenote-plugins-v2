import pkgJSON from "../package.json";

/***
 * Dynamically imports multiple ESM modules from a CDN.
 * THis WORKS ONLY ON EMBED (i.e. browser). Useful for loading all react stuff in one go and
 * avoiding multiple react issues.
 * @template T
 * @param {string[]} pkgs - The package names to import.
 * @returns {Promise<T>} - A Promise that resolves to array of imported module.
 */
export const dynamicImportMultipleESM = async (pkgs) => {
    const { build } = await dynamicImportESM("build");
    const pkgsDetailsMap = new Map(pkgs.map(pkg => [pkg, {
        version: resolvePackageVersion(pkg),
        folder: getPackageFolderString(pkg),
    }]));
    const pkgFakeNames = pkgs.map((_, index) => `pkgFakeName_${index}`);
    const dependencies = {};
    pkgsDetailsMap.forEach((value, key) => {
        dependencies[getBasePackage(key)] = value.version;
    });
    const buildStr = `
    ${
        pkgs.map((pkg, index) => `import * as ${pkgFakeNames[index]} from "${getBasePackage(pkg)}${pkgsDetailsMap.get(pkg).folder}";`).join('\n')
    }
    export default [
        ${
        pkgFakeNames.join(', ')
        }
    ]
    `.trim();
    console.log('Loading bundle from:\n', dependencies, buildStr);
    const buildObj = {dependencies, source: buildStr};
    const buildResObj = await build(buildObj);
    const bundleUrl = new URL(buildResObj.bundleUrl);
    if (process.env.NODE_ENV === 'development') {
        bundleUrl.searchParams.set('dev', true);
    }
    return (await import(bundleUrl)).default;
}

/**
 * Dynamically imports an ESM module from a CDN or local environment.
 * @template T
 * @param {string} pkg - The package name to import.
 * @param {string|null} [pkgVersion=null] - The version of the package to import.
 * @returns {Promise<T>} - A Promise that resolves to the imported module.
 */
const dynamicImportESM = async (pkg, pkgVersion = null) => {
    if (process.env.NODE_ENV === 'test') {
        try {
            return require(pkg);
        } catch (e) {
            console.warn(`Failed to require ${pkg} from local: ${e.message}`);
        }
        try {
            return await import(pkg);
        } catch (e) {
            console.warn(`Failed to import ${pkg} from local: ${e.message}`);
        }
    }

    const cdnList = ['https://esm.sh/', 'https://esm.run/'];
    const resolvedVersion = resolvePackageVersion(pkg, pkgVersion);
    let importCompleted = false;
    const importPromises = cdnList.map(async cdn => {
        const url = buildCDNUrl(cdn, pkg, resolvedVersion);
        if(cdn !== 'https://esm.sh/') {
            // wait 0.6 sec as we want esm.sh to be the first to resolve preferably
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        if (importCompleted)
            throw new Error(`Terminating as ${pkg} has already been imported`);
        return import(url, { assert: { type: "json" } })
            .then(module => ({ module, url }))
            .catch(e => {
                console.warn(`Failed to import ${pkg} from ${cdn}: ${e.message}`);
                throw e;
            });
    });

    try {
        const result = await Promise.any(importPromises);
        importCompleted = true;
        console.log(`Imported ${pkg}@${resolvedVersion} from ${result.url}`);
        return result.module;
    } catch {
        throw new Error(`Failed to import ${pkg} from all available CDNs`);
    }

    throw new Error(`Failed to import ${pkg} from all available CDNs`);
};

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

function getPackageFolderString(pkg) {
    let folders = [];
    if(pkg.startsWith('@')) {
        [,, ...folders] = pkg.split('/');
    }
    else {
        [, ...folders] = pkg.split('/');
    }
    return folders && folders.length > 0 ? `/${folders.join('/')}` : '';
}

function buildCDNUrl(cdn, pkg, version) {
    const basePkg = getBasePackage(pkg);
    const versionString = version !== 'latest' ? `@${version}` : '';
    const folderString = getPackageFolderString(pkg);
    const url = new URL(`${cdn}${basePkg}${versionString}${folderString}`);
    if (cdn !== 'https://esm.sh/' && (basePkg.includes('react')
        || basePkg.includes('radix') || basePkg.includes('build'))) {
        throw new Error(`React based packages is not supported in ${cdn}`);
    }
    if (cdn === 'https://esm.sh/') {
        if (process.env.NODE_ENV === 'development') {
            url.searchParams.set('dev', true);
        }
        if (basePkg !== 'react-dom' && basePkg !== 'react') {
            url.searchParams.set('bundle-deps', false);
        }
        if (!pkg.endsWith('.css') && pkg !== 'build')
            url.searchParams.set('deps', `react@${pkgJSON.dependencies.react},react-dom@${pkgJSON.dependencies['react-dom']}`);
    }
    return url.toString();
}

/***
 * Dynamically imports css files from ESM bundles.
 * @returns {Promise<void>} - A Promise that resolves when the css file is loaded.
 * @param pkg
 * @param pkgVersion
 */
export const dynamicImportCSS = async (pkg, pkgVersion = null) => {
    const resolvedVersion = resolvePackageVersion(pkg, pkgVersion);
    const url = buildCDNUrl('https://esm.sh/', pkg, resolvedVersion);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
    return new Promise(resolve => link.onload = resolve);
}

export default dynamicImportESM;