import dotenv from "dotenv"
import {esbuildOptions} from "./esbuild.js";

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
    "^.+\\.html$": "jest-transform-stub"
  },
  "transformIgnorePatterns": [
  ],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      url: 'https://plugins.amplenote.com/'
  }
};
