import dotenv from "dotenv"

dotenv.config();

export default {
  "transform": {
    "^.+\\.(jsx?|tsx?)$": [
      "esbuild-jest",
      {
        sourcemap: true,
        platform: 'browser',
        bundle: true,
      }
    ]
  },
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
      url: 'https://localhost:3000/'
  }
};
