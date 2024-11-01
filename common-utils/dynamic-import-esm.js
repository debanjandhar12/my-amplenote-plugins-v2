import pkgJSON from "../package.json";

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
    const url = `${cdn}${basePkg}${versionString}${folderString}`;
    if (cdn !== 'https://esm.sh/' && basePkg.includes('react')) {
        throw new Error(`React based packages is not supported in ${cdn}`);
    }
    if (cdn === 'https://esm.sh/') {
        if (process.env.NODE_ENV === 'development') {
            return url + (basePkg.includes('react') ? `?dev&deps=react@${pkgJSON.dependencies.react},react-dom@${pkgJSON.dependencies['react-dom']}` : '?dev&bundle-deps');
        }
        if (!basePkg.includes('react')) {
            return url + '?bundle-deps';
        } else {
            return url + `?deps=react@${pkgJSON.dependencies.react},react-dom@${pkgJSON.dependencies['react-dom']}`;
        }
    }
    return url;
}

export default dynamicImportESM;