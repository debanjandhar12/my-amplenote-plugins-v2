# Amplenote Plugin Dev Environment

This is a custom dev environment for Amplenote plugin. It is meant to host all of my amplenote plugins in a single workspace.

Current plugin list:
- [x] Amplenote Omnivore Plugin

# Building, Testing, and Running
To use, first install the dependencies with `npm install`. Next, change the project folder in `package.json` to the plugin you want to build, test, or run.

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
