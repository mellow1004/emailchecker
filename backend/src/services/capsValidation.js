import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You classify ALL CAPS words as either legitimate business/industry terms or spam/hype. Legitimate = acronyms, standard industry terms, company names, regulatory terms (e.g. GDPR, NIS2). SPAM = hype words, sales fluff, or words that look like shouting for effect. Return only valid JSON.`;

/**
 * Ask Claude which of the given ALL CAPS words are SPAM (vs LEGITIMATE).
 * @param {string[]} words - Uppercase words, 6+ chars each, not in allowlist
 * @returns {Promise<string[]>} Subset of words that Claude classified as SPAM
 */
export async function validateCapsWords(words) {
  if (!words || words.length === 0) return [];
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) return [];

  const unique = [...new Set(words)].filter((w) => w.length >= 6);
  if (unique.length === 0) return [];

  try {
    const client = new Anthropic();
    const userContent = `Are these ALL CAPS words legitimate business acronyms or industry terms, or are they spam/hype words?\nWords: ${unique.join(', ')}\n\nReturn a JSON object mapping each word to either "LEGITIMATE" or "SPAM". Example: {"WORD1": "SPAM", "WORD2": "LEGITIMATE"}. No other text.`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    if (!rawText.trim()) return [];

    let jsonStr = rawText.trim();
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return [];

    const spam = [];
    for (const word of unique) {
      const verdict = parsed[word] || parsed[word.toUpperCase()];
      if (String(verdict).toUpperCase() === 'SPAM') spam.push(word);
    }
    return spam;
  } catch (err) {
    console.error('[capsValidation] Claude error:', err.message);
    return [];
  }
}
