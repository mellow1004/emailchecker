# Brightvision Email Checker — Project Status

**Last updated:** 2026-03-10

---

## Current state

The app is a working B2B cold email checker with two tabs: **Check Draft** (paste draft → run 9 checks → score + suggestions) and **Generate & Score** (paste URL → Claude generates 3 drafts → each auto-scored). Both tabs use the same 9 deterministic checks and config-driven thresholds. The backend uses Claude (Anthropic) for suggestions (Tab 1), draft generation (Tab 2), ALL CAPS validation, and spellcheck proper-noun filtering. Spellcheck uses the free LanguageTool API with rate limiting for Tab 2.

---

## Features built

### Tab 1 — Check Draft
- Textarea for email draft with live character counter (N/4000).
- US/UK spelling toggle (sent as `locale`: `en-US` or `en-GB`).
- “Run email check” button (disabled when draft empty).
- POST to `/api/check` with `draft` and `locale`.
- Results panel: overall score (0–100%), level (good/warning/bad), all 9 checks with status chips.
- Expand/collapse per check with value, message, and (for spam words) flagged terms + “Use instead” replacements from config.
- Claude “Suggestion” per non-GOOD check (explanation + fix).
- Content-only disclaimer at bottom.
- Layout: editor left, results right; header/hero, teal/neutral design.

### Tab 2 — Generate & Score
- URL input and “Generate emails” button (disabled when URL empty or when `needsContext` and context empty).
- If fetched page content &lt; 500 chars and no manual context: backend returns `needsContext: true`; UI shows “Add context” textarea. On second submit, URL content + manual context are sent to Claude.
- Backend fetches URL with axios, sends content to Claude with a long system prompt (structure, deliverability rules, EXAMPLES, sign-off, personalization tokens).
- Three drafts returned as JSON (`subject`, `body`, `signoff`). Each draft is run through `runChecks()` with a 1s delay between drafts for LanguageTool rate limiting.
- Right panel: 3 draft cards (subject, body, signoff, score chip, expand “Show check results” with full check list; spam words show “Flagged terms” + “Use instead” when replacements exist).
- “Copy email” button per draft (subject + body + signoff).

### Backend — 9 checks (deterministic)
1. **Word count** — `thresholds.json` (e.g. 100–200 good, 201–250 warning).
2. **Paragraphs** — Lines as paragraphs; greeting/sign-off lines excluded (e.g. “Hi …”, “Best regards,”). 3–5 = good, 6 = warning, 7+ = bad.
3. **Letters per word** — Average word length; `good_max` (e.g. 7).
4. **Words per paragraph** — Max words in any content paragraph; 1–35 good, 36–49 warning, 50+ bad.
5. **Unique domains** — URLs from raw text via regex; tldts for domain parsing. `{{CalendarLink}}` in raw text counts as 1 link when there are 0 URLs. 0 = warning, 1–2 = good, 3+ = bad.
6. **Spellcheck** — LanguageTool API (en-US/en-GB). Matches filtered: punctuation/whitespace/&lt;2 chars skipped; then Claude classifies remaining as PROPER_NOUN vs SPELLING_ERROR; only SPELLING_ERROR count. 0 = good, 1–2 = warning, 3+ = bad.
7. **Spam words categories** — Terms from `spamWords.json`, exclamation, ALL CAPS (length ≤5 skip; allowlist; 6+ chars → Claude SPAM/LEGITIMATE), bullets, multiple questions, emojis.
8. **Spam words** — Term count from `spamWords.json`; result includes `matchedTerms` and `matchedReplacements` (from config `replacements` or `replacement`) for UI.
9. **Duplicate words** — Word frequency; stop words and tokens &lt; min length excluded; threshold (e.g. 3) for “duplicate” count.

**Personalization tokens** — All `{{...}}` placeholders (e.g. `{{FirstName}}`, `{{Company}}`, `{{CalendarLink}}`, `{{SenderName}}`) are stripped before running checks so they never affect word count, paragraphs, spellcheck, duplicate words, or spam.

### Backend — APIs
- **POST /api/check** — Body: `draft` (or `emailText`/`text`), `locale` (or `spelling`). Returns `{ score, level, results, suggestions }`.
- **POST /api/generate** — Body: `url`, optional `context` (or `additionalContext`), optional `locale`. Returns `{ drafts: [{ subject, body, signoff, score, level, results }] }` or `{ needsContext: true }` when page content &lt; 500 chars and no context.

### Config
- **config/thresholds.json** — Bands and messages for all 9 checks; scoring levels (e.g. good ≥75, warning ≥50).
- **config/spamWords.json** — `terms[]` with `term`, `tier`, `category`, `replacement`, optional `replacements[]`.
- **config/capsAllowlist.json** — ALL CAPS allowlist (e.g. API, CRM).
- **config/stopWords.json** — Stop words for duplicate-word check.

### Claude usage
- **Tab 1 suggestions** — `suggestions.js`: system prompt + email + non-GOOD results → JSON `{ suggestions: [{ checkId, explanation, fix }] }`. Model: `claude-sonnet-4-6`.
- **Tab 2 generation** — `claude.js`: long system prompt (requirements, structure, deliverability, medium-risk words, EXAMPLES, sign-off “Best regards,\n{{SenderName}}”, personalization tokens). User message: page content. Response: JSON array of 3 `{ subject, body, signoff }`.
- **ALL CAPS** — `capsValidation.js`: 6+ char ALL CAPS words not in allowlist → Claude LEGITIMATE vs SPAM; only SPAM trigger category.
- **Spellcheck** — `spellcheck.js`: LanguageTool matches → words sent to Claude PROPER_NOUN vs SPELLING_ERROR; only SPELLING_ERROR kept. Debug logs: words sent, raw response, verdict per word, filtered out vs kept.

