import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'tldts';
import { loadConfig } from '../config/loadConfig.js';
import { validateCapsWords } from './capsValidation.js';
import { checkSpelling } from './spellcheck.js';
import { checkCtaStrength } from './ctaCheck.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = path.resolve(__dirname, '../../../config');

// --- Helpers ---

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return (
    html
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/<[^>]+>/g, ' ')
      // Collapse spaces/tabs only; preserve newlines for paragraph detection
      .replace(/[ \t]+/g, ' ')
      .trim()
  );
}

// Remove personalization placeholders {{...}} so they never affect scoring (spellcheck, duplicate words, word count, etc.).
function stripPersonalizationTokens(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/  +/g, ' ')
    .trim();
}

function getWords(text) {
  if (!text) return [];
  return text
    .split(/\s+/)
    .map((w) => w.replace(/^\W+|\W+$/g, ''))
    .filter(Boolean);
}

// Greeting/sign-off lines are not counted as content paragraphs (so body paragraph count is 4).
function isGreetingOrSignoff(line) {
  const t = line.trim();
  if (/^(Hi |Dear |Hello )/i.test(t)) return true;
  if (/regards|sincerely|best regards/i.test(t)) return true;
  return false;
}

// Treat each line as a paragraph; exclude greeting and sign-off lines so body paragraph count is correct (e.g. 4).
// Single \n or \n\n both create paragraph breaks.
function getParagraphs(text) {
  if (!text) return [];
  let byNewline = text
    .split(/\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  byNewline = byNewline.filter((p) => !isGreetingOrSignoff(p));
  if (byNewline.length > 1) return byNewline;
  // No newlines: treat sentence endings ( . ? ! then space then capital) as paragraph boundary when paste loses line breaks
  if (text.length < 100) return byNewline;
  const bySentence = text
    .split(/[.?!]\s+(?=[A-Z])/)
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !isGreetingOrSignoff(p));
  return bySentence.length > 1 ? bySentence : byNewline;
}

function extractUrls(text) {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]+|www\.[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?/gi;
  const matches = text.match(urlRegex) || [];
  console.log('[extractUrls] found:', matches);
  return [...new Set(matches)];
}

// Simple emoji detection (common ranges)
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

// Spam term matches inside these phrases are not flagged (e.g. "price" in "fixed-price").
const COMPOUND_ALLOWLIST = ['fixed-price', 'price point'];

function isMatchInAllowedCompound(text, matchIndex, matchedTerm, allowedPhrases = COMPOUND_ALLOWLIST) {
  const termLower = matchedTerm.toLowerCase();
  for (const phrase of allowedPhrases) {
    if (!phrase.toLowerCase().includes(termLower)) continue;
    const termOffset = phrase.toLowerCase().indexOf(termLower);
    const phraseStart = matchIndex - termOffset;
    if (phraseStart < 0) continue;
    const extracted = text.slice(phraseStart, phraseStart + phrase.length);
    if (extracted.toLowerCase() === phrase.toLowerCase()) return true;
  }
  return false;
}

function result(id, label, status, value, message) {
  return { id, label, status, value, message };
}

// --- Check 1: Word count ---
function checkWordCount(text, cfg) {
  const c = cfg.thresholds.checks.word_count;
  const words = getWords(text);
  const count = words.length;
  const { good, warning, bad_below, bad_above, messages } = c;

  if (count >= good.min && count <= good.max)
    return result('word_count', c.label, 'GOOD', count, messages.good);
  if (count >= warning.min && count <= warning.max)
    return result('word_count', c.label, 'WARNING', count, messages.warning);
  if (count < bad_below)
    return result('word_count', c.label, 'BAD', count, messages.bad_short);
  return result('word_count', c.label, 'BAD', count, messages.bad_long);
}

// --- Check 2: Paragraphs ---
function checkParagraphs(text, cfg) {
  const c = cfg.thresholds.checks.paragraphs;
  const paras = getParagraphs(text);
  const count = paras.length;
  const { good, warning, bad_below, bad_above, messages } = c;

  if (count >= good.min && count <= good.max)
    return result('paragraphs', c.label, 'GOOD', count, messages.good);
  if (count >= warning.min && count <= warning.max)
    return result('paragraphs', c.label, 'WARNING', count, messages.warning);
  if (count < bad_below)
    return result('paragraphs', c.label, 'BAD', count, messages.bad_short);
  return result('paragraphs', c.label, 'BAD', count, messages.bad_long);
}

