import express from 'express';
import { fetchPageContent } from '../services/fetchPage.js';
import { generateDrafts } from '../services/claude.js';
import { generateDraftsSv } from '../services/claude_sv.js';
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
  const language = req.body?.language || 'EN';

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

    // Use Swedish or English generation based on language
    const rawDrafts =
      language === 'SV'
        ? await generateDraftsSv(pageContent, {
            targetIndustry,
            targetRole,
            context: manualContext,
            prospectContent,
          })
        : await generateDrafts(pageContent, {
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

      // Swedish uses sv locale, English uses en-GB or en-US
      const spellLocale = language === 'SV' ? 'sv' : locale === 'UK' ? 'en-GB' : 'en-US';
      const checkResult = await runChecks(fullText, null, { locale: spellLocale, language });

      // Remove unique_domains from results for scoring purposes in Tab 2
      const tab2Results = checkResult.results.map((r) =>
        r.id === 'unique_domains'
          ? {
              ...r,
              status: 'GOOD',
              message:
                language === 'SV'
                  ? 'Att lägga till en relevant länk i din signatur förbättrar levererbarheten.'
                  : 'Adding a relevant link in your signature will improve deliverability.',
              _advisoryOnly: true,
            }
          : r
      );

      // Recalculate score without unique_domains penalty
      const weights = {
        word_count: 13,
        paragraphs: 13,
        words_per_paragraph: 11,
        letters_per_word: 6,
        spam_words_categories: 10,
        spam_words: 10,
        unique_domains: 0,
        spellcheck: 7,
        duplicate_words: 10,
        cta_strength: 12,
      };
      let weightedSum = 0;
      for (const r of tab2Results) {
        const w = weights[r.id] ?? 0;
        if (r.status === 'GOOD') weightedSum += w;
        else if (r.status === 'WARNING') weightedSum += w * 0.5;
      }
      const badCount = tab2Results.filter((r) => r.status === 'BAD').length;
      const tab2Score = Math.max(0, Math.min(100, Math.round(weightedSum - badCount * 5)));
      const tab2Level = tab2Score >= 80 ? 'good' : tab2Score >= 60 ? 'warning' : 'bad';

      const subject = d.subject || '';
      const subjectCheck = checkSubjectLine(subject);
      const spamCheck = (subjectCheck.checks || []).find((c) => c.id === 'subject_spam_words') || {};
      const coherenceResult = await checkSubjectLineCoherence(subject, fullText, language);

      drafts.push({
        subject: d.subject,
        body: d.body,
        signoff: d.signoff,
        score: tab2Score,
        level: tab2Level,
        results: tab2Results,
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

    const sortedDrafts = [...drafts].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    res.json({ drafts: sortedDrafts });
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
