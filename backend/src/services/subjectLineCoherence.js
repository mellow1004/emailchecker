import Anthropic from '@anthropic-ai/sdk';

const COHERENCE_SYSTEM_PROMPT = `You are evaluating whether a B2B cold email subject line is coherent with the email body.

Assess how well the subject line sets up and matches the content of the email body.

Return ONLY a JSON object like this:
{
  "status": "good" | "warning" | "bad",
  "score_label": "Strong" | "Moderate" | "Weak",
  "reason": "One sentence explanation"
}

Scoring criteria:
- GOOD (Strong): Subject line clearly reflects the email topic, tone, and purpose. A recipient reading the subject would not be surprised by the email content.
- WARNING (Moderate): Subject line is loosely related but misses the main point or angle of the email. There is some connection but it could be stronger.
- BAD (Weak): Subject line and email body feel disconnected. The subject line does not prepare the reader for what the email contains, or they contradict each other.

Evaluate only the relationship between subject line and body — not the quality of either individually.`;

/**
 * Call Claude to evaluate subject line vs email body coherence.
 * @param {string} subjectLine - Subject line text
 * @param {string} emailText - Email body text
 * @returns {Promise<{ status: 'good'|'warning'|'bad', score_label: string, reason: string }>}
 */
export async function checkSubjectLineCoherence(subjectLine, emailText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { status: 'warning', score_label: 'Moderate', reason: 'Coherence evaluation unavailable (no API key).' };
  }

  const sub = subjectLine && String(subjectLine).trim();
  const body = emailText && String(emailText).trim();
  if (!sub || !body) {
    return { status: 'warning', score_label: 'Moderate', reason: 'Subject line and email body are required for coherence check.' };
  }

  try {
    const client = new Anthropic();
    const userContent = `Subject line: ${sub}\n\nEmail body:\n${body.slice(0, 8000)}`;
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: COHERENCE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    if (!rawText.trim()) {
      return { status: 'warning', score_label: 'Moderate', reason: 'Coherence evaluation could not be completed.' };
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
    console.error('[subjectLineCoherence] Claude error:', err.message);
    return { status: 'warning', score_label: 'Moderate', reason: 'Coherence evaluation failed — try again or check your connection.' };
  }
}