// --- Check 3: Letters per word ---
function checkLettersPerWord(text, cfg) {
  const c = cfg.thresholds.checks.letters_per_word;
  const words = getWords(text).filter((w) => w.length > 0);
  const totalLetters = words.reduce((acc, w) => acc + w.replace(/\W/g, '').length, 0);
  const avg = words.length ? totalLetters / words.length : 0;
  const { good_max, messages } = c;

  const status = avg <= good_max ? 'GOOD' : 'BAD';
  const message = avg <= good_max ? messages.good : messages.bad;
  return result('letters_per_word', c.label, status, Math.round(avg * 100) / 100, message);
}

// --- Check 4: Words per paragraph ---
function checkWordsPerParagraph(text, cfg) {
  const c = cfg.thresholds.checks.words_per_paragraph;
  const paras = getParagraphs(text);
  const wordsPerPar = paras.map((p) => getWords(p).length);
  const max = wordsPerPar.length ? Math.max(...wordsPerPar) : 0;
  const { good_max, warning, bad_above, messages } = c;

  if (max <= good_max)
    return result('words_per_paragraph', c.label, 'GOOD', max, messages.good);
  if (max >= warning.min && max <= warning.max)
    return result('words_per_paragraph', c.label, 'WARNING', max, messages.warning);
  return result('words_per_paragraph', c.label, 'BAD', max, messages.bad);
}

// --- Check 5: Unique domains (tldts) ---
function checkUniqueDomains(text, cfg, _rawText) {
  const c = cfg.thresholds.checks.unique_domains;
  const urls = extractUrls(_rawText || text);
  const domains = new Set();
  for (const u of urls) {
    const normalized = /^www\./i.test(u) ? `http://${u}` : u;
    const { domain } = parse(normalized);
    if (domain) domains.add(domain);
  }
  const raw = _rawText || text;
  const hasCalendarPlaceholder = typeof raw === 'string' && raw.includes('{{CalendarLink}}');
  const count = domains.size === 0 && hasCalendarPlaceholder ? 1 : domains.size;
  const { good, warning, bad_zero, bad_above, messages } = c;

  if (good.includes(count))
    return result('unique_domains', c.label, 'GOOD', count, messages.good);
  if (warning.includes(count))
    return result('unique_domains', c.label, 'WARNING', count, messages.warning);
  if (bad_zero && count === 0)
    return result('unique_domains', c.label, 'BAD', count, messages.bad_zero);
  return result('unique_domains', c.label, 'BAD', count, messages.bad_many);
}

// --- Check 6: Spellcheck (LanguageTool) ---
async function checkSpellcheck(text, cfg, locale = 'en-US') {
  const c = cfg.thresholds.checks.spellcheck;
  const errors = await checkSpelling(text, locale);
  const count = errors.length;
  const flaggedWords = [...new Set(errors.map((e) => text.slice(e.offset, e.offset + (e.length || 0)).trim()).filter(Boolean))];

  let out;
  if (count === 0)
    out = result('spellcheck', c.label, 'GOOD', 0, 'No spelling issues detected.');
  else if (count <= 2)
    out = result('spellcheck', c.label, 'WARNING', count, `${count} spelling issue${count === 1 ? '' : 's'} found — review before sending.`);
  else
    out = result('spellcheck', c.label, 'BAD', count, 'Multiple spelling issues detected.');
  if (flaggedWords.length) out.flaggedWords = flaggedWords;
  return out;
}

