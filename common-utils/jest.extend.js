/***
 * This file setups utilities methods and variables for jest env.
 */
test.skipIf = (condition, description, testFunction) => {
    if (condition) {
        test.skip(description, testFunction);
    } else {
        test(description, testFunction);
    }
};