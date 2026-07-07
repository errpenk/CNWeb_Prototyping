import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const pluginDir = path.join(root, 'wordpress-plugins/luxureat-github-sync');
const distDir = path.join(root, 'dist');
const zipFile = path.join(distDir, 'luxureat-github-sync.zip');

if (!fs.existsSync(pluginDir)) {
  console.error(`Plugin directory not found: ${pluginDir}`);
  process.exit(1);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

execFileSync('zip', ['-qr', zipFile, 'luxureat-github-sync', '-x', '*.DS_Store'], {
  cwd: path.dirname(pluginDir),
  stdio: 'inherit',
});

console.log(`Plugin zip written to ${zipFile}`);
