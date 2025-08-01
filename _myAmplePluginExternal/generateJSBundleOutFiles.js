import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * This script builds JavaScript bundle files from the src/ directory to dist/ directory.
 * It processes all .js files in src/ and creates optimized ESM bundles.
 * 
 * Usage:
 * npx jest --runTestsByPath ./_myAmplePluginExternal/generateJSBundleOutFiles.js --passWithNoTests --testMatch "**" --testEnvironment=node
 * 
 * The script will:
 * 1. Discover all .js files in src/ directory
 * 2. Build each file using esbuild with ESM format
 * 3. Validate the built files contain proper exports
 * 4. Output results to dist/ directory
 */

// Jest provides __dirname automatically

// Configuration
const CONFIG = {
  SRC_DIR: path.join(__dirname, 'src'),
  DIST_DIR: path.join(__dirname, 'dist')
};

/**
 * Discovers and validates all JavaScript source files in the src directory
 * @returns {Promise<string[]>} Array of bundle file names
 */
async function validateSourceFiles() {
  console.log('🔍 Discovering and validating source files...');

  try {
    // Check if src directory exists
    await fs.access(CONFIG.SRC_DIR);

    // Read all files in src directory
    const files = await fs.readdir(CONFIG.SRC_DIR);

    // Filter for JavaScript files
    const jsFiles = files.filter(file => file.endsWith('.js'));

    if (jsFiles.length === 0) {
      throw new Error(`No JavaScript files found in ${CONFIG.SRC_DIR}`);
    }

    // Validate each file exists and is readable
    for (const fileName of jsFiles) {
      const sourcePath = path.join(CONFIG.SRC_DIR, fileName);
      try {
        const stats = await fs.stat(sourcePath);
        if (!stats.isFile()) {
          throw new Error(`${fileName} is not a file`);
        }
        console.log(`✅ Found: ${fileName}`);
      } catch (error) {
        throw new Error(`❌ Cannot access source file: ${fileName} - ${error.message}`);
      }
    }

    console.log(`✅ All ${jsFiles.length} source files validated`);
    return jsFiles;
  } catch (error) {
    throw new Error(`Source validation failed: ${error.message}`);
  }
}

/**
 * Ensures the dist directory exists
 * @returns {Promise<void>}
 */
async function ensureDistDirectory() {
  try {
    await fs.mkdir(CONFIG.DIST_DIR, { recursive: true });
    console.log('📁 Dist directory ready');
  } catch (error) {
    throw new Error(`Failed to create dist directory: ${error.message}`);
  }
}

/**
 * Builds a single bundle file using esbuild
 * @param {string} bundleName - Name of the bundle file
 * @returns {Promise<void>}
 */
async function buildBundle(bundleName) {
  const sourcePath = path.join(CONFIG.SRC_DIR, bundleName);
  const outputPath = path.join(CONFIG.DIST_DIR, bundleName);

  console.log(`🔨 Building ${bundleName}...`);

  try {
    const result = await esbuild.build({
      entryPoints: [sourcePath],
      bundle: true,
      format: 'esm',
      target: 'es2018',
      platform: 'browser',
      outfile: outputPath,
      sourcemap: 'linked',
      minify: true,
      treeShaking: true,
      external: [], // Bundle all dependencies
      write: true,
      legalComments: 'none'
    });

    // Check for any warnings or errors
    if (result.warnings.length > 0) {
      console.warn(`⚠️  Warnings for ${bundleName}:`, result.warnings);
    }

    console.log(`✅ Built: ${bundleName}`);
    return result;
  } catch (error) {
    throw new Error(`Failed to build ${bundleName}: ${error.message}`);
  }
}

/**
 * Validates that the built file is properly formatted
 * @param {string} bundleName - Name of the bundle file
 * @returns {Promise<void>}
 */
async function validateBuiltFile(bundleName) {
  const outputPath = path.join(CONFIG.DIST_DIR, bundleName);

  try {
    const content = await fs.readFile(outputPath, 'utf8');

    // Basic validation checks
    if (content.length === 0) {
      throw new Error(`Built file ${bundleName} is empty`);
    }

    // Check for ESM exports
    if (!content.includes('export')) {
      throw new Error(`Built file ${bundleName} does not contain exports`);
    }

    // Check for versions export (required by the bundle format)
    if (!content.includes('versions')) {
      throw new Error(`Built file ${bundleName} does not contain versions export`);
    }

    // Check for default export
    if (!content.includes('export default') && !content.includes('export{') && !content.includes('export {')) {
      throw new Error(`Built file ${bundleName} does not contain default export`);
    }

    console.log(`✅ Validated: ${bundleName} (${Math.round(content.length / 1024)}KB)`);
  } catch (error) {
    throw new Error(`Validation failed for ${bundleName}: ${error.message}`);
  }
}

/**
 * Main build function
 * @returns {Promise<void>}
 */
async function buildJSBundles() {
  console.log('🚀 Starting JS bundle build process...');
  console.log(`📂 Source directory: ${CONFIG.SRC_DIR}`);
  console.log(`📂 Output directory: ${CONFIG.DIST_DIR}`);

  try {
    // Step 1: Discover and validate source files
    const bundleFiles = await validateSourceFiles();

    // Step 2: Ensure dist directory exists
    await ensureDistDirectory();

    // Step 3: Build each bundle
    const buildResults = [];
    for (const bundleName of bundleFiles) {
      const result = await buildBundle(bundleName);
      buildResults.push({ bundleName, result });
    }

    // Step 4: Validate built files
    for (const bundleName of bundleFiles) {
      await validateBuiltFile(bundleName);
    }

    console.log('🎉 Build completed successfully!');
    console.log(`📦 Built ${bundleFiles.length} bundles:`);
    bundleFiles.forEach(name => {
      console.log(`   - ${name}`);
    });

    return buildResults;
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    throw error;
  }
}

/**
 * Jest test wrapper for building JS bundles
 */
test('Generate JS Bundle Out Files', async () => {
  await buildJSBundles();
  console.log('Done! JS bundles have been built successfully.');
}, 300000); // 5 minute timeout

export { buildJSBundles, validateSourceFiles, validateBuiltFile };