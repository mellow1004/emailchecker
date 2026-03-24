import express from 'express';
import { runChecks } from '../services/checker.js';
import { getSuggestions } from '../services/suggestions.js';
import { checkSubjectLine } from '../services/subjectLineChecker.js';
import { checkSubjectLineCoherence } from '../services/subjectLineCoherence.js';

const router = express.Router();

router.post('/', async (req, res) => {
  console.log('Request received');
  const emailText = req.body?.draft ?? req.body?.emailText ?? req.body?.text ?? '';
  const locale = req.body?.locale ?? req.body?.spelling ?? 'en-US';
  const subjectLine = req.body.subjectLine || null;
  const payload = await runChecks(emailText, null, { locale, subjectLine });
  const suggestions = await getSuggestions(emailText, payload.results || [], subjectLine);
  payload.suggestions = suggestions;
  if (subjectLine && typeof subjectLine === 'string' && subjectLine.trim()) {
    payload.subjectLine = checkSubjectLine(subjectLine.trim());
  }
  if (subjectLine && typeof subjectLine === 'string' && subjectLine.trim() && emailText && String(emailText).trim()) {
    payload.subjectLineCoherence = await checkSubjectLineCoherence(subjectLine.trim(), emailText.trim());
  }
  res.json(payload);
});

export default router;
