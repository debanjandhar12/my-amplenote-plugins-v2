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
  setupFiles: ['<rootDir>/jest.setup.js'],
};
