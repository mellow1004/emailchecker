import Anthropic from '@anthropic-ai/sdk';
import { runChecks } from './checker.js';

const GENERATE_SYSTEM_PROMPT_SV = `Du är en expert B2B kallt säljmejl-copywriter specialiserad på höglevererbar, högkonverterande outreach för SaaS och B2B-teknikföretag. Du skriver alltid på svenska.

EXEMPEL PÅ HÖGKVALITATIVA MEJL (betyg 90+) — använd dessa som riktmärke:

---
EXEMPEL 1 — Betyg 90
Varför detta får högt betyg: Specifik smärtpunkts-hook, exakt 4 stycken, namngiven social proof med konkreta resultat, en mjuk CTA-fråga, noll spamord, samtalston, 100-200 ord.

Ämne: ALM och Treasury-infrastruktur för {{Company}}

Hej {{FirstName}},

Små och medelstora banker når ofta en punkt där ALM och Treasury-infrastrukturen blir fragmenterad. Separata verktyg, Excel-ark, legacy-uppgraderingar och växande integreringsarbete skapar operationell friktion när produkter och rapporteringskrav växer.

MORS kombinerar regulatorisk ALM och modern Treasury Management på en enda plattform. Banker adopterar den modul de behöver direkt och expanderar över tid utan komplexitet på enterprisenivå som stör verksamheten.

Kunder som bunq, Monzo, Chetwood och Oxbury kör båda funktionerna på MORS, vilket minskar integreringsarbete och uppfyller regulatoriska rapporteringskrav inom en enhetlig grund.

När skulle ett 15-minuterssamtal fungera för att gå igenom hur {{Company}} strukturerar det här området just nu, {{FirstName}}?

Med vänliga hälsningar,
{{SenderName}}
{{CompanyWebsite}}
---

VAD SOM GÖR DESSA MEJL TILL 90+:
1. Hook är specifik och igenkännbar — mottagaren känner igen sin situation direkt
2. Produktstycket förklarar nyttan tydligt utan buzzwords eller hype
3. Social proof namnger riktiga företag och inkluderar minst ett konkret resultat
4. CTA är exakt en fråga — mjuk, lågfriktions, och refererar till {{Company}} när möjligt
5. Noll spamord, noll utropstecken, noll punktlistor, noll emojis, noll tankstreck (—)
6. Varje meningsfullt ord förekommer maximalt 2 gånger i hela mejlet
7. Ordantal 100-200, exakt 4 stycken efter hälsning

VAD SOM GÖR MEJL UNDER 70:
1. Punktlistor — signalerar massutskick direkt
2. Flera länkar från olika domäner — triggar spamfilter
3. Spamord som: gratis, garanti, pris, lösning, kostnad, försäljning
4. För kort (under 100 ord) — känns ofullständigt
5. Flera frågetecken — känns påträngande
6. Upprepade ord — att använda "banker" eller "rapportering" 4+ gånger signalerar slarvig copy
7. Generisk hook — att öppna med "Jag ville höra av mig" signalerar automation

KÄRNKRAV:
- Totalt ordantal: minimum 120 ord, maximum 180 ord
- Styckestruktur: Exakt 4 stycken i brödtexten — varken mer eller mindre
- Styckeslängd: Maximum 35 ord per stycke
- Ton: Trygg, professionell, samtalslik (inte säljig)
- Ingen överdriven entusiasm eller brådskespråk
- Varje utkast måste vara skrivet för att få 85%+ på Brightvisions E-postkontroll
- Inga tankstreck (—) någonstans i mejlet

STRUKTUR:
Stycke 1: Hook/smärtpunkt som skapar nyfikenhet och relevans
Stycke 2: Lösningsbeskrivning med specifikt värdeerbjudande
Stycke 3: Social proof med namngivna företag ELLER nyckeldifferentiator
Stycke 4: Tydlig, lågfriktionstryck CTA (mötes-/demoförfrågan) — endast en fråga, inga länkar

FÖRBJUDNA ORD — använd aldrig dessa:
- gratis → kostnadsfritt / inkluderat
- garanti / garanterad → vad vi vanligtvis ser / typiskt sett
- riskfritt → lågt åtagande
- pris → investering / prissättning / kommersiella villkor
- kostnad → investering / budget
- lösning → metod / plattform / arbetssätt / kapabilitet
- försäljning → intäktsteam / kommersiellt team
- jämför → utvärdera / bedöm
- agera nu → värt att utforska?
- begränsad tid → öppen för en snabb titt det här kvartalet?
- köp nu / beställ nu → använd aldrig i B2B kallt säljmejl
- snarast → när det passar
- omedelbart → från dag ett / direkt från start
- fantastiskt → starkt / tydligt / meningsfullt
- otroligt → märkbart / betydande / mätbart
- revolutionerande → nytt arbetssätt / uppdaterad metod
- sömlöst / friktionsfritt → enkelt / välintegrerat
- branschledande → välrenommerat / allmänt använt
- världsklass → välrenommerat / allmänt antaget
- game changer → meningsfull förbättring
- lås upp → utforska / aktivera / möjliggör
- snabb vinst → tidigt resultat
- bara för att kolla läget → följer upp angående [specifikt ämne]
- hoppas detta hittar dig väl → (ta bort helt)
- nästa nivå → starkare / mer effektivt

REGEL FÖR DUBBLETTORD — KRITISK:
- Räkna varje meningsfullt ord i ditt utkast
- Inget meningsfullt ord får förekomma 3 eller fler gånger
- Vanliga problem att bevaka: "team", "företag", "arbetsflöde", "hantera", "plattform", "process", "bygga"

CTA-REGLER — följ dessa strikt:
- Endast en fråga — aldrig två frågor i en CTA
- Använd aldrig "Jag skulle gärna", "Jag älskar att", "tveka inte" — låter tveksamt
- Använd trygg, direkt formulering
- Referera till {{Company}} i CTA när möjligt
- Inga kalender- eller bokningslänkar

CTA-STILREGLER — varje av de 3 utkasten måste använda en annan stil:

Utkast 1 — Specifik dag/tid:
"Skulle tisdag eller torsdag fungera för ett 15-minuterssamtal om hur detta kan tillämpas på {{Company}}?"

Utkast 2 — Diagnostisk fråga om nuläget:
"Hur hanterar {{Company}} just nu [relevant arbetsflöde] — ett system eller flera verktyg sammansatta?"

Utkast 3 — Resultat/flaskhals-fråga:
"Vad är det största hindret som förhindrar {{Company}} från att [uppnå relevant resultat] just nu?"

AVSLUTNING — varje mejl måste avslutas med:
Med vänliga hälsningar,
{{SenderName}}
{{CompanyWebsite}}`;

const stripEmDash = (str) => (typeof str === 'string' ? str.replace(/—/g, ',') : str);

export async function generateDraftsSv(pageContent, options = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const targetIndustry = options.targetIndustry || '';
  const targetRole = options.targetRole || '';
  const context = options.context || '';
  const prospectContent = options.prospectContent || '';
  const locale = 'SV';

  const prospectBlock = prospectContent
    ? `Prospektföretagets sidinnehåll (anpassa mejlet till deras specifika kontext):\n${prospectContent.slice(0, 15000)}\n\n`
    : '';

  const client = new Anthropic();
  const userContent =
    (options.prefix || '') +
    `Stavningsläge: Svenska (sv)
Målbransch: ${targetIndustry || 'ej angiven'}
Målroll: ${targetRole || 'ej angiven'}
Ytterligare kontext: ${context || 'ingen'}

${prospectBlock}Företagssidans innehåll:
${(pageContent || '(Inget innehåll tillgängligt)').slice(0, 20000)}

Returnera endast en JSON-array med exakt 3 objekt, varje med "subject", "body" och "signoff". Ingen annan text eller markdown.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: GENERATE_SYSTEM_PROMPT_SV,
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
  const arr = Array.isArray(parsed) ? parsed : [];

  const scoredDrafts = await Promise.all(
    arr.slice(0, 3).map(async (d) => ({
      subject: stripEmDash(typeof d.subject === 'string' ? d.subject.trim() : ''),
      body: stripEmDash(typeof d.body === 'string' ? d.body.trim() : ''),
      signoff: stripEmDash(typeof d.signoff === 'string' ? d.signoff.trim() : ''),
    }))
  );

  const finalDrafts = [];
  for (const draft of scoredDrafts) {
    const fullText = `${draft.subject}\n\n${draft.body}\n\n${draft.signoff}`;
    const checked = await runChecks(fullText, null, { locale: 'sv', language: 'SV' });

    const nonGoodChecks = checked.results.filter(r => r.status !== 'GOOD');
    const onlyCTAFailing = nonGoodChecks.length === 1 && nonGoodChecks[0].id === 'cta_strength';

    if (checked.score >= 85 && !onlyCTAFailing) {
      finalDrafts.push(draft);
      continue;
    }

    if (onlyCTAFailing) {
      const ctaFixContent = `Här är ett B2B kallt säljmejl på svenska. CTA är svag — skriv om ENDAST den sista meningen före avslutningen med en starkare CTA. Använd en av dessa stilar:
- Specifik dag/tid: "Skulle tisdag eller torsdag fungera för ett 15-minuterssamtal om hur detta kan tillämpas på {{Company}}?"
- Diagnostisk fråga: "Hur hanterar {{Company}} just nu [relevant ämne från mejlet] — ett system eller flera verktyg?"
- Resultatfråga: "Vad är det största hindret som förhindrar {{Company}} från att [relevant resultat från mejlet] just nu?"

Returnera hela mejlet med bara CTA-meningen ändrad. Ingen kommentar.

Mejl:
${draft.body}

Avslutning:
${draft.signoff}`;

      const ctaFixMessage = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: GENERATE_SYSTEM_PROMPT_SV,
        messages: [{ role: 'user', content: ctaFixContent }],
      });

      const ctaFixRaw = ctaFixMessage.content?.[0]?.type === 'text' ? ctaFixMessage.content[0].text.trim() : '';
      if (ctaFixRaw) {
        finalDrafts.push({
          subject: draft.subject,
          body: stripEmDash(ctaFixRaw),
          signoff: draft.signoff,
        });
        continue;
      }
      finalDrafts.push(draft);
      continue;
    }

    const failedChecks = checked.results
      .filter(r => r.status !== 'GOOD')
      .map(r => `- ${r.label}: ${r.message}${r.matchedTerms ? ' (flaggade: ' + r.matchedTerms.join(', ') + ')' : ''}`)
      .join('\n');

    const retryContent = userContent + `\n\nVIKTIGT: Ditt tidigare utkast fick ${checked.score}% — under kravet på 85%. Åtgärda dessa specifika problem och skriv om utkastet:\n${failedChecks}\n\nReturnera endast 1 objekt (inte en array) med "subject", "body", "signoff". Ingen annan text.`;

    const retryMessage = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: GENERATE_SYSTEM_PROMPT_SV,
      messages: [{ role: 'user', content: retryContent }],
    });

    const retryRaw = retryMessage.content?.[0]?.type === 'text' ? retryMessage.content[0].text.trim() : '';
    if (retryRaw) {
      try {
        let retryJson = retryRaw;
        const cb = retryRaw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (cb) retryJson = cb[1].trim();
        const retried = JSON.parse(retryJson);
        const single = Array.isArray(retried) ? retried[0] : retried;
        if (single?.body) {
          finalDrafts.push({
            subject: stripEmDash(typeof single.subject === 'string' ? single.subject.trim() : draft.subject),
            body: stripEmDash(typeof single.body === 'string' ? single.body.trim() : draft.body),
            signoff: stripEmDash(typeof single.signoff === 'string' ? single.signoff.trim() : draft.signoff),
          });
          continue;
        }
      } catch {}
    }
    finalDrafts.push(draft);
  }

  return finalDrafts;
}
