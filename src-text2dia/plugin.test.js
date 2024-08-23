import { Buffer } from 'buffer';

test('Old Encoding and decoding result in same', () => {
    const text = 'Hello World';
    const encoded = window.encodeURIComponent(Buffer.from(text, "utf8").toString('base64'));
    const encoded2 = window.encodeURIComponent(window.btoa(text));
    const decoded = Buffer.from(window.decodeURIComponent(encoded), 'base64').toString('utf8');
    const decoded2 = window.atob(window.decodeURIComponent(encoded));
    expect(encoded).toBe(encoded2);
    expect(decoded).toBe(text);
    expect(decoded2).toBe(text);
});

test('Latin1 Encoding and decoding result in same', () => {
    const text = 'текст';
    const encoded = window.encodeURIComponent(Buffer.from(text, "utf8").toString('base64'));
    const decoded = Buffer.from(window.decodeURIComponent(encoded), 'base64').toString('utf8');
    expect(decoded).toBe(text);
});