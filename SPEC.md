# Brightvision Email Checker — Product Specification

## Overview

Brightvision Email Checker is a B2B cold email quality tool with a single interface containing two tabs:

- **Tab 1 — Check Draft:** Paste an email draft, run 9 deterministic checks, see score and recommendations.
- **Tab 2 — Generate & Score:** Paste a company URL; Claude generates 3 email drafts; each draft is auto-scored against the same 9 checks.

---

## Tab 1: Check Draft

**Flow**

1. User pastes an email draft into a text area.
2. User triggers “Run checks” (or equivalent).
3. Backend runs 9 deterministic checks using config from `config/`.
4. UI shows:
   - Overall score (0–100) and level (good / warning / bad).
   - Per-check results and recommendations.

**Input:** Raw email body text (plain or HTML; exact format TBD).

**Output:** Score, level, and a list of check results with messages from `config/thresholds.json`.

---

## Tab 2: Generate & Score

**Flow**

1. User pastes a company URL (e.g. `https://example.com`).
2. User triggers “Generate drafts” (or equivalent).
3. Backend calls Claude with the URL (and optionally scraped/context data) to generate 3 distinct email drafts.
4. Each draft is run through the same 9 deterministic checks.
5. UI shows all 3 drafts with their scores and recommendations (e.g. side-by-side or stacked).

**Input:** Company URL (string).

**Output:** Three email drafts plus, for each draft, the same score/level/check results as in Tab 1.

---

## The 9 Deterministic Checks

All checks are driven by config under `config/`:

| # | Check (key)           | Config / data source              | Purpose |
|---|------------------------|-----------------------------------|---------|
| 1 | Word count             | `thresholds.json`                 | Length in recommended range (e.g. 100–200 words). |
| 2 | Paragraphs             | `thresholds.json`                 | Paragraph count (e.g. 3–4 ideal). |
| 3 | Letters per word       | `thresholds.json`                | Average word length / readability. |
| 4 | Words per paragraph   | `thresholds.json`                | Paragraph size / scannability. |
| 5 | Unique domains linked | `thresholds.json`                | Number of distinct link domains (e.g. 1–2 good). |
| 6 | Spellcheck             | `thresholds.json` (e.g. language) | Spelling errors (e.g. en-US / en-GB). |
| 7 | Spam words categories  | `thresholds.json`, `spamWords.json`, `capsAllowlist.json` | Banned terms, urgency, exclamations, ALL CAPS, bullets, questions, emojis. |
| 8 | Spam words             | `spamWords.json`, `thresholds.json` | Flagged terms count. |
| 9 | Duplicate words        | `thresholds.json`, `stopWords.json` | Repetition above threshold. |

Scoring (e.g. points per check, good/warning/bad bands) is defined in `config/thresholds.json`. No check logic is specified here; implementation lives in backend/frontend.

---

## Config (existing)

- `config/spamWords.json` — Flagged terms and categories.
- `config/thresholds.json` — All scoring thresholds and messages for the 9 checks.
- `config/capsAllowlist.json` — ALL CAPS allowlist (e.g. API, CRM, B2B).
- `config/stopWords.json` — Stop words for duplicate-word detection.

---

## Architecture (skeleton)

- **Frontend:** Single-page app with two tabs; calls backend for “check draft” and “generate & score”.
- **Backend:** Serves both endpoints; runs 9 checks; integrates Claude for Tab 2 draft generation.
- **Config:** Read at runtime from `config/` (no logic in SPEC; implementation decides how to load).

---

## Out of scope (for this spec)

- Auth, billing, rate limits.
- Storing drafts or company URLs.
- Exact UI/UX details (layouts, copy).
- Email sending or delivery.

---

*Document version: 1.0 — skeleton only; no implementation logic.*
