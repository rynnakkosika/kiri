// Copies the playable game (the same files GitHub Pages serves) into mobile/www for Capacitor.
// The game stays build-free: this copy is only the Android wrapper's input.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mobile = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(mobile, '..');
const www = join(mobile, 'www');

rmSync(www, { recursive: true, force: true });
mkdirSync(www);
for (const item of ['index.html', 'styles.css', 'manifest.webmanifest', 'privacy.html', 'icons', 'src']) {
  cpSync(join(game, item), join(www, item), { recursive: true });
}
console.log('Copied the game into', www);
