/***
 * This file setups a global sandbox for jest environment.
 */

const sinon = require("sinon");

beforeEach(() => {
    global.sinonSandbox = sinon.createSandbox();
});

afterEach(() => {
    if (global.sinonSandbox) {
        global.sinonSandbox.restore();
        global.sinonSandbox = null;
    }
    delete global.sinonSandbox;
});

global.sinon = sinon;