/**
 * Generate PWA icons for Golf Data Viz.
 * Run: npx tsx scripts/generate-icons.ts
 *
 * Generates:
 *   public/icons/icon-192.png   (192x192)
 *   public/icons/icon-512.png   (512x512, maskable-safe)
 *   public/icons/apple-touch-icon.png (180x180)
 */

import sharp from "sharp";
import { mkdirSync } from "fs";
import { join } from "path";

const OUT_DIR = join(process.cwd(), "public/icons");
mkdirSync(OUT_DIR, { recursive: true });

const BG_COLOR = "#0f3d22";
const TEXT_COLOR = "#fefcf3";

async function generateIcon(size: number, filename: string) {
  // For maskable icons, content must fit within the inner 80% circle.
  // Keep text well within safe area.
  const fontSize = Math.round(size * 0.28);
  const borderRadius = Math.round(size * 0.18);

  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${borderRadius}" ry="${borderRadius}" fill="${BG_COLOR}"/>
      <text
        x="50%" y="54%"
        text-anchor="middle"
        dominant-baseline="middle"
        font-family="system-ui, -apple-system, sans-serif"
        font-weight="700"
        font-size="${fontSize}"
        fill="${TEXT_COLOR}"
        letter-spacing="2"
      >GDV</text>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png().toFile(join(OUT_DIR, filename));
  console.log(`  ✓ ${filename} (${size}x${size})`);
}

async function main() {
  console.log("Generating PWA icons...");
  await generateIcon(192, "icon-192.png");
  await generateIcon(512, "icon-512.png");
  await generateIcon(180, "apple-touch-icon.png");
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
