/* Sanity-check captured screenshots: size + mean luminance + stddev. */
import sharp from "sharp";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "shots");
for (const app of ["prod", "proto"]) {
  const dir = join(root, app);
  const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  console.log(`\n== ${app} (${files.length}) ==`);
  for (const f of files) {
    const buf = readFileSync(join(dir, f));
    const { data, info } = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const px = data;
    let sum = 0, sumSq = 0, n = info.width * info.height;
    for (let i = 0; i < px.length; i += 4) {
      const l = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      sum += l; sumSq += l * l;
    }
    const mean = sum / n;
    const std = Math.sqrt(sumSq / n - mean * mean);
    console.log(`${f.padEnd(28)} ${info.width}x${info.height}  mean=${mean.toFixed(1)} std=${std.toFixed(1)}`);
  }
}