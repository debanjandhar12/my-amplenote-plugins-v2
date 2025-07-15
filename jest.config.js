import dotenv from "dotenv"
import {esbuildOptions} from "./build/esbuild-options.js";
dotenv.config();

export default {
  "moduleNameMapper": {
    "^inline:(.*)$": '$1' // required to map inline:./embed/index.html to ./embed/index.html
  },
  "transform": {
    "^.+\\.(jsx?|tsx?)$": [
      "esbuild-jest2",
      esbuildOptions // Esbuild Plugins does not work currently cuz Jest doesn't support async transformers
    ],
    "^.+\\.html$": "./build/jest-transformers/htmlTransformer.js"
  },
  "transformIgnorePatterns": [
     "node_modules/@omnivore-app/api"
  ],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      url: 'https://plugins.amplenote.com/'
  },
  reporters: [
    "default",
    ["jest-html-reporter", {
      "outputPath": "./dist/test-report.html",
      sort: 'status:failed,pending,passed',
      "includeFailureMsg": true,
      "includeConsoleLog": true
    }]
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ["./common-utils/playwright-helpers.ts", "./common-utils/jest.extend.js"]
};
