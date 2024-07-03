# Amplenote Plugin Work ENV

This is a custom dev environment for Amplenote plugin. This is meant to host multiple plugins.

# Building, Testing, and Running
To use, first install the dependencies with `npm install`. Next, change the project folder in `package.json` to the plugin you want to build, test, or run.

## Building
```bash
npm build
```

## Testing

Run `` to run the tests.

If it complains about jsdom being absent, run `npm install -D jest-environment-jsdom` and try again.

```bash
npm test
```

```bash
npm run test --watch
```