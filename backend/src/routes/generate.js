import express from 'express';
import { fetchPageContent } from '../services/fetchPage.js';
import { generateDrafts } from '../services/claude.js';
import { runChecks } from '../services/checker.js';
import { checkSubjectLine } from '../services/subjectLineChecker.js';
import { checkSubjectLineCoherence } from '../services/subjectLineCoherence.js';

const router = express.Router();

const MIN_CONTENT_LENGTH = 500;

const LT_DELAY_MS = 1000;

router.post('/', async (req, res) => {
  const url = (req.body?.url ?? req.body?.companyUrl ?? '').trim();
  const prospectUrl = (req.body?.prospectUrl ?? '').trim();
  const manualContext = (req.body?.context ?? req.body?.additionalContext ?? '').trim();
  const targetIndustry = (req.body?.targetIndustry ?? '').trim();
  const targetRole = (req.body?.targetRole ?? '').trim();
  const locale = req.body?.locale || 'US';
  if (!url) {
    return res.status(400).json({ error: 'URL is required', drafts: [] });
  }

  try {
    const pageContent = await fetchPageContent(url);
    const hasEnoughFromUrl = pageContent.length >= MIN_CONTENT_LENGTH;
    if (!hasEnoughFromUrl && !manualContext) {
      return res.json({ drafts: [], needsContext: true });
    }

    let prospectContent = '';
    if (prospectUrl) {
      try {
        const fetched = await fetchPageContent(prospectUrl);
        if (fetched && fetched.length > 0) prospectContent = fetched;
      } catch {
        // Optional — never block generation
      }
    }

    const rawDrafts = await generateDrafts(pageContent, {
      targetIndustry,
      targetRole,
      context: manualContext,
      prospectContent,
      locale,
    });

    const drafts = [];
    for (let i = 0; i < rawDrafts.length; i++) {
      const d = rawDrafts[i];
      const fullText = [d.body, d.signoff].filter(Boolean).join('\n\n');
      const spellLocale = locale === 'UK' ? 'en-GB' : 'en-US';
      const checkResult = await runChecks(fullText, null, { locale: spellLocale });
      const subject = d.subject || '';
      const subjectCheck = checkSubjectLine(subject);
      const spamCheck = (subjectCheck.checks || []).find((c) => c.id === 'subject_spam_words') || {};
      const coherenceResult = await checkSubjectLineCoherence(subject, fullText);
      drafts.push({
        subject: d.subject,
        body: d.body,
        signoff: d.signoff,
        score: checkResult.score,
        level: checkResult.level,
        results: checkResult.results,
        subjectAnalysis: {
          spamWords: {
            status: spamCheck.status || 'GOOD',
            matchedTerms: spamCheck.matchedTerms || [],
          },
          coherence: {
            status: coherenceResult.status,
            score_label: coherenceResult.score_label,
            reason: coherenceResult.reason,
          },
        },
      });
      if (i < rawDrafts.length - 1) {
        await new Promise((r) => setTimeout(r, LT_DELAY_MS));
      }
    }

    res.json({ drafts });
  } catch (err) {
    console.error('[generate]', err.message);
    const status = err.response?.status === 404 ? 404 : err.code === 'ENOTFOUND' ? 404 : 500;
    res.status(status).json({
      error: err.message || 'Failed to generate drafts',
      drafts: [],
    });
  }
});

export default router;
