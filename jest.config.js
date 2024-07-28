import dotenv from "dotenv"
import {esbuildOptions} from "./esbuild.js";

dotenv.config();

export default {
  "transform": {
    "^.+\\.(jsx?|tsx?)$": [
      "esbuild-jest",
      esbuildOptions
    ]
  },
  "transformIgnorePatterns": [
  ],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      url: 'https://plugins.amplenote.com/'
  }
};
