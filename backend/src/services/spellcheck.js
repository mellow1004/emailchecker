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
 * Ask Claude to classify each flagged word as CORRECT or SPELLING_ERROR for the active locale.
 * @param {string[]} words - Words flagged by LanguageTool
 * @param {string} [locale='en-US']
 * @returns {Promise<Set<string>>} Lowercase words Claude classified as CORRECT (filtered out of error count)
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

    const localeDesc = locale === 'en-GB'
      ? 'British English (en-GB). Words spelled correctly in British English must NOT be marked as errors, even if they differ from American English. This includes words ending in -ise/-isation (not -ize/-ization), -our (not -or), -re (not -er), -ogue (not -og), -ence/-ence (not -ense), double-l inflections, and all other standard British spellings.'
      : 'American English (en-US). Words spelled correctly in American English must NOT be marked as errors, even if they differ from British English.';

    const systemPrompt = `You are a spell-checker that validates words in the context of ${localeDesc}

Your job is to classify each word as either:
- CORRECT: the word is correctly spelled (including proper nouns, brand names, technical terms, informal compounds, or valid ${locale === 'en-GB' ? 'British' : 'American'} English spellings)
- SPELLING_ERROR: the word is genuinely misspelled and not a valid word in any context

Be generous — only mark a word as SPELLING_ERROR if you are highly confident it is a real spelling mistake. When in doubt, classify as CORRECT.

Return only a valid JSON object mapping each word to "CORRECT" or "SPELLING_ERROR". No other text.`;

    const userContent = `Classify each of these words as CORRECT or SPELLING_ERROR:\n${unique.join(', ')}\n\nReturn only the JSON object.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';

    console.log('[spellcheck] Claude raw response:', rawText.trim().slice(0, 500));
    if (!rawText.trim()) return new Set();

    let jsonStr = rawText.trim();
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return new Set();

    const correctWords = new Set();
    const verdictsByWord = {};
    for (const word of unique) {
      const verdict = parsed[word] ?? parsed[word.toLowerCase()] ?? parsed[word.toUpperCase()];
      verdictsByWord[word] = verdict !== undefined ? String(verdict) : '(missing)';
      if (String(verdict).toUpperCase() !== 'SPELLING_ERROR') {
        correctWords.add(word.toLowerCase());
      }
    }
    console.log('[spellcheck] Claude verdict per word:', verdictsByWord);
    console.log('[spellcheck] Words classified as CORRECT (filtered out):', [...correctWords].sort());
    return correctWords;
  } catch (err) {
    console.error('[spellcheck] Claude classification error:', err.message);
    return new Set();
  }
}

/**
 * Check spelling/grammar via LanguageTool public API.
 * Words Claude classifies as CORRECT (valid spelling in locale context) are excluded from the error count.
 * @param {string} text - Plain text to check
 * @param {string} [locale='en-US'] - Language code: en-US or en-GB
 * @returns {Promise<Array<{ message: string, offset: number, length: number, context?: object }>>} Array of issues found (Claude-confirmed errors only)
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
  const correctWords = await classifyWordsWithClaude(flaggedWords, locale);

  const filtered = realWordMatches.filter((m) => !correctWords.has((m._word || '').toLowerCase()));
  const filteredOut = realWordMatches.filter((m) => correctWords.has((m._word || '').toLowerCase()));
  const keptAsErrors = filtered.map((m) => m._word);
  console.log('[spellcheck] Filtered out (CORRECT per Claude, not counted as errors):', filteredOut.map((m) => m._word));
  console.log('[spellcheck] Kept as errors:', keptAsErrors);

  return filtered.map(({ _word, ...rest }) => rest);
}
