// Renders the SVG artwork into the PNGs the web app, the Android app and the Play Store listing need.
// Run after changing any of the SVGs: npm run images
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(mobile, '..');
const p = (...parts) => join(game, ...parts);

const jobs = [
  // Web app (PWA) icons. The full-bleed icon is also safe as a maskable icon: the mark sits in the middle.
  [p('icons/icon.svg'), p('icons/icon-192.png'), 192, 192],
  [p('icons/icon.svg'), p('icons/icon-512.png'), 512, 512],
  [p('mobile/assets/icon-foreground.svg'), p('icons/icon-maskable-512.png'), 512, 512, '#d9481c'],
  [p('icons/icon.svg'), p('icons/apple-touch-icon.png'), 180, 180],
  // Inputs for @capacitor/assets (Android launcher icons and splash screen).
  [p('icons/icon.svg'), p('mobile/assets/icon-only.png'), 1024, 1024],
  [p('mobile/assets/icon-foreground.svg'), p('mobile/assets/icon-foreground.png'), 1024, 1024],
  [p('mobile/assets/splash.svg'), p('mobile/assets/splash.png'), 2732, 2732],
  [p('mobile/assets/splash.svg'), p('mobile/assets/splash-dark.png'), 2732, 2732],
  // Play Store listing.
  [p('icons/icon.svg'), p('store/graphics/icon-512.png'), 512, 512],
  [p('store/feature-graphic.svg'), p('store/graphics/feature-graphic-1024x500.png'), 1024, 500],
];

// Solid background layer for the Android adaptive icon.
await sharp({ create: { width: 1024, height: 1024, channels: 3, background: '#d9481c' } }).png().toFile(p('mobile/assets/icon-background.png'));
console.log('wrote', join('mobile', 'assets', 'icon-background.png'));

for (const [src, out, w, h, bg] of jobs) {
  mkdirSync(dirname(out), { recursive: true });
  let img = sharp(src, { density: 300 }).resize(w, h);
  if (bg) img = img.flatten({ background: bg });
  await img.png().toFile(out);
  console.log('wrote', out.slice(game.length + 1));
}
