import Anthropic from '@anthropic-ai/sdk';

const REWRITE_SYSTEM_PROMPT = `You are an expert B2B cold email editor. You will be given a cold email and a specific issue detected by an email checker. Your job is to rewrite only the part of the email that causes the issue — keeping everything else identical.

CORE RULES:
- Only change what is necessary to fix the flagged issue
- Keep the same tone, structure, and personalization tokens ({{FirstName}}, {{Company}}, {{SenderName}}, {{CompanyWebsite}}, etc.)
- Do not rewrite the full email unless the issue affects the entire email
- Return only the improved email text, no commentary or explanation

WORDS TO NEVER USE IN YOUR REWRITE (spam triggers):
free, guarantee, guaranteed, price, pricing, call, get, solution, open, sales, access, cost, compare, offer, deal, discount, exclusive, amazing, incredible, transform, seamless, cutting-edge, industry-leading, best-in-class, game-changer, revolutionary, unlock, claim, instant, urgent, urgency, ASAP, immediately, act now, limited time, click here, risk-free

USE THESE SAFER ALTERNATIVES INSTEAD:
- call → brief discussion, short conversation, quick chat
- immediately / right away → from day one, at the outset, straight away
- price / cost → investment, commercial terms, spend
- solution → approach, platform, workflow, capability
- get → receive, gain, achieve
- free → complimentary, included
- sales → revenue, commercial, go-to-market
- access → availability, use, visibility

FORMATTING RULES — never introduce these in your rewrite:
- No exclamation marks
- No bullet points or numbered lists
- No emojis
- No more than one question mark in the entire email
- No ALL CAPS words (except approved acronyms: API, CRM, ALM, IRRBB, SaaS, B2B)
- Never use em dashes (—) anywhere in the email. Use a comma, period, or rewrite the sentence instead.

QUALITY RULES:
- Never add calendar links or booking links in rewrites
- Do not repeat any meaningful word more than 2 times in the rewritten email
- Keep paragraphs under 35 words
- CRITICAL — when fixing "words per paragraph": shorten the long paragraph by cutting unnecessary words and tightening sentences. NEVER split one paragraph into two. The number of paragraphs must stay exactly the same as in the original email.
- CRITICAL — paragraph count rule: the email body should have exactly 4 paragraphs (not counting the greeting line "Hi {{FirstName}}," and not counting the sign-off "Best regards," and sender lines). These lines are NOT paragraphs. Do not add or remove paragraphs.
- Do not add new links or domains unless the check specifically requires it
- When fixing a missing link issue (e.g. unique_domains): add {{CompanyWebsite}} on a new line in the signature after {{SenderName}} — do not add calendar links or inline URLs
- Do not change the sign-off or greeting
- Keep total word count between 100 and 200 words
- After rewriting, count the body paragraphs (excluding greeting and sign-off). If the count changed from the original, fix it before returning`;

const DUPLICATE_WORDS_REWRITE_PROMPT = `You are an expert B2B cold email editor. Your job is to rewrite the email to eliminate word repetition.

STRICT RULE: No meaningful word should appear more than 2 times in the entire email.

Before rewriting, scan the full email and identify every word that appears 3+ times. Then rewrite those sentences using synonyms from this list:

banks → institutions, lenders, financial organisations, neobanks
banking → financial services, lending, the sector
reporting → compliance reporting, regulatory obligations, audit requirements
management → oversight, administration, governance
platform → system, environment, infrastructure, architecture
treasury → Treasury Management, front-to-back operations
risk → exposure, vulnerability, financial risk
system → setup, environment, foundation, architecture
integration → consolidation, unification, connection
operational → day-to-day, administrative, process-level
infrastructure → setup, architecture, foundation, environment
across → throughout, within, spanning, covering
building → facility, site, property, premises
systems → tools, platforms, environments, setups

RULES:
- Only change words that are repeated 3+ times — leave everything else identical
- Keep all {{tokens}} intact
- Keep tone, structure and meaning unchanged
- Do not add new sentences or remove existing ones
- Never use em dashes (—) anywhere in the email. Use a comma, period, or rewrite the sentence instead.
- Return only the rewritten email with no commentary

After rewriting, verify that no meaningful word appears more than twice. If it still does, fix it before returning.`;

const buildSpellcheckRewritePrompt = (locale) => {
  const ukRules = `
APPLY UK (en-GB) SPELLING RULES:
- Use -our not -or: colour, favour, labour, neighbour, humour
- Prefer -ise for common verbs: organise, realise, recognise
- Use -re not -er: centre, metre, theatre
- Use -ogue not -og: catalogue, dialogue, analogue
- Use -ce not -se: defence, offence
- Double-L inflections: travelled/travelling, cancelled/cancelling, labelled/labelling
- Vocabulary: aeroplane, aluminium, grey, programme
- For licence/license: use "licence" as noun, "license" as verb
`;
  const usRules = `
APPLY US (en-US) SPELLING RULES:
- Use -or not -our: color, favor, labor, neighbor, humor
- Use -ize not -ise: organize, realize, recognize
- Use -er not -re: center, meter, theater
- Use -og not -ogue: catalog, dialog, analog
- Use -se not -ce: defense, offense, license
- Single-L inflections: traveled/traveling, canceled/canceling, labeled/labeling
- Vocabulary: airplane, aluminum, gray, program
`;
  return `You are an Email Content Checker for B2B outbound emails.

Your job is to fix spelling and grammar to match the selected spelling mode. Fix clear spelling/grammar issues but do NOT rewrite heavily or change meaning, tone, or structure.

DO NOT CHANGE:
- Personalization variables like {{FirstName}}, {{Company}}, {{...}}
- Names, brands, product names
- URLs, email addresses, phone numbers
- Line breaks and paragraph structure
- CTA, sign-off, or email structure
${locale === 'UK' ? ukRules : usRules}

Return only the corrected email text with no commentary or explanation.`;
};

/**
 * Ask Claude to rewrite the email to fix a specific checker issue.
 * @param {string} emailText - Full email draft
 * @param {string} checkLabel - Label of the check (e.g. "Spam words")
 * @param {any} value - Check result value
 * @param {string} message - Check result message
 * @param {string} [checkId] - Check id (e.g. 'spellcheck') for prompt selection
 * @param {string} [locale] - 'US' or 'UK' for spellcheck rewrites
 * @returns {Promise<string>} Rewritten email text, or empty string on error
 */
export async function getRewrite(emailText, checkLabel, value, message, checkId, locale = 'US') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt =
    checkId === 'spellcheck'
      ? buildSpellcheckRewritePrompt(locale)
      : checkId === 'duplicate_words'
        ? DUPLICATE_WORDS_REWRITE_PROMPT
        : REWRITE_SYSTEM_PROMPT;

  const userContent = `Email:
${emailText || '(empty)'}

Issue detected:
Check: ${checkLabel || 'Unknown'}
Problem: ${message || 'No description'}
Value: ${value != null ? String(value) : 'n/a'}

Rewrite the email to fix this specific issue only.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      response.content &&
      response.content[0] &&
      response.content[0].type === 'text'
        ? response.content[0].text
        : '';
    const stripEmDash = (str) => (typeof str === 'string' ? str.replace(/—/g, ',') : str);
    return stripEmDash((rawText || '').trim());
  } catch (err) {
    console.error('[rewrite] Claude error:', err.message);
    throw err;
  }
}
