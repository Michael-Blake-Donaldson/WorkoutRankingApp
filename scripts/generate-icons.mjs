import { mkdir } from "node:fs/promises";
import sharp from "sharp";

// Neutral geometric monogram; replaceable baseline, no chosen product identity.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f5f5f3"/><rect x="112" y="112" width="288" height="288" rx="40" fill="#244c3a"/><path d="M192 176H320V216H236V248H304V288H236V336H192Z" fill="white"/></svg>`;
await mkdir("public/icons", { recursive: true });
for (const [file, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["maskable-512", 512],
  ["apple-touch-icon", 180],
]) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/icons/${file}.png`);
}
