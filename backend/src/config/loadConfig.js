import fs from 'fs';
import path from 'path';

/**
 * Load config from project config/ directory.
 * @param {string} configRoot - Absolute path to the config folder (e.g. path.join(process.cwd(), '..', 'config'))
 * @returns {{ thresholds: object, spamWords: object, stopWords: object, capsAllowlist: object }}
 */
export function loadConfig(configRoot) {
  const read = (file) => {
    const filePath = path.join(configRoot, file);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  };

  return {
    thresholds: read('thresholds.json'),
    spamWords: read('spamWords.json'),
    stopWords: read('stopWords.json'),
    capsAllowlist: read('capsAllowlist.json'),
  };
}
