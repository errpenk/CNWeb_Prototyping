import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const root = process.cwd();
const mediaRoot = path.join(root, 'assets/media');
const checkOnly = process.argv.includes('--check');
const sourceLimit = 200 * 1024;
const outputLimit = 500 * 1024;
const maxDimension = 2000;
const sourceExtensions = new Set(['.jpg', '.jpeg', '.png']);
const imageExtensions = new Set([...sourceExtensions, '.webp']);
const textExtensions = new Set(['.cjs', '.css', '.html', '.js', '.json', '.md', '.mjs', '.php', '.yml', '.yaml']);
const ignoredDirectories = new Set(['.deploy', '.git', 'node_modules']);

const walk = (directory, accept) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) return walk(path.join(directory, entry.name), accept);
  const file = path.join(directory, entry.name);
  return entry.isFile() && accept(file) ? [file] : [];
});
const relative = (file) => path.relative(root, file).split(path.sep).join('/');
const sizeLabel = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;

if (!fs.existsSync(mediaRoot)) throw new Error(`Missing media directory: ${mediaRoot}`);

const images = walk(mediaRoot, (file) => imageExtensions.has(path.extname(file).toLowerCase()));
const basenameCounts = images.reduce((counts, file) => {
  const name = path.basename(file);
  counts.set(name, (counts.get(name) || 0) + 1);
  return counts;
}, new Map());
const metadata = new Map(await Promise.all(images.map(async (file) => [file, await sharp(file, { animated: true }).metadata()])));
const needsWork = (file) => {
  const info = metadata.get(file);
  const extension = path.extname(file).toLowerCase();
  const bytes = fs.statSync(file).size;
  return Math.max(info.width || 0, info.height || 0) > maxDimension
    || sourceExtensions.has(extension) && bytes > sourceLimit
    || extension === '.webp' && bytes > outputLimit;
};
const candidates = images.filter(needsWork);

if (checkOnly) {
  if (!candidates.length) {
    console.log('Image check passed.');
  } else {
    console.error('Images need optimization:');
    candidates.forEach((file) => {
      const info = metadata.get(file);
      console.error(`- ${relative(file)} (${info.width}x${info.height}, ${sizeLabel(fs.statSync(file).size)})`);
    });
    console.error('Run: npm run images:optimize');
    process.exitCode = 1;
  }
  process.exit();
}

const replacements = [];
let bytesBefore = 0;
let bytesAfter = 0;

for (const source of candidates) {
  const info = metadata.get(source);
  if ((info.pages || 1) > 1) throw new Error(`Animated image requires manual optimization: ${relative(source)}`);

  const oldBytes = fs.statSync(source).size;
  const extension = path.extname(source).toLowerCase();
  const target = sourceExtensions.has(extension) ? source.replace(/\.(?:jpe?g|png)$/i, '.webp') : source;
  const temporary = `${target}.tmp-${process.pid}`;
  const encode = async (dimension, quality) => {
    let pipeline = sharp(source).rotate();
    if (Math.max(info.width || 0, info.height || 0) > dimension) {
      pipeline = pipeline.resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true });
    }
    await pipeline.webp({ quality, effort: 6 }).toFile(temporary);
  };
  for (const [dimension, quality] of [[maxDimension, 86], [1600, 78], [1280, 72], [960, 65], [720, 60]]) {
    if (fs.existsSync(temporary)) fs.rmSync(temporary);
    await encode(dimension, quality);
    if (fs.statSync(temporary).size <= outputLimit) break;
  }

  const newBytes = fs.statSync(temporary).size;
  if (target === source && newBytes >= oldBytes && oldBytes <= outputLimit && Math.max(info.width || 0, info.height || 0) <= maxDimension) {
    fs.rmSync(temporary);
    continue;
  }

  fs.renameSync(temporary, target);
  if (target !== source) {
    fs.rmSync(source);
    replacements.push([relative(source), relative(target)]);
  }
  bytesBefore += oldBytes;
  bytesAfter += newBytes;
  console.log(`${relative(source)} -> ${relative(target)} (${sizeLabel(oldBytes)} -> ${sizeLabel(newBytes)})`);
}

if (replacements.length) {
  const textFiles = walk(root, (file) => textExtensions.has(path.extname(file).toLowerCase()));
  for (const file of textFiles) {
    let contents = fs.readFileSync(file, 'utf8');
    const original = contents;
    for (const [from, to] of replacements) {
      const variants = [[from, to], [from.replace(/^assets\//, ''), to.replace(/^assets\//, '')]];
      if (basenameCounts.get(path.posix.basename(from)) === 1) variants.push([path.posix.basename(from), path.posix.basename(to)]);
      for (const [oldReference, newReference] of variants) contents = contents.replaceAll(oldReference, newReference);
    }
    if (contents !== original) fs.writeFileSync(file, contents);
  }
}

const remaining = walk(mediaRoot, (file) => imageExtensions.has(path.extname(file).toLowerCase()))
  .filter((file) => fs.statSync(file).size > outputLimit);
if (remaining.length) throw new Error(`Images still exceed ${sizeLabel(outputLimit)}:\n${remaining.map(relative).join('\n')}`);

if (!bytesBefore) console.log('Images are already optimized.');
else console.log(`Saved ${sizeLabel(bytesBefore - bytesAfter)} across ${candidates.length} image(s).`);