// --- Check 7: Spam words categories ---
async function checkSpamWordsCategories(text, cfg, spamWords, capsAllowlist) {
  const categoriesTriggered = new Set();
  const matchedSpamWords = [];

  // From spam terms (skip matches inside allowed compounds, e.g. "price" in "fixed-price")
  for (const { term, category } of spamWords.terms) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const hits = [];
    for (const match of text.matchAll(regex)) {
      if (isMatchInAllowedCompound(text, match.index, match[0])) continue;
      hits.push(match[0]);
    }
    if (hits.length > 0) {
      categoriesTriggered.add(category);
      matchedSpamWords.push(...hits);
    }
  }

  // Exclamation marks
  if (/!/.test(text)) {
    categoriesTriggered.add('Exclamation marks');
    matchedSpamWords.push('!');
  }

  // ALL CAPS: Layer 1 = length <= 5 never flagged; Layer 2 = allowlist fast-pass; Layer 3 = 6+ chars validated by Claude
  const allowlist = new Set((capsAllowlist.allowlist || []).map((a) => a.toUpperCase()));
  const tokens = text.split(/\s+/).map((w) => w.replace(/^\W+|\W+$/g, ''));
  const longCapsToCheck = [];
  for (const w of tokens) {
    if (w.length <= 5) continue; // Layer 1: short acronyms pass
    if (w.length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w) && !allowlist.has(w)) {
      longCapsToCheck.push(w);
    }
  }
  if (longCapsToCheck.length > 0) {
    const spamWordsFromClaude = await validateCapsWords(longCapsToCheck);
    if (spamWordsFromClaude.length > 0) {
      categoriesTriggered.add('ALL CAPS');
      matchedSpamWords.push(...spamWordsFromClaude);
    }
  }

  // Bullets
  if (/^[\s]*[•\-*]\s/m.test(text) || /^[\s]*\d+[.)]\s/m.test(text)) {
    categoriesTriggered.add('Bullets');
    matchedSpamWords.push('(bullet)');
  }

  // Multiple questions
  const qCount = (text.match(/\?/g) || []).length;
  if (qCount >= 2) {
    categoriesTriggered.add('Multiple questions');
    matchedSpamWords.push('?');
  }

  // Emojis
  if (EMOJI_REGEX.test(text)) {
    categoriesTriggered.add('Emojis');
    const emojiMatch = text.match(EMOJI_REGEX);
    if (emojiMatch) matchedSpamWords.push(...emojiMatch);
  }

  if (categoriesTriggered.size > 0) {
    console.log('[spam_words_categories] triggered:', [...categoriesTriggered].sort().join(', '), '| words:', matchedSpamWords);
  }

  const count = categoriesTriggered.size;
  const c = cfg.thresholds.checks.spam_words_categories;
  const { good, warning, bad_above, messages } = c;

  if (count <= good)
    return result('spam_words_categories', c.label, 'GOOD', count, messages.good);
  if (count >= warning.min && count <= warning.max)
    return result('spam_words_categories', c.label, 'WARNING', count, messages.warning);
  return result('spam_words_categories', c.label, 'BAD', count, messages.bad);
}

// --- Check 8: Spam words ---
function checkSpamWords(text, cfg, spamWords) {
  const c = cfg.thresholds.checks.spam_words;
  let count = 0;
  const matchedTerms = [];
  const matchedWithReplacements = [];
  for (const entry of spamWords.terms) {
    const { term, replacement, replacements } = entry;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    let termMatchCount = 0;
    let termAdded = false;
    for (const match of text.matchAll(regex)) {
      if (isMatchInAllowedCompound(text, match.index, match[0])) continue;
      termMatchCount += 1;
      if (!termAdded) {
        termAdded = true;
        const termLower = term.toLowerCase();
        if (!matchedTerms.some((t) => t.toLowerCase() === termLower)) {
          matchedTerms.push(term);
          const alts = Array.isArray(replacements) && replacements.length
            ? replacements
            : replacement != null && String(replacement).trim() ? [String(replacement).trim()] : [];
          if (alts.length) matchedWithReplacements.push({ term, replacements: alts });
        }
      }
    }
    count += termMatchCount;
  }
  const { good, warning, bad_above, messages } = c;

  let status, message;
  if (count <= good) {
    status = 'GOOD';
    message = messages.good;
  } else if (count >= warning.min && count <= warning.max) {
    status = 'WARNING';
    message = messages.warning;
  } else {
    status = 'BAD';
    message = messages.bad;
  }
  if (matchedTerms.length) console.log('[spam_words] matched:', matchedTerms);
  const out = result('spam_words', c.label, status, count, message);
  if (matchedTerms.length) out.matchedTerms = matchedTerms;
  if (matchedWithReplacements.length) out.matchedReplacements = matchedWithReplacements;
  return out;
}

// --- Check 9: Duplicate words ---
function checkDuplicateWords(text, cfg, stopWords) {
  const c = cfg.thresholds.checks.duplicate_words;
  const words = getWords(text).map((w) => w.toLowerCase());
  const minLen = c.min_token_length ?? 3;
  const threshold = c.duplicate_threshold ?? 3;
  const stop = new Set((stopWords.stopWords || []).map((s) => s.toLowerCase()));

  const freq = {};
  for (const w of words) {
    if (w.length < minLen || stop.has(w)) continue;
    freq[w] = (freq[w] || 0) + 1;
  }
  const duplicateList = Object.entries(freq)
    .filter(([, n]) => n >= threshold)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
  const duplicatedCount = duplicateList.length;

  const { good, warning, bad_above, messages } = c;

  let out;
  if (duplicatedCount <= good)
    out = result('duplicate_words', c.label, 'GOOD', duplicatedCount, messages.good);
  else if (duplicatedCount >= warning.min && duplicatedCount <= warning.max)
    out = result('duplicate_words', c.label, 'WARNING', duplicatedCount, messages.warning);
  else
    out = result('duplicate_words', c.label, 'BAD', duplicatedCount, messages.bad);
  if (duplicateList.length) out.duplicateList = duplicateList;
  return out;
}