---

## Bugs fixed (historical)

- Paragraph count wrong when single line breaks: paragraph logic now splits on `\n`, excludes greeting/sign-off lines, and has sentence-boundary fallback when no newlines.
- Spam words detail missing: checker returns `matchedTerms` and `matchedReplacements`; UI shows “Flagged terms” and “Use instead”.
- Frontend not reaching backend: Vite proxy set to `http://127.0.0.1:3000`; backend bound to `127.0.0.1`; `express.json()` confirmed.
- Claude model 404: model name updated to `claude-sonnet-4-6`.
- Personalization tokens affecting score: `stripPersonalizationTokens()` applied to text before all checks; `{{CalendarLink}}` still counted for unique_domains via raw text check.
- Spellcheck false positives for brands: LanguageTool matches first filtered by `shouldSkipMatch` (empty/whitespace/punctuation/&lt;2 chars), then Claude filters PROPER_NOUN; punctuation-only matches not counted.
- EADDRINUSE on 3000: documented kill and restart; dev uses `nodemon` for auto-restart.

---

## Decisions made

- **Scoring** — Score = (number of GOOD checks / 9) × 100, rounded. Levels from `thresholds.json` (e.g. good ≥75, warning ≥50).
- **Paragraphs** — Greeting and sign-off lines excluded from count so “body” paragraphs (e.g. 4) match spec.
- **Unique domains** — 0 links = WARNING (not BAD); 1–2 = GOOD; 3+ = BAD. `{{CalendarLink}}` in body counts as one link when there are no URLs.
- **Words per paragraph** — 1–35 GOOD, 36–49 WARNING, 50+ BAD (relaxed from stricter earlier threshold).
- **Paragraph bands** — 3–5 GOOD, 6 WARNING, 7+ BAD (5 is good, not warning).
- **Spam list** — Removed `call`, `credit`, `offer` from `spamWords.json` as legitimate B2B terms.
- **Sign-off** — Generation prompt: always “Best regards,” then `{{SenderName}}` on next line; no “Kind regards” etc.
- **Calendar link** — In CTA (paragraph 4), e.g. “Book a time here: {{CalendarLink}}”, not a separate line after sign-off.
- **Tab 2 rate limiting** — 1s delay between drafts when running checks (LanguageTool).
- **Config path** — Backend loads config from project root `config/` (path relative to `checker.js` → `../../../config`).

---

## Pending tasks / possible next steps

- Remove or gate spellcheck debug `console.log`s in `spellcheck.js` for production.
- Verify Claude spellcheck classification for brand names (e.g. bunq, Chetwood) if still misclassified; debug logs added for this.
- Consider adding `replacements` to high-tier terms in `spamWords.json` where missing for consistent “Use instead” in UI.
- Optional: Tab 2 pass `locale` from frontend (e.g. US/UK toggle) if desired for generated draft spelling.
- Optional: Auth, rate limits, persistence (out of scope per SPEC).

---

## Technical details for development

### Run locally
- **Backend:** `cd backend && npm run dev` (nodemon) or `npm start`. Default `http://127.0.0.1:3000`.
- **Frontend:** `cd frontend && npm run dev`. Vite on port 5173, proxies `/api` to backend.
- **Env:** `backend/.env` must include `ANTHROPIC_API_KEY` for Claude (suggestions, generation, caps validation, spellcheck classification).

### Project layout
- **Root:** `SPEC.md`, `PROJECT_STATUS.md`, `config/` (thresholds, spamWords, stopWords, capsAllowlist).
- **frontend:** Vite + React; `src/App.jsx`, `src/components/Tab1CheckDraft.jsx`, `Tab2GenerateScore.jsx`, `src/styles/index.css`; entry `index.html` → `main.jsx`.
- **backend:** Express, ESM; `src/index.js` (app, routes), `src/routes/check.js`, `generate.js`; `src/services/checker.js`, `suggestions.js`, `claude.js`, `fetchPage.js`, `capsValidation.js`, `spellcheck.js`; `src/config/loadConfig.js` (reads from root `config/`).

### Check flow (Tab 1)
1. Request: `draft`, `locale`.
2. `runChecks(draft, null, { locale })`: strip HTML → strip personalization tokens → run 9 checks (async for spellcheck and spam_words_categories).
3. `getSuggestions(draft, results)` → Claude → `payload.suggestions` keyed by check `id`.
4. Response: `score`, `level`, `results`, `suggestions`.

### Generate flow (Tab 2)
1. Request: `url`, optional `context`, optional `locale`.
2. `fetchPageContent(url)` (axios, strip HTML, trim).
3. If content &lt; 500 and no `context` → return `{ needsContext: true }`.
4. Else: `generateDrafts(contentForClaude)` → Claude → 3 drafts. For each draft: `runChecks(fullText, null, { locale })`, then 1s delay before next (LanguageTool).
5. Response: `{ drafts }` with `subject`, `body`, `signoff`, `score`, `level`, `results` (each result can have `matchedTerms`, `matchedReplacements`).

### Personalization tokens
- Stripped in checker so they don’t affect: word count, paragraphs, letters/words per paragraph, spellcheck (LanguageTool sees text without tokens), spam terms, duplicate words.
- `{{CalendarLink}}` is still detected in **raw** text for unique_domains so 0 URLs + placeholder = 1 link (warning, not bad).

### Spam words response shape
- Check result may include `matchedTerms: string[]` and `matchedReplacements: { term, replacements }[]`. UI shows “Flagged terms” and “Use instead: term → alt1, alt2” from these when present.
