import express from 'express';
import { runChecks } from '../services/checker.js';
import { getSuggestions } from '../services/suggestions.js';
import { getSuggestionsSv } from '../services/suggestions_sv.js';
import { checkSubjectLine } from '../services/subjectLineChecker.js';
import { checkSubjectLineCoherence } from '../services/subjectLineCoherence.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('Request received');
  const emailText = req.body?.draft ?? req.body?.emailText ?? req.body?.text ?? '';
  const locale = req.body?.locale ?? req.body?.spelling ?? 'en-US';
  const subjectLine = req.body.subjectLine || null;
  const language = req.body?.language || 'EN';

  // For Swedish, use sv locale for spellcheck
  const spellLocale = language === 'SV' ? 'sv' : locale;

  const payload = await runChecks(emailText, null, {
    locale: spellLocale,
    subjectLine,
    language,
  });

  // Use Swedish or English suggestions based on language
  const suggestions = language === 'SV'
    ? await getSuggestionsSv(emailText, payload.results || [], subjectLine)
    : await getSuggestions(emailText, payload.results || [], subjectLine);

  payload.suggestions = suggestions;

  if (subjectLine && typeof subjectLine === 'string' && subjectLine.trim()) {
    payload.subjectLine = checkSubjectLine(subjectLine.trim(), language);
  }

  if (subjectLine && typeof subjectLine === 'string' && subjectLine.trim() && emailText && String(emailText).trim()) {
    payload.subjectLineCoherence = await checkSubjectLineCoherence(subjectLine.trim(), emailText.trim(), language);
  }

  res.json(payload);
});

export default router;
