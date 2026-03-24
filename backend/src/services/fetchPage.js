import axios from 'axios';

const MAX_LENGTH = 25000;
const TIMEOUT_MS = 15000;

/**
 * Fetch a URL and return plain text content (HTML stripped).
 * @param {string} url
 * @returns {Promise<string>}
 */
export async function fetchPageContent(url) {
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  const res = await axios.get(normalized, {
    timeout: TIMEOUT_MS,
    maxContentLength: 500000,
    maxRedirects: 5,
    responseType: 'text',
    headers: {
      'User-Agent': 'BrightvisionEmailChecker/1.0 (B2B cold email tool)',
      Accept: 'text/html,application/xhtml+xml',
    },
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const html = typeof res.data === 'string' ? res.data : '';
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim();
  return text.slice(0, MAX_LENGTH);
}
