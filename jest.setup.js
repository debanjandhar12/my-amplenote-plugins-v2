const { TextEncoder, TextDecoder } = require('util');
import 'core-js';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

process.env.BUILD_START_TIME = new Date().toISOString();