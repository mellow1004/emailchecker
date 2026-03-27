import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

const LT_API = 'https://api.languagetool.org/v2/check';

/** True if this match should not be counted as a spelling error (punctuation, whitespace, too short). */
function shouldSkipMatch(word) {
  if (word == null || typeof word !== 'string') return true;
  const t = word.trim();
  if (t.length === 0) return true;
  if (t.length < 2) return true;
  if (/^[\s.,?!;:'"()\-]+$/.test(t)) return true;
  return false;
}

/**
 * Ask Claude which flagged words are proper nouns (brand/company/product names) vs real spelling errors.
 * @param {string[]} words - Words flagged by LanguageTool
 * @returns {Promise<Set<string>>} Set of words (lowercase) that Claude classified as PROPER_NOUN
 */
async function classifyWordsWithClaude(words, locale = 'en-US') {
  const unique = [...new Set(words)].filter(Boolean);
  if (unique.length === 0) return new Set();

  console.log('[spellcheck] Words sent to Claude for classification:', unique);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.log('[spellcheck] Skipping Claude classification: no API key');
    return new Set();
  }

  try {
    const client = new Anthropic();
    const localeNote = locale === 'en-GB'
      ? 'Note: The email uses UK English spelling. Words like "optimisation", "optimised", "colour", "behaviour", "licence", "centre", "analyse" are correctly spelled in UK English and should NOT be classified as SPELLING_ERROR.'
      : 'Note: The email uses US English spelling.';
    const userContent = `${localeNote}\n\nAre any of these words brand names, company names, product names, or proper nouns? Return JSON with each word mapped to either "PROPER_NOUN" or "SPELLING_ERROR". Example: {"bunq": "PROPER_NOUN", "teh": "SPELLING_ERROR"}.\nWords: ${unique.join(', ')}\n\nReturn only the JSON object, no other text.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'You classify words as PROPER_NOUN (brand, company, product, or proper noun) or SPELLING_ERROR (actual typo or misspelling). Return only valid JSON.',
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    console.log('[spellcheck] Claude raw response:', rawText.trim().slice(0, 500) + (rawText.length > 500 ? '...' : ''));

    if (!rawText.trim()) return new Set();

    let jsonStr = rawText.trim();
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return new Set();

    const properNouns = new Set();
    const verdictsByWord = {};
    for (const word of unique) {
      const verdict = parsed[word] ?? parsed[word.toLowerCase()] ?? parsed[word.toUpperCase()];
      verdictsByWord[word] = verdict !== undefined ? String(verdict) : '(missing)';
      if (String(verdict).toUpperCase() === 'PROPER_NOUN') properNouns.add(word.toLowerCase());
    }
    console.log('[spellcheck] Claude verdict per word:', verdictsByWord);
    console.log('[spellcheck] Words classified as PROPER_NOUN (will filter out):', [...properNouns].sort());
    return properNouns;
  } catch (err) {
    console.error('[spellcheck] Claude classification error:', err.message);
    return new Set();
  }
}

/**
 * Check spelling/grammar via LanguageTool public API.
 * Words Claude classifies as brand/company/product/proper nouns are excluded from the error count.
 * @param {string} text - Plain text to check
 * @param {string} [locale='en-US'] - Language code: en-US or en-GB
 * @returns {Promise<Array<{ message: string, offset: number, length: number, context?: object }>>} Array of issues found (proper nouns filtered out)
 */
export async function checkSpelling(text, locale = 'en-US') {
  if (!text || !text.trim()) return [];

  const lang = locale === 'en-GB' ? 'en-GB' : 'en-US';
  let matches;
  try {
    const res = await axios.post(
      LT_API,
      new URLSearchParams({ text: text.trim(), language: lang }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000,
        maxContentLength: 20000,
      }
    );
    matches = res.data?.matches ?? [];
  } catch (err) {
    console.error('[spellcheck] LanguageTool API error:', err.message);
    return [];
  }

  if (matches.length === 0) return [];

  const normalized = text.trim();
  const enriched = matches.map((m) => {
    const offset = m.offset ?? 0;
    const length = m.length ?? 0;
    const word = normalized.slice(offset, offset + length);
    return {
      message: m.message || m.shortMessage || 'Spelling/grammar issue',
      offset,
      length,
      context: m.context,
      _word: word,
    };
  });

  const realWordMatches = enriched.filter((m) => !shouldSkipMatch(m._word));
  const flaggedWords = realWordMatches.map((m) => m._word).filter(Boolean);
  const properNouns = await classifyWordsWithClaude(flaggedWords, locale);

  const filtered = realWordMatches.filter((m) => !properNouns.has((m._word || '').toLowerCase()));
  const filteredOut = realWordMatches.filter((m) => properNouns.has((m._word || '').toLowerCase()));
  const keptAsErrors = filtered.map((m) => m._word);
  console.log('[spellcheck] Filtered out (proper nouns, not counted as errors):', filteredOut.map((m) => m._word));
  console.log('[spellcheck] Kept as errors:', keptAsErrors);

  return filtered.map(({ _word, ...rest }) => rest);
}
