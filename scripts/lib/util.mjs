// Small dependency-free helpers for the daily data fetcher.
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(__dirname, '..', '..');
export const DATA_DIR = join(ROOT, 'data');
export const SEED_DIR = join(ROOT, 'scripts', 'seed');

export const nowIso = () => new Date().toISOString();

export async function writeJson(name, obj) {
  await writeFile(join(DATA_DIR, name), JSON.stringify(obj, null, 2) + '\n');
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

// Copy a seed file into data/ as a fallback, returning "seed".
export async function copySeed(baseName) {
  await copyFile(join(SEED_DIR, `${baseName}.seed.json`), join(DATA_DIR, `${baseName}.json`));
  return 'seed';
}

// One year ago in YYYY-MM-DD for FRED observation_start.
export function oneYearAgo() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
