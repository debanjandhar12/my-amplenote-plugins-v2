# Amplenote Plugin Dev Environment

This is a custom dev environment for Amplenote plugin. It is meant to host all of my amplenote plugins in a single workspace.

Current plugin list:
- [x] Amplenote Omnivore Plugin

# Building, Testing, and Running
To use, first install the dependencies with `npm install`. Next, specify the target folder in `package.json` to the plugin you want to build, test, or run. For example, in the config below, the target folder is set as `/src-omnivore`.

![image](https://github.com/debanjandhar12/my-amplenote-plugins-v2/assets/49021233/2f123d9b-d195-4dfd-9a00-f62bccf715b5)


## Building
To build the plugin:
```bash
npm build
```

## Testing
To run tests:
```bash
npm test
```

To run tests in watch mode:
```bash
npm run test --watch
```

> If it complains about jsdom being absent, run `npm install -D jest-environment-jsdom` and try again.
