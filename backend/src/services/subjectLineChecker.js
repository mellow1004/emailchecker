import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from '../config/loadConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_ROOT = path.resolve(__dirname, '../../../config');

const COMPOUND_ALLOWLIST = ['fixed-price', 'price point'];

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

function isMatchInAllowedCompound(text, matchIndex, matchedTerm) {
  const termLower = matchedTerm.toLowerCase();
  for (const phrase of COMPOUND_ALLOWLIST) {
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
  const out = { id, label, status, value, message };
  return out;
}

// Check 1: Length — words and chars excluding {{tokens}}
function checkLength(subjectLine) {
  const text = stripPersonalizationTokens(subjectLine || '');
  const words = getWords(text);
  const wordCount = words.length;
  const charCount = text.length;
  const id = 'subject_length';
  const label = 'Subject line length';

  // BAD: < 4 words OR > 12 words OR > 75 characters
  if (wordCount < 4) {
    return result(id, label, 'BAD', `${wordCount} words, ${charCount} chars`, 'Subject is too short; aim for 4–9 words.');
  }
  if (wordCount > 12) {
    return result(id, label, 'BAD', `${wordCount} words, ${charCount} chars`, 'Subject is too long; aim for 4–9 words.');
  }
  if (charCount > 75) {
    return result(id, label, 'BAD', `${wordCount} words, ${charCount} chars`, 'Subject is too long; keep under 60 characters.');
  }
  // GOOD: 4–9 words AND ≤ 60 characters
  if (wordCount >= 4 && wordCount <= 9 && charCount <= 60) {
    return result(id, label, 'GOOD', `${wordCount} words, ${charCount} chars`, 'Length is in the recommended range.');
  }
  // WARNING: 10–12 words OR 61–75 characters
  return result(id, label, 'WARNING', `${wordCount} words, ${charCount} chars`, 'Consider shortening for better open rates.');
}

// Check 2: Spam words — same list and compound logic as email checker
function checkSpamWords(subjectLine, spamWords) {
  const text = (subjectLine || '').trim();
  const id = 'subject_spam_words';
  const label = 'Spam words in subject';
  let count = 0;
  const matchedTerms = [];
  for (const entry of (spamWords?.terms || [])) {
    const { term } = entry;
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    for (const match of text.matchAll(regex)) {
      if (isMatchInAllowedCompound(text, match.index, match[0])) continue;
      count += 1;
      const termLower = term.toLowerCase();
      if (!matchedTerms.some((t) => t.toLowerCase() === termLower)) {
        matchedTerms.push(term);
      }
    }
  }
  if (count <= 0) {
    const out = result(id, label, 'GOOD', 0, 'No spam words detected.');
    return out;
  }
  if (count === 1) {
    const out = result(id, label, 'WARNING', count, 'One spam word found; consider replacing.');
    if (matchedTerms.length) out.matchedTerms = matchedTerms;
    return out;
  }
  const out = result(id, label, 'BAD', count, 'Multiple spam words detected; replace to improve deliverability.');
  if (matchedTerms.length) out.matchedTerms = matchedTerms;
  return out;
}

// Check 3: Personalization — at least one of {{Company}}, {{FirstName}}, {{Industry}}, {{JobTitle}}
function checkPersonalization(subjectLine) {
  const text = subjectLine || '';
  const id = 'subject_personalization';
  const label = 'Personalization';
  const tokens = ['{{Company}}', '{{FirstName}}', '{{Industry}}', '{{JobTitle}}'];
  const hasToken = tokens.some((t) => text.includes(t));
  if (hasToken) {
    return result(id, label, 'GOOD', 'Contains personalization token', 'Subject includes at least one personalization token.');
  }
  return result(id, label, 'WARNING', 'No tokens', 'Adding {{Company}} or {{FirstName}} can improve open rates.');
}

// Check 4: Question/exclamation marks
function checkPunctuation(subjectLine) {
  const text = subjectLine || '';
  const qCount = (text.match(/\?/g) || []).length;
  const eCount = (text.match(/!/g) || []).length;
  const id = 'subject_punctuation';
  const label = 'Punctuation';
  if (eCount > 0) {
    return result(id, label, 'BAD', `${qCount} ?, ${eCount} !`, 'Avoid exclamation marks in subject lines.');
  }
  if (qCount >= 2) {
    return result(id, label, 'BAD', `${qCount} ?, ${eCount} !`, 'Use at most one question mark in the subject.');
  }
  if (qCount === 1) {
    return result(id, label, 'WARNING', `${qCount} ?, ${eCount} !`, 'One question mark is acceptable but can feel promotional.');
  }
  return result(id, label, 'GOOD', `${qCount} ?, ${eCount} !`, 'No question or exclamation marks.');
}

/**
 * Run 4 deterministic checks on a subject line.
 * @param {string} subjectLine - Raw subject line (may contain {{tokens}})
 * @returns {{ overallStatus: 'good'|'warning'|'bad', score: number, checks: Array<{ id, label, status, value, message }> }}
 */
export function checkSubjectLine(subjectLine) {
  const cfg = loadConfig(CONFIG_ROOT);
  const c1 = checkLength(subjectLine);
  const c2 = checkSpamWords(subjectLine, cfg.spamWords);
  const c3 = checkPersonalization(subjectLine);
  const c4 = checkPunctuation(subjectLine);
  const checks = [c1, c2, c3, c4];

  const points = { GOOD: 25, WARNING: 12, BAD: 0 };
  let score = 0;
  for (const c of checks) {
    score += points[c.status] ?? 0;
  }
  score = Math.max(0, Math.min(100, score));

  let overallStatus = 'bad';
  if (score >= 75) overallStatus = 'good';
  else if (score >= 50) overallStatus = 'warning';

  return {
    overallStatus,
    score,
    checks,
  };
}
