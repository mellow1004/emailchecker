import Anthropic from '@anthropic-ai/sdk';

const CTA_SYSTEM_PROMPT = `You are evaluating the CTA (call-to-action) in a B2B cold email.
Assess how likely the CTA is to generate a response and book a meeting.

Return ONLY a JSON object like this:
{
  "status": "good" | "warning" | "bad",
  "score_label": "Strong" | "Moderate" | "Weak",
  "reason": "One sentence explanation"
}

Scoring criteria:

- GOOD: Any of the following:
  * Direct, confident meeting request with low friction. Examples: "Would a 15-minute call work this week?" or "I have 10 minutes Tuesday or Thursday — which works better?"
  * A specific, diagnostic question about the prospect's current situation that invites a meaningful reply. Examples: "What's the biggest bottleneck preventing {{Company}} from scaling pipeline?" or "How is {{Company}} currently managing ALM and Treasury — one system or multiple tools?"
  * A reply-based CTA that requires a specific, thoughtful response — not a yes/no answer.

- WARNING: Somewhat hesitant, vague, or overly formal. Examples: "Would it be worthwhile to explore this?" or "Let me know if you'd like to chat sometime" or "Feel free to reach out if interested."

- BAD: Apologetic, no clear ask, or multiple questions. Examples: "Just wanted to share this in case it's useful" or "Hope this helps, let me know!" or asking two questions at once.

Key principle: A strong CTA either books a specific meeting OR asks a specific diagnostic question that requires a meaningful reply. Both are equally valid approaches in B2B cold email.

Only evaluate the CTA sentence(s), not the full email.`;

/**
 * Call Claude to evaluate CTA strength. Returns status (good/warning/bad), score_label, and reason.
 * @param {string} emailText - Full email body (plain text)
 * @returns {Promise<{ status: 'good'|'warning'|'bad', score_label: string, reason: string }>}
 */
export async function checkCtaStrength(emailText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { status: 'warning', score_label: 'Moderate', reason: 'CTA evaluation unavailable (no API key).' };
  }

  if (!emailText || !String(emailText).trim()) {
    return { status: 'bad', score_label: 'Weak', reason: 'No email content to evaluate.' };
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: CTA_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Evaluate the CTA in this email:\n\n${String(emailText).trim().slice(0, 8000)}` }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    if (!rawText.trim()) {
      return { status: 'warning', score_label: 'Moderate', reason: 'CTA evaluation could not be completed.' };
    }

    let jsonStr = rawText.trim();
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr);

    const status = String(parsed.status || 'warning').toLowerCase();
    const validStatus = ['good', 'warning', 'bad'].includes(status) ? status : 'warning';
    const score_label = String(parsed.score_label || 'Moderate').trim() || 'Moderate';
    const reason = String(parsed.reason || 'No explanation provided.').trim() || 'No explanation provided.';

    return { status: validStatus, score_label, reason };
  } catch (err) {
    console.error('[ctaCheck] Claude error:', err.message);
    return { status: 'warning', score_label: 'Moderate', reason: 'CTA evaluation failed — try again or check your connection.' };
  }
}
