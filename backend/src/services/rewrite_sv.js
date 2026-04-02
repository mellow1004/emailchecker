import Anthropic from '@anthropic-ai/sdk';

const REWRITE_SYSTEM_PROMPT_SV = `Du är en expert B2B kallt säljmejl-redaktör på svenska. Du får ett kallt säljmejl och ett specifikt problem som upptäckts av en e-postkontroll. Ditt jobb är att skriva om endast den del av e-posten som orsakar problemet — och hålla allt annat identiskt.

GRUNDREGLER:
- Ändra bara det som är nödvändigt för att åtgärda det flaggade problemet
- Behåll samma ton, struktur och personaliseringstoken ({{FirstName}}, {{Company}}, {{SenderName}}, {{CompanyWebsite}}, etc.)
- Skriv inte om hela e-posten om inte problemet påverkar hela e-posten
- Returnera endast den förbättrade e-posttexten, ingen kommentar eller förklaring
- Skriv alltid på svenska

ORD ATT ALDRIG ANVÄNDA I DIN OMSKRIVNING (spamutlösare):
gratis, garanti, garanterad, pris, kostnad, lösning, försäljning, jämför, riskfritt, klicka här, agera nu, begränsad tid, köp nu, beställ nu, snarast, omedelbart, fantastiskt, otroligt, revolutionerande, sömlöst, friktionsfritt, branschledande, världsklass, game changer, lås upp, snabb vinst, garanterade möten

ANVÄND DESSA SÄKRARE ALTERNATIV ISTÄLLET:
- pris / kostnad → investering / kommersiella villkor / budget
- lösning → metod / plattform / arbetssätt / kapabilitet
- gratis → kostnadsfritt / inkluderat
- garanti / garanterad → vad vi vanligtvis ser / typiskt sett
- försäljning → intäktsteam / kommersiellt team
- sömlöst / friktionsfritt → enkelt / välintegrerat
- branschledande → välrenommerat / allmänt använt
- omedelbart → från dag ett / direkt från start

FORMATERINGSREGLER — introducera aldrig dessa i din omskrivning:
- Inga utropstecken
- Inga punktlistor eller numrerade listor
- Inga emojis
- Högst ett frågetecken i hela e-posten
- Inga VERSALER (utom godkända akronymer: API, CRM, ALM, SaaS, B2B)
- Inga tankstreck (—)

KVALITETSREGLER:
- Lägg aldrig till kalender- eller bokningslänkar i omskrivningar
- Upprepa inte något meningsfullt ord mer än 2 gånger i den omskrivna e-posten
- Håll stycken under 35 ord
- KRITISKT — när du åtgärdar words_per_paragraph: förkorta stycket genom att ta bort onödiga ord. Dela ALDRIG upp ett stycke i två. Antalet stycken måste förbli exakt detsamma som i originale-posten.
- KRITISKT — styckeantal: e-postens brödtext ska ha exakt 4 stycken (räknar inte hälsningsraden "Hej {{FirstName}}," och inte avslutningsraderna). Lägg inte till eller ta bort stycken.
- Lägg inte till nya länkar eller domäner om inte kontrollen specifikt kräver det
- När du åtgärdar en saknad länk: lägg till {{CompanyWebsite}} på en ny rad i signaturen efter {{SenderName}}
- Ändra inte avslutning eller hälsning
- Håll det totala ordantalet mellan 100 och 200 ord
- Efter omskrivning, räkna brödstycken (exklusive hälsning och avslutning). Om antalet ändrats från originalet, åtgärda det innan du returnerar.`;

const DUPLICATE_WORDS_REWRITE_PROMPT_SV = `Du är en expert B2B kallt säljmejl-redaktör på svenska. Ditt jobb är att skriva om e-posten för att eliminera ordupprepning.

STRIKT REGEL: Inget meningsfullt ord får förekomma mer än 2 gånger i hela e-posten.

Innan du skriver om, skanna hela e-posten och identifiera varje ord som förekommer 3+ gånger. Skriv sedan om dessa meningar med synonymer.

REGLER:
- Ändra bara ord som upprepas 3+ gånger — lämna allt annat identiskt
- Behåll alla {{tokens}} intakta
- Behåll ton, struktur och betydelse oförändrade
- Lägg inte till nya meningar eller ta bort befintliga
- Returnera endast den omskrivna e-posten utan kommentar
- Inga tankstreck (—)

Efter omskrivning, verifiera att inget meningsfullt ord förekommer mer än två gånger. Om det fortfarande gör det, åtgärda det innan du returnerar.`;

export async function getRewriteSv(emailText, checkLabel, value, message, checkId, locale = 'SV') {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const systemPrompt = checkId === 'duplicate_words'
    ? DUPLICATE_WORDS_REWRITE_PROMPT_SV
    : REWRITE_SYSTEM_PROMPT_SV;

  const userContent = `E-post:
${emailText || '(tom)'}

Upptäckt problem:
Kontroll: ${checkLabel || 'Okänd'}
Problem: ${message || 'Ingen beskrivning'}
Värde: ${value != null ? String(value) : 'ej tillgängligt'}

Skriv om e-posten för att åtgärda endast detta specifika problem.`;

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText =
      response.content && response.content[0] && response.content[0].type === 'text'
        ? response.content[0].text
        : '';
    const stripEmDash = (str) => (typeof str === 'string' ? str.replace(/—/g, ',') : str);
    return stripEmDash((rawText || '').trim());
  } catch (err) {
    console.error('[rewrite_sv] Claude error:', err.message);
    throw err;
  }
}
