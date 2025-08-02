import pkgJSON from "../package.json" with { type: "json" };
import path from "path";



/**
 * Import js packages from dist/ folder in GitHub repo with multi-CDN fallback.
 * This is a workaround for dynamicImportMultipleESM which helped avoid multiple
 * copies of the same package in the bundle.
 * Note: When adding new packages, make sure to update the commit hash.
 */
export const dynamicImportExternalPluginBundle = async (fileName) => {
    if (process.env.NODE_ENV === 'test') {
        try {
            return (require(path.resolve(__dirname, '../_myAmplePluginExternal/dist', fileName))).default;
        } catch (e) {
            console.warn(`Failed to require github bundle from local: ${e.message}`);
        }
        try {
            return (await import(path.resolve(__dirname, '../_myAmplePluginExternal/dist', fileName))).default;
        } catch (e) {
            console.warn(`Failed to import github bundle from local: ${e.message}`);
        }
    }

    const packageVersion = pkgJSON.dependencies['my-ample-plugin-external'];
    const cdnList = ['https://esm.sh/', 'https://esm.run/'];
    let importCompleted = false;
    
    const importPromises = cdnList.map(async (cdn, index) => {
        const url = buildCDNUrl(cdn, `my-ample-plugin-external/dist/${fileName}`, packageVersion);
        if (index > 0) {
            // wait 0.6 sec as we want the first CDN to be preferred
            await new Promise(resolve => setTimeout(resolve, 600));
        }
        if (importCompleted) {
            throw new Error(`Terminating as ${fileName} has already been imported`);
        }
        return import(url, { assert: { type: "json" } })
            .then(module => ({ module, url }))
            .catch(e => {
                console.warn(`Failed to import ${fileName} from ${cdn}: ${e.message}`);
                throw e;
            });
    });

    try {
        const result = await Promise.any(importPromises);
        importCompleted = true;

        // Validate version compatibility
        const module = result.module;
        if (!module.versions)
            throw new Error(`Failed to import module: ${fileName}. Returned bundle does not have version property.`);
        for (const [key, value] of Object.entries(module.versions)) {
            if (value !== pkgJSON.dependencies[key]) {
                throw new Error(`Failed to import module: ${fileName}. Version mismatch for ${key} (expected: ${pkgJSON.dependencies[key]}, actual: ${value})`);
            }
        }
        console.log(`Imported ${fileName}@${packageVersion} from ${result.url}`);
        return module.default;
    } catch {
        throw new Error(`Failed to import ${fileName} from all available CDNs`);
    }
}

export const getJSDeliverBundleUrl = (fileName) => {
    const packageVersion = pkgJSON.dependencies['my-ample-plugin-external'];
    return `https://cdn.jsdelivr.net/npm/my-ample-plugin-external@${packageVersion}/dist/${fileName}`;
};

/***
 * @deprecated - Esm.sh marked this api as deprecated. Since then, its working but unstable.
 * Dynamically imports multiple ESM modules from a CDN.
 * @template T
 * @param {string[]} pkgs - The package names to import.
 * @returns {Promise<T>} - A Promise that resolves to array of imported module.
 */
export const dynamicImportMultipleESM = async (pkgs) => {
    if (process.env.NODE_ENV === 'test') {
        try {
            return pkgs.map(pkg => require(pkg));
        } catch (e) {
            console.warn(`Failed to require one or more packages from local: ${e.message}`);
        }
        try {
            return await Promise.all(pkgs.map(pkg => import(pkg)));
        } catch (e) {
            console.warn(`Failed to import one or more packages from local: ${e.message}`);
        }
    }

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
    const { build } = await dynamicImportESM("build");
    const buildObj = {dependencies, source: buildStr};
    const buildResObj = await build(buildObj);
    const bundleUrl = new URL(buildResObj.bundleUrl.replace('https://legacy.esm.sh/', 'https://legacy.esm.sh/v135/').replace('https://esm.sh/', 'https://legacy.esm.sh/v135/'));
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

    const cdnList = ['https://esm.sh/', 'https://legacy.esm.sh/', 'https://esm.run/'];
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
        || basePkg.includes('radix'))) {
        throw new Error(`React based packages is not supported in ${cdn}`);
    }
    if (cdn !== 'https://legacy.esm.sh/' && basePkg.includes('build')) {
        throw new Error(`Build API package is not supported in ${cdn}`);
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