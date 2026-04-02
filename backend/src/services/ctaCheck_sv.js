import Anthropic from '@anthropic-ai/sdk';

const CTA_SYSTEM_PROMPT_SV = `Du utvärderar uppmaningen (CTA) i ett B2B kallt säljmejl på svenska.
Bedöm hur troligt det är att uppmaningen genererar ett svar och bokar ett möte.

Returnera ENDAST ett JSON-objekt så här:
{
  "status": "good" | "warning" | "bad",
  "score_label": "Stark" | "Måttlig" | "Svag",
  "reason": "En mening förklaring på svenska"
}

Bedömningskriterier:

- GOOD: Något av följande:
  * Direkt, trygg mötesförfrågan med låg friktion. Exempel: "Skulle ett 15-minuterssamtal fungera den här veckan?" eller "Jag har 10 minuter tisdag eller torsdag — vilket passar bättre?"
  * En specifik, diagnostisk fråga om prospektets nuvarande situation som bjuder in till ett meningsfullt svar. Exempel: "Vad är det största hindret som förhindrar {{Company}} från att skala pipeline?" eller "Hur hanterar {{Company}} ALM och Treasury just nu — ett system eller flera verktyg?"
  * En svarbaserad CTA som kräver ett specifikt, genomtänkt svar — inte ett ja/nej-svar.

- WARNING: Något tveksam, vag eller alltför formell. Exempel: "Skulle det vara värt att utforska detta?" eller "Hör av dig om du vill prata någon gång."

- BAD: Ursäktande, ingen tydlig uppmaning, eller flera frågor. Exempel: "Ville bara dela detta ifall det är användbart" eller "Hoppas detta hjälper, hör av dig!" eller ställer två frågor samtidigt.

Huvudprincip: En stark CTA antingen bokar ett specifikt möte ELLER ställer en specifik diagnostisk fråga som kräver ett meningsfullt svar. Båda är lika giltiga i B2B kallt säljmejl.

Utvärdera bara CTA-meningen/-meningarna, inte hela mejlet.`;

export async function checkCtaStrengthSv(emailText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return { status: 'warning', score_label: 'Måttlig', reason: 'CTA-utvärdering ej tillgänglig (ingen API-nyckel).' };
  }

  if (!emailText || !String(emailText).trim()) {
    return { status: 'bad', score_label: 'Svag', reason: 'Inget mejlinnehåll att utvärdera.' };
  }

  try {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: CTA_SYSTEM_PROMPT_SV,
      messages: [{ role: 'user', content: `Utvärdera CTA i det här mejlet:\n\n${String(emailText).trim().slice(0, 8000)}` }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    if (!rawText.trim()) {
      return { status: 'warning', score_label: 'Måttlig', reason: 'CTA-utvärdering kunde inte slutföras.' };
    }

    let jsonStr = rawText.trim();
    const codeBlock = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlock) jsonStr = codeBlock[1].trim();
    const parsed = JSON.parse(jsonStr);

    const status = String(parsed.status || 'warning').toLowerCase();
    const validStatus = ['good', 'warning', 'bad'].includes(status) ? status : 'warning';
    const score_label = String(parsed.score_label || 'Måttlig').trim() || 'Måttlig';
    const reason = String(parsed.reason || 'Ingen förklaring tillgänglig.').trim();

    return { status: validStatus, score_label, reason };
  } catch (err) {
    console.error('[ctaCheck_sv] Claude error:', err.message);
    return { status: 'warning', score_label: 'Måttlig', reason: 'CTA-utvärdering misslyckades — försök igen.' };
  }
}
