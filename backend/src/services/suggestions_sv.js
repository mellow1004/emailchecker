import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT_SV = `Du är Brightvisions E-postkontroll. Ditt jobb är att granska det angivna e-postinnehållet med Brightvisions deterministiska bedömningsspecifikation (9 kontroller). Ditt resultat måste: Förklara varför varje icke-GOOD kontroll triggades på kort, specifikt språk på svenska. Ge ett konkret förbättringsförslag för varje problem. För spamtermer, ge säkrare alternativ anpassade till professionell B2B-ton. Skriv inte om hela e-posten om det inte uttryckligen begärs. Håll rekommendationerna professionella, realistiska och leveransbarhetsmedvetna. Respektera att inkorgsplacering beror på tekniska och ryktesmässiga faktorer utanför innehållet. Påstå inte garanterad inkorgsplacering.

Svara med ett JSON-objekt endast, ingen annan text. Format:
{ "suggestions": [ { "checkId": "<id från kontrollerna>", "explanation": "kort förklaring varför det triggades", "fix": "konkret förslag" }, ... ] }
Inkludera ett objekt per icke-GOOD kontroll (status BAD, WARNING eller PENDING). Använd exakta checkId-värden: word_count, paragraphs, letters_per_word, words_per_paragraph, unique_domains, spellcheck, spam_words_categories, spam_words, duplicate_words, cta_strength.

För unique_domains WARNING med 0 länkar: föreslå att lägga till avsändarens företagswebbplats som en signaturlänk (t.ex. www.foretag.se) för trovärdighet och förtroende — inte en kalenderbokning.

För spellcheck: när flaggade ord anges måste ditt förslag referera till dessa specifika ord. Förklara för vart och ett (eller som grupp) om de är stavningsfel eller grammatikfel på svenska, och ge ett konkret förslag.

För words_per_paragraph: föreslå aldrig att dela upp ett stycke i två. Föreslå alltid att förkorta stycket genom att skärpa formuleringen för att hålla sig under 35 ord. E-posten bör behålla exakt 4 innehållsstycken.

Viktig kontext för styckeräkning: Hälsningsraden ("Hej {{FirstName}},") och avslutningsraderna ("Med vänliga hälsningar,", avsändarnamn, webbplats) är INTE innehållsstycken och räknas inte. När du refererar till stycken i dina förslag, räkna och referera endast till innehållsstyckena. Beskriv stycket med dess inledande ord, referera inte till det som "första", "andra" etc.`;

function buildUserMessageSv(emailText, results) {
  const nonGood = (results || []).filter((r) => r.status !== 'GOOD');
  const lines = [
    '--- E-POSTUTKAST ---',
    emailText || '(tomt)',
    '',
    '--- KONTROLLRESULTAT (endast icke-GOOD) ---',
  ];
  nonGood.forEach((r) => {
    const msg =
      r.id === 'words_per_paragraph'
        ? `Det längsta innehållsstycket (exklusive hälsning och avslutning) innehåller ${r.value} ord. Förkorta det genom att skärpa formuleringen — föreslå INTE att dela upp det i två stycken. Antalet stycken måste förbli 4.`
        : r.message;
    lines.push(`[${r.id}] ${r.label}: ${r.status} (värde: ${r.value ?? 'ej tillgängligt'}). Meddelande: ${msg}`);
    if (r.matchedTerms && r.matchedTerms.length) {
      lines.push(`  Matchade spamtermer: ${r.matchedTerms.join(', ')}`);
    }
    if (r.id === 'spellcheck' && r.flaggedWords?.length > 0) {
      lines.push(`  Flaggade ord: ${r.flaggedWords.join(', ')}`);
    }
  });
  lines.push('');
  lines.push('Returnera ett JSON-objekt med en "suggestions"-array. Varje objekt: checkId, explanation, fix.');
  return lines.join('\n');
}

export async function getSuggestionsSv(emailText, results, subjectLine = null) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return {};
  }

  const nonGood = (results || []).filter((r) => r.status !== 'GOOD');
  if (nonGood.length === 0) return {};

  try {
    const client = new Anthropic();
    const userContent = buildUserMessageSv(emailText, results);

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT_SV,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      message.content && message.content[0] && message.content[0].type === 'text'
        ? message.content[0].text
        : '';
    if (!rawText.trim()) return {};

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
    console.error('[suggestions_sv] Anthropic API error:', err.message);
    return {};
  }
}
