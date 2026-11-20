#!/usr/bin/env node
// Minimal PNG generator using built-in zlib
// Creates a simple solid-color PNG with the brand colors

import { createWriteStream } from 'fs';
import { deflateSync } from 'zlib';

function writePNG(filename, width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: truecolor (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
  const ihdrChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 13]), // length
    Buffer.from('IHDR'),
    ihdrData,
    Buffer.from(ihdrCrc.toString(16).padStart(8, '0'), 'hex')
  ]);
  
  // IDAT chunk - simple scanlines with filter type 0 (none)
  const scanlineSize = 1 + width * 3; // 1 byte filter + RGB per pixel
  const imageData = Buffer.alloc(scanlineSize * height);
  
  for (let y = 0; y < height; y++) {
    imageData[y * scanlineSize] = 0; // filter type 0 (none)
    for (let x = 0; x < width; x++) {
      const offset = y * scanlineSize + 1 + x * 3;
      imageData[offset] = r;
      imageData[offset + 1] = g;
      imageData[offset + 2] = b;
    }
  }
  
  const compressed = deflateSync(imageData);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  const idatChunk = Buffer.concat([
    Buffer.from(compressed.length.toString(16).padStart(8, '0'), 'hex'),
    Buffer.from('IDAT'),
    compressed,
    Buffer.from(idatCrc.toString(16).padStart(8, '0'), 'hex')
  ]);
  
  // IEND chunk
  const iendCrc = crc32(Buffer.from('IEND'));
  const iendChunk = Buffer.concat([
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('IEND'),
    Buffer.from(iendCrc.toString(16).padStart(8, '0'), 'hex')
  ]);
  
  const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  createWriteStream(filename).write(png);
  console.log(`Generated ${filename} (${width}x${height})`);
}

function crc32(buf) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Brand colors: teal/emerald gradient background
// We'll use the primary brand color #0D9488 (teal-600)
writePNG('public/icon-192.png', 192, 192, 0x0D, 0x94, 0x88);
writePNG('public/icon-512.png', 512, 512, 0x0D, 0x94, 0x88);
writePNG('public/apple-touch-icon.png', 180, 180, 0x0D, 0x94, 0x88);
writePNG('public/icon-192-maskable.png', 192, 192, 0x0D, 0x94, 0x88);
writePNG('public/icon-512-maskable.png', 512, 512, 0x0D, 0x94, 0x88);

// Also create a simple 32x32 and 16x16 for favicon fallback
writePNG('public/favicon-32.png', 32, 32, 0x0D, 0x94, 0x88);
writePNG('public/favicon-16.png', 16, 16, 0x0D, 0x94, 0x88);

console.log('All PNG icons generated!');