import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputDirectory = resolve(scriptDirectory, "../public/icons");

const colors = {
  blueTop: [71, 118, 230, 255],
  blueBottom: [23, 59, 120, 255],
  halo: [127, 215, 232, 50],
  pageLeft: [255, 255, 255, 255],
  pageRight: [243, 247, 255, 255],
  pageLine: [183, 200, 234, 255],
  primary: [54, 95, 199, 255],
  path: [243, 179, 76, 255],
};

function createPixels(size) {
  return new Uint8Array(size * size * 4);
}

function blendPixel(pixels, size, x, y, color) {
  if (x < 0 || y < 0 || x >= size || y >= size) {
    return;
  }

  const index = (Math.floor(y) * size + Math.floor(x)) * 4;
  const alpha = color[3] / 255;
  const inverse = 1 - alpha;
  pixels[index] = Math.round(color[0] * alpha + pixels[index] * inverse);
  pixels[index + 1] = Math.round(color[1] * alpha + pixels[index + 1] * inverse);
  pixels[index + 2] = Math.round(color[2] * alpha + pixels[index + 2] * inverse);
  pixels[index + 3] = 255;
}

function fillBackground(pixels, size) {
  for (let y = 0; y < size; y += 1) {
    const progress = y / Math.max(1, size - 1);
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[index + channel] = Math.round(
          colors.blueTop[channel] * (1 - progress) +
            colors.blueBottom[channel] * progress,
        );
      }
      pixels[index + 3] = 255;
    }
  }
}

function fillCircle(pixels, size, centerX, centerY, radius, color) {
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(size - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(size - 1, Math.ceil(centerY + radius));
  const radiusSquared = radius * radius;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const deltaX = x + 0.5 - centerX;
      const deltaY = y + 0.5 - centerY;
      if (deltaX * deltaX + deltaY * deltaY <= radiusSquared) {
        blendPixel(pixels, size, x, y, color);
      }
    }
  }
}

function pointInPolygon(x, y, points) {
  let inside = false;
  for (
    let current = 0, previous = points.length - 1;
    current < points.length;
    previous = current, current += 1
  ) {
    const currentPoint = points[current];
    const previousPoint = points[previous];
    const intersects =
      currentPoint[1] > y !== previousPoint[1] > y &&
      x <
        ((previousPoint[0] - currentPoint[0]) * (y - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function fillPolygon(pixels, size, points, color) {
  const xValues = points.map(([x]) => x);
  const yValues = points.map(([, y]) => y);
  const minX = Math.max(0, Math.floor(Math.min(...xValues)));
  const maxX = Math.min(size - 1, Math.ceil(Math.max(...xValues)));
  const minY = Math.max(0, Math.floor(Math.min(...yValues)));
  const maxY = Math.min(size - 1, Math.ceil(Math.max(...yValues)));

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        blendPixel(pixels, size, x, y, color);
      }
    }
  }
}

function drawThickLine(pixels, size, points, width, color) {
  const radius = width / 2;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
    const steps = Math.max(1, Math.ceil(distance * 1.5));
    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      fillCircle(
        pixels,
        size,
        start[0] + (end[0] - start[0]) * progress,
        start[1] + (end[1] - start[1]) * progress,
        radius,
        color,
      );
    }
  }
}

function renderIcon(size, maskable) {
  const pixels = createPixels(size);
  fillBackground(pixels, size);

  const scale = size / 512;
  const motifScale = maskable ? 0.78 : 1;
  const transform = ([x, y]) => [
    size / 2 + (x - 256) * scale * motifScale,
    size / 2 + (y - 256) * scale * motifScale,
  ];
  const scaledWidth = (width) => width * scale * motifScale;

  fillCircle(
    pixels,
    size,
    size / 2,
    size / 2 - scaledWidth(6),
    scaledWidth(172),
    colors.halo,
  );

  fillPolygon(
    pixels,
    size,
    [
      transform([104, 196]),
      transform([178, 178]),
      transform([256, 226]),
      transform([256, 402]),
      transform([176, 361]),
      transform([104, 373]),
    ],
    colors.pageLeft,
  );
  fillPolygon(
    pixels,
    size,
    [
      transform([408, 196]),
      transform([334, 178]),
      transform([256, 226]),
      transform([256, 402]),
      transform([336, 361]),
      transform([408, 373]),
    ],
    colors.pageRight,
  );

  drawThickLine(
    pixels,
    size,
    [transform([256, 226]), transform([256, 402])],
    scaledWidth(12),
    colors.pageLine,
  );
  drawThickLine(
    pixels,
    size,
    [transform([155, 323]), transform([194, 319]), transform([233, 340])],
    scaledWidth(15),
    colors.primary,
  );

  const pathPoints = [
    transform([306, 334]),
    transform([345, 287]),
    transform([387, 235]),
  ];
  drawThickLine(pixels, size, pathPoints, scaledWidth(18), colors.path);
  for (const [x, y] of pathPoints) {
    fillCircle(pixels, size, x, y, scaledWidth(13), colors.path);
  }

  return pixels;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuffer, data]);
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(body), 8 + data.length);
  return chunk;
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  const rowLength = size * 4 + 1;
  const scanlines = Buffer.alloc(rowLength * size);
  for (let y = 0; y < size; y += 1) {
    const rowOffset = y * rowLength;
    scanlines[rowOffset] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * size * 4, size * 4).copy(
      scanlines,
      rowOffset + 1,
    );
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function writeIcon(filename, size, maskable = false) {
  const pixels = renderIcon(size, maskable);
  writeFileSync(resolve(outputDirectory, filename), encodePng(size, pixels));
}

mkdirSync(outputDirectory, { recursive: true });
writeIcon("icon-192.png", 192);
writeIcon("icon-512.png", 512);
writeIcon("icon-maskable-512.png", 512, true);

console.log("PWAアイコンを3件生成しました。");
