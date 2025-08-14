const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');
const { join } = require('path');


/**
 * The plugin will import bundles based on dependencies in _myAmplePluginExternal/package.json.
 * This updates the version of dependencies of _myAmplePluginExternal/package.json from main package.json
 * and publishes to npm. Then it updates the my-ample-plugin-external version in main package.json.
 * This above needs to be done whenever bundle changes or package version needs updating.
 * Usage: node ./_myAmplePluginExternal/publish.cjs
 */

function copyDependencies() {
  // Read both package.json files
  const parentPkg = JSON.parse(readFileSync(join(__dirname, '../package.json')));
  const externalPkgPath = join(__dirname, 'package.json');
  const externalPkg = JSON.parse(readFileSync(externalPkgPath));
  
  // Copy dependencies excluding self
  externalPkg.dependencies = Object.fromEntries(
    Object.entries(parentPkg.dependencies)
      .filter(([name]) => name !== 'my-ample-plugin-external')
  );
  
  // Save updated external package.json
  writeFileSync(externalPkgPath, JSON.stringify(externalPkg, null, 2) + '\n');
  console.log('Updated /_myAmplePluginExternal/package.json dependencies based on main package.json');
}

function updateMainPackageDependencyVersion() {
  // Get new version from external package
  const externalVersion = JSON.parse(readFileSync(join(__dirname, 'package.json'))).version;
  
  // Update main package.json by text replacement
  const mainPkgPath = join(__dirname, '../package.json');
  let mainPkgContent = readFileSync(mainPkgPath, 'utf8');
  mainPkgContent = mainPkgContent.replace(
    /"my-ample-plugin-external"\s*:\s*"[^"]+"/,
    `"my-ample-plugin-external": "${externalVersion}"`
  );
  writeFileSync(mainPkgPath, mainPkgContent);
  console.log('Updated main package.json version for my-ample-plugin-external dependency to: ', externalVersion);
}

function publish() {
  try {
    copyDependencies();
    execSync('npm version patch', { cwd: __dirname, stdio: 'inherit' });
    execSync('npm publish', { cwd: __dirname, stdio: 'inherit' });
    updateMainPackageDependencyVersion();
  } catch (error) {
    console.error('Publishing failed:', error.message);
    process.exit(1);
  }
}

publish();