// --- Main ---

/**
 * Run all 9 deterministic checks on email text.
 * @param {string} emailText - Raw email body (plain or HTML)
 * @param {object} [config] - Optional pre-loaded config. If omitted, loads from project config/
 * @param {{ locale?: string, language?: string, subjectLine?: string|null }} [options] - locale: en-US, en-GB, or sv for spellcheck; language: EN or SV for spam/stop word lists when config omitted.
 * @returns {Promise<{ score: number, level: string, results: Array<{ id, label, status, value, message }> }>}
 */
export async function runChecks(emailText, config, options = {}) {
  const language = options.language || 'EN';
  let cfg = config || loadConfig(CONFIG_ROOT);

  if (language === 'SV' && !config) {
    try {
      const svSpamWords = JSON.parse(
        await fs.promises.readFile(path.resolve(CONFIG_ROOT, 'spamWords_sv.json'), 'utf8')
      );
      const svStopWords = JSON.parse(
        await fs.promises.readFile(path.resolve(CONFIG_ROOT, 'stopWords_sv.json'), 'utf8')
      );
      const svThresholds = JSON.parse(
        await fs.promises.readFile(path.resolve(CONFIG_ROOT, 'thresholds_sv.json'), 'utf8')
      );
      cfg.spamWords = svSpamWords;
      cfg.stopWords = svStopWords;
      cfg.thresholds = svThresholds;
    } catch (err) {
      console.error('[checker] Failed to load Swedish config:', err.message);
    }
  }

  const rawText = typeof emailText === 'string' ? emailText : '';
  const text = stripPersonalizationTokens(stripHtml(rawText));
  const locale =
    options.locale === 'en-GB' ? 'en-GB' : options.locale === 'sv' ? 'sv' : 'en-US';

  const r1 = checkWordCount(text, cfg);
  const r2 = checkParagraphs(text, cfg);
  const r3 = checkLettersPerWord(text, cfg);
  const r4 = checkWordsPerParagraph(text, cfg);
  const r5 = checkUniqueDomains(text, cfg, rawText);
  const r6 = await checkSpellcheck(text, cfg, locale);
  const r7 = await checkSpamWordsCategories(text, cfg, cfg.spamWords, cfg.capsAllowlist);
  const r8 = checkSpamWords(text, cfg, cfg.spamWords);
  const r9 = checkDuplicateWords(text, cfg, cfg.stopWords);
  const ctaResult = await checkCtaStrength(text);
  const r10 = result(
    'cta_strength',
    'CTA strength',
    ctaResult.status.toUpperCase(),
    ctaResult.score_label,
    ctaResult.reason
  );

  const results = [r1, r2, r3, r4, r5, r6, r7, r8, r9, r10];

  const weights = (cfg.thresholds && cfg.thresholds.scoring && cfg.thresholds.scoring.weights) || {
    word_count: 13,
    paragraphs: 13,
    words_per_paragraph: 11,
    letters_per_word: 6,
    spam_words_categories: 10,
    spam_words: 10,
    unique_domains: 8,
    spellcheck: 7,
    duplicate_words: 10,
    cta_strength: 12,
  };
  let weightedSum = 0;
  for (const r of results) {
    const w = weights[r.id] ?? 0;
    if (r.status === 'GOOD') weightedSum += w;
    else if (r.status === 'WARNING') weightedSum += w * 0.5;
  }
  const badCount = results.filter((r) => r.status === 'BAD').length;
  const penalty = badCount * 5;
  const score = Math.max(0, Math.min(100, Math.round(weightedSum - penalty)));

  const levels = (cfg.thresholds && cfg.thresholds.scoring && cfg.thresholds.scoring.levels) || {};
  let level = 'bad';
  if (score >= (levels.good?.min_score ?? 80)) level = 'good';
  else if (score >= (levels.warning?.min_score ?? 60)) level = 'warning';

  return {
    score,
    level,
    results,
  };
}
