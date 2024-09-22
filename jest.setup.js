const { TextEncoder, TextDecoder } = require('util');
import 'core-js';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;