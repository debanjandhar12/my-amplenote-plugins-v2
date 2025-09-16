/***
 * This file setups utilities methods and variables for jest env.
 */

const { TextEncoder, TextDecoder} = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

test.skipIf = (condition, description, testFunction) => {
    if (condition) {
        test.skip(description, testFunction);
    } else {
        test(description, testFunction);
    }
};
