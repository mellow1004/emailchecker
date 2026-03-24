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
- GOOD: Direct, confident, low-friction ask. Examples: "Book a time here: {{CalendarLink}}" or "Would a 15-minute call work this week?"
- WARNING: Somewhat hesitant or overly formal. Examples: "Would it be worthwhile to..." or "If you're open to it..."
- BAD: Apologetic, vague, or no clear ask. Examples: "Let me know if you'd like to chat sometime" or "Feel free to reach out"

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
