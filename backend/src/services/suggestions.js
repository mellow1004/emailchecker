import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are the Brightvision Email Content Checker. Your job is to review the provided email content using Brightvision's deterministic scoring specification (9 checks). Your output must: Explain why each non-GOOD check triggered in short, specific language. Provide a concrete improvement suggestion for each issue. For spam terms, provide safer alternatives aligned to professional B2B tone. Do not rewrite the full email unless explicitly requested. Keep recommendations professional, realistic, and deliverability-aware. Respect that inbox placement depends on technical and reputation factors outside content. Do not claim guaranteed inbox placement.

Respond with a JSON object only, no other text. Format:
{ "suggestions": [ { "checkId": "<id from the checks>", "explanation": "short why it triggered", "fix": "concrete suggestion" }, ... ] }
Include one object per non-GOOD check (status BAD, WARNING, or PENDING). Use the exact checkId values: word_count, paragraphs, letters_per_word, words_per_paragraph, unique_domains, spellcheck, spam_words_categories, spam_words, duplicate_words, cta_strength.

For unique_domains WARNING with 0 links: suggest adding the sender's company website as a signature link (e.g. www.company.com) for credibility and trust — not a calendar booking link.

For spellcheck: when Flagged words are provided, your suggestion must reference those specific words. Explain for each (or as a group) whether they are US/UK spelling variants (e.g. colour vs color) or genuine spelling/grammar errors, and give a concrete fix — do not guess at other possible issues.

For words_per_paragraph: never suggest splitting a paragraph into two. Always suggest shortening the paragraph by tightening the wording to stay under 35 words. The email should maintain exactly 4 body paragraphs.

Important paragraph counting context: The greeting line ("Hi {{FirstName}},") and the sign-off lines ("Kind regards,", "Best regards,", sender name, website) are NOT body paragraphs and are not counted. When referencing paragraphs in your suggestions, only count and reference the body content paragraphs. So "the first paragraph" means the first content paragraph after the greeting, not the greeting itself.`;

/**
 * Build user message from email text and check results for Claude.
 * @param {string} emailText
 * @param {Array<{ id: string, label: string, status: string, value: any, message: string, matchedTerms?: string[] }>} results
 * @returns {string}
 */
function buildUserMessage(emailText, results) {
  const nonGood = (results || []).filter((r) => r.status !== 'GOOD');
  const lines = [
    '--- EMAIL DRAFT ---',
    emailText || '(empty)',
    '',
    '--- CHECK RESULTS (non-GOOD only) ---',
  ];
  nonGood.forEach((r) => {
    const msg =
      r.id === 'words_per_paragraph'
        ? `The longest body paragraph (excluding greeting and sign-off) contains ${r.value} words. Shorten it by tightening wording — do NOT suggest splitting into two paragraphs.`
        : r.message;
    lines.push(`[${r.id}] ${r.label}: ${r.status} (value: ${r.value ?? 'n/a'}). Message: ${msg}`);
    if (r.matchedTerms && r.matchedTerms.length) {
      lines.push(`  Matched spam terms: ${r.matchedTerms.join(', ')}`);
    }
    if (r.id === 'spellcheck' && r.flaggedWords?.length > 0) {
      lines.push(`  Flagged words: ${r.flaggedWords.join(', ')}`);
    }
  });
  lines.push('');
  lines.push('Return a JSON object with a "suggestions" array. Each item: checkId, explanation, fix.');
  return lines.join('\n');
}

/**
 * Call Anthropic API and return per-check suggestions for non-GOOD checks.
 * @param {string} emailText
 * @param {Array} results - from runChecks
 * @param {string|null} [subjectLine] - optional subject line (only present when user filled it in)
 * @returns {Promise<Record<string, { explanation: string, fix: string }>>} checkId -> { explanation, fix }, or {} on error
 */
export async function getSuggestions(emailText, results, subjectLine = null) {
  console.log('API key loaded:', !!process.env.ANTHROPIC_API_KEY);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    console.log('[suggestions] No API key, skipping');
    return {};
  }

  const nonGood = (results || []).filter((r) => r.status !== 'GOOD');
  if (nonGood.length === 0) {
    console.log('[suggestions] All checks GOOD, skipping');
    return {};
  }

  try {
    const client = new Anthropic();
    const userContent = buildUserMessage(emailText, results);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      message.content &&
      message.content[0] &&
      message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    console.log('[suggestions] Raw response from Claude (first 500 chars):', rawText ? rawText.substring(0, 500) : '(empty)');
    if (!rawText.trim()) return {};

    // Parse JSON (allow wrapped in markdown code block)
    let jsonStr = rawText.trim();
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr);
    const suggestions = parsed && Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    const byCheckId = {};
    suggestions.forEach((s) => {
      if (s && s.checkId && (s.explanation || s.fix)) {
        byCheckId[s.checkId] = {
          explanation: s.explanation || '',
          fix: s.fix || '',
        };
      }
    });
    return byCheckId;
  } catch (err) {
    console.error('[suggestions] Anthropic API error:', err.message);
    console.error('[suggestions] Full error:', err);
    return {};
  }
}
