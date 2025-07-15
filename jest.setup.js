const { TextEncoder, TextDecoder } = require('util');
import 'core-js';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
global.TransformStream = require("stream/web").TransformStream;
global.fetch = require("node-fetch").default;

process.env.BUILD_START_TIME = new Date().toISOString();

