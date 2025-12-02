import '@testing-library/jest-dom';

import '@testing-library/jest-dom';

import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
jest.spyOn(console, "error").mockImplementation(() => { });