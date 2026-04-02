import { useState, useCallback } from 'react';

const CHAR_LIMIT = 4000;

const LEVEL_MESSAGES = {
  good: "Content quality looks strong. You're in a good place to send.",
  warning: 'Content is close. A few adjustments will reduce risk.',
  bad: 'Content needs revision. Address the items below and test again.',
};

const LEVEL_MESSAGES_SV = {
  good: 'Innehållskvaliteten ser stark ut. Du är redo att skicka.',
  warning: 'Innehållet är nära. Några justeringar minskar risken.',
  bad: 'Innehållet behöver revideras. Åtgärda punkterna nedan och testa igen.',
};

const UI_TEXT = {
  EN: {
    description: 'Paste your cold email draft and get a full breakdown — scored, flagged, and improved.',
    subjectLabel: 'Subject line',
    subjectPlaceholder: 'e.g. Treasury infrastructure for {{Company}}',
    subjectHint: 'Optional — included in subject line analysis',
    draftLabel: 'Email draft',
    draftPlaceholder: 'Paste your cold email draft here...',
    runBtn: 'Review email',
    runningBtn: 'Analysing...',
    spellingLabel: 'Spelling:',
    emptyTitle: 'Your review will appear here',
    emptyList: ['Overall quality score', 'Breakdown across 9 checks', 'Flagged wording and weak spots', 'Practical improvement suggestions', 'Stronger revised version'],
    loadingText: 'Running checks…',
    subjectLineTitle: 'Subject line',
    coherenceTitle: 'Subject line + email coherence',
    flaggedTerms: 'Flagged terms:',
    useInstead: 'Use instead:',
    flaggedWords: 'Flagged words:',
    repeatedWords: 'Repeated words:',
    suggestion: 'Suggestion',
    rewriteBtn: 'Rewrite suggestion',
    rewritingBtn: 'Rewriting…',
    rewriteError: 'Something went wrong — try again',
    rewriteLabel: 'Suggested rewrite:',
    copyRewrite: 'Copy rewrite',
    disclaimer: 'This tool evaluates content and structure only. It does not guarantee deliverability or compliance with your provider or local laws.',
    value: 'Value:',
    levelGood: 'Good',
    levelWarning: 'Warning',
    levelBad: 'Needs work',
  },
  SV: {
    description: 'Klistra in ditt kalla säljmejl och få en fullständig genomgång — betygsatt, flaggad och förbättrad.',
    subjectLabel: 'Ämnesrad',
    subjectPlaceholder: 't.ex. Treasury-infrastruktur för {{Company}}',
    subjectHint: 'Valfritt — inkluderas i ämnesradsanalys',
    draftLabel: 'Mejlutkast',
    draftPlaceholder: 'Klistra in ditt kalla säljmejl här...',
    runBtn: 'Granska mejl',
    runningBtn: 'Analyserar...',
    spellingLabel: 'Stavning:',
    emptyTitle: 'Din granskning visas här',
    emptyList: ['Övergripande kvalitetsbetyg', 'Genomgång av 9 kontroller', 'Flaggad formulering och svaga punkter', 'Praktiska förbättringsförslag', 'Starkare reviderad version'],
    loadingText: 'Kör kontroller…',
    subjectLineTitle: 'Ämnesrad',
    coherenceTitle: 'Ämnesrad + mejlkoherens',
    flaggedTerms: 'Flaggade termer:',
    useInstead: 'Använd istället:',
    flaggedWords: 'Flaggade ord:',
    repeatedWords: 'Upprepade ord:',
    suggestion: 'Förslag',
    rewriteBtn: 'Omskriv förslag',
    rewritingBtn: 'Skriver om…',
    rewriteError: 'Något gick fel — försök igen',
    rewriteLabel: 'Föreslaget omskrivning:',
    copyRewrite: 'Kopiera omskrivning',
    disclaimer: 'Det här verktyget utvärderar innehåll och struktur. Det garanterar inte leveransbarhet eller efterlevnad av din leverantörs eller lokala lagar.',
    value: 'Värde:',
    levelGood: 'Bra',
    levelWarning: 'Varning',
    levelBad: 'Behöver arbete',
  },
};

export default function Tab1CheckDraft({ language = 'EN' }) {
  const [subjectLine, setSubjectLine] = useState('');
  const [draft, setDraft] = useState('');
  const [spelling, setSpelling] = useState('US'); // US | UK
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [expandedSubjectIds, setExpandedSubjectIds] = useState(new Set());
  const [rewriteLoading, setRewriteLoading] = useState({});
  const [rewriteResult, setRewriteResult] = useState({});
  const [rewriteError, setRewriteError] = useState({});
  const t = UI_TEXT[language] || UI_TEXT.EN;
  const levelMessages = language === 'SV' ? LEVEL_MESSAGES_SV : LEVEL_MESSAGES;

  const charCount = draft.length;
  const overLimit = charCount > CHAR_LIMIT;
  const canSubmit = draft.trim().length > 0 && !overLimit;

  const runCheck = useCallback(async () => {
    setError(null);
    setLoading(true);
    setResults(null);
    setExpandedIds(new Set());
    setExpandedSubjectIds(new Set());
    setRewriteLoading({});
    setRewriteResult({});
    setRewriteError({});
    try {
      const res = await fetch('/api/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: draft.trim(),
          locale: language === 'SV' ? 'sv' : spelling === 'UK' ? 'en-GB' : 'en-US',
          language,
          ...(subjectLine.trim() ? { subjectLine: subjectLine.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(res.statusText || 'Check failed');
      const data = await res.json();
      setResults(data);
      // Auto-expand failed or pending checks so details are visible
      const toExpand = (data.results || []).filter(
        (r) => r.status === 'BAD' || r.status === 'WARNING' || r.status === 'PENDING'
      );
      setExpandedIds(new Set(toExpand.map((r) => r.id)));
      if (data.subjectLine && data.subjectLine.checks) {
        const subjectToExpand = (data.subjectLine.checks || []).filter(
          (c) => c.status === 'BAD' || c.status === 'WARNING'
        );
        setExpandedSubjectIds(new Set(subjectToExpand.map((c) => c.id)));
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [draft, subjectLine, spelling]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandedSubject = (id) => {
    setExpandedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRewrite = async (r) => {
    setRewriteLoading((prev) => ({ ...prev, [r.id]: true }));
    setRewriteError((prev) => ({ ...prev, [r.id]: false }));
    setRewriteResult((prev) => ({ ...prev, [r.id]: null }));
    try {
      const res = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailText: draft,
          checkId: r.id,
          checkLabel: r.label,
          value: r.value,
          message: r.message,
          language,
          ...(r.id === 'spellcheck' ? { locale: spelling } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rewrite failed');
      setRewriteResult((prev) => ({ ...prev, [r.id]: data.rewrite || '' }));
    } catch {
      setRewriteError((prev) => ({ ...prev, [r.id]: true }));
    } finally {
      setRewriteLoading((prev) => ({ ...prev, [r.id]: false }));
    }
  };

  const handleDraftChange = (e) => {
    const v = e.target.value;
    if (v.length <= CHAR_LIMIT) setDraft(v);
  };

  return (
    <div className="tab-content">
      <div className="tab-layout">
        <div className="tab-layout-left">
          <section className="input-card">
            <p className="input-card-description">
              {t.description}
            </p>

            <div className="input-field-group">
              <label className="input-label" htmlFor="subject-line">
                {t.subjectLabel}
              </label>
              <input
                id="subject-line"
                type="text"
                className="input-field"
                placeholder={t.subjectPlaceholder}
                value={subjectLine}
                onChange={(e) => setSubjectLine(e.target.value)}
              />
              <span className="input-hint">{t.subjectHint}</span>
            </div>

            <div className="input-field-group">
              <label className="input-label" htmlFor="draft">
                {t.draftLabel}
              </label>
              <textarea
                id="draft"
                className="input-field input-textarea"
                placeholder={t.draftPlaceholder}
                value={draft}
                onChange={handleDraftChange}
                rows={20}
                maxLength={CHAR_LIMIT}
              />
              <div className="input-footer">
                <span className={`input-counter ${overLimit ? 'tab1-char-count--over' : ''}`}>
                  {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
                </span>
                {language !== 'SV' && (
                  <div className="spelling-toggle">
                    <span className="spelling-label">{t.spellingLabel}</span>
                    <button
                      type="button"
                      className={`spelling-btn ${spelling === 'US' ? 'spelling-btn--active' : ''}`}
                      onClick={() => setSpelling('US')}
                    >
                      US
                    </button>
                    <button
                      type="button"
                      className={`spelling-btn ${spelling === 'UK' ? 'spelling-btn--active' : ''}`}
                      onClick={() => setSpelling('UK')}
                    >
                      UK
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              className="btn-run"
              disabled={!canSubmit || loading}
              onClick={runCheck}
            >
              {loading ? t.runningBtn : t.runBtn}
            </button>
            {error && <p className="tab1-error">{error}</p>}
          </section>
        </div>

        <div className="tab-layout-right">
          <aside className="tab1-results">
        {!results && !loading && (
          <div className="results-empty">
            <div className="results-empty-icon">✉️</div>
            <h3 className="results-empty-title">{t.emptyTitle}</h3>
            <ul className="results-empty-list">
              {t.emptyList.map((item) => (
                <li key={item}>✓ {item}</li>
              ))}
            </ul>
          </div>
        )}
        {loading && (
          <div className="tab1-results-loading">
            <p>{t.loadingText}</p>
          </div>
        )}
        {results && !loading && (
          <>
            <div className="tab1-score-block">
              <div className="tab1-score-value">{results.score}%</div>
              <div className={`tab1-level tab1-level--${results.level}`}>
                {results.level === 'good' && t.levelGood}
                {results.level === 'warning' && t.levelWarning}
                {results.level === 'bad' && t.levelBad}
              </div>
              <p className="tab1-level-message">
                {levelMessages[results.level] || results.level}
              </p>
            </div>

            {results.subjectLine && (
              <div className="tab1-subject-panel">
                <h3 className="tab1-subject-title">{t.subjectLineTitle}</h3>
                <div className="tab1-subject-header">
                  <span className={`tab1-chip tab1-chip--${results.subjectLine.overallStatus}`}>
                    {results.subjectLine.overallStatus === 'good' && t.levelGood}
                    {results.subjectLine.overallStatus === 'warning' && t.levelWarning}
                    {results.subjectLine.overallStatus === 'bad' && t.levelBad}
                  </span>
                  <span className="tab1-subject-score">{results.subjectLine.score}%</span>
                </div>
                <ul className="tab1-subject-checks">
                  {(results.subjectLine.checks || []).map((c) => {
                    const hasDetail = c.status === 'BAD' || c.status === 'WARNING';
                    const isExpanded = expandedSubjectIds.has(c.id);
                    return (
                      <li key={c.id} className="tab1-check-item">
                        <button
                          type="button"
                          className={`tab1-check-head ${hasDetail ? 'tab1-check-head--clickable' : ''}`}
                          onClick={() => hasDetail && toggleExpandedSubject(c.id)}
                          disabled={!hasDetail}
                        >
                          <span className="tab1-check-label">{c.label}</span>
                          <span className={`tab1-chip tab1-chip--${c.status.toLowerCase()}`}>
                            {c.status}
                          </span>
                          {c.matchedTerms && c.matchedTerms.length > 0 && (
                            <span className="tab1-subject-flagged">
                              {t.flaggedTerms} {c.matchedTerms.join(', ')}
                            </span>
                          )}
                          {hasDetail && (
                            <span className="tab1-check-chevron" aria-hidden>
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                        </button>
                        {hasDetail && isExpanded && (
                          <div className="tab1-check-detail">
                            {c.value != null && (
                              <p className="tab1-check-value">{t.value} {c.value}</p>
                            )}
                            {c.matchedTerms && c.matchedTerms.length > 0 && (
                              <p className="tab1-check-matched">
                                {t.flaggedTerms} <strong>{c.matchedTerms.join(', ')}</strong>
                              </p>
                            )}
                            <p className="tab1-check-message">{c.message}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {results.subjectLineCoherence && (
              <div className="tab1-coherence-panel">
                <h3 className="tab1-coherence-title">{t.coherenceTitle}</h3>
                <div className="tab1-coherence-row">
                  <span className={`tab1-chip tab1-chip--${results.subjectLineCoherence.status}`}>
                    {results.subjectLineCoherence.status === 'good' && t.levelGood}
                    {results.subjectLineCoherence.status === 'warning' && t.levelWarning}
                    {results.subjectLineCoherence.status === 'bad' && t.levelBad}
                  </span>
                  <span className="tab1-coherence-label">{results.subjectLineCoherence.score_label}</span>
                </div>
                <p className="tab1-coherence-reason">{results.subjectLineCoherence.reason}</p>
              </div>
            )}

            <ul className="tab1-checks">
              {(results.results || []).map((r) => {
                const hasDetail = r.status === 'BAD' || r.status === 'WARNING' || r.status === 'PENDING';
                const isExpanded = expandedIds.has(r.id);
                return (
                  <li key={r.id} className="tab1-check-item">
                    <button
                      type="button"
                      className={`tab1-check-head ${hasDetail ? 'tab1-check-head--clickable' : ''}`}
                      onClick={() => hasDetail && toggleExpanded(r.id)}
                      disabled={!hasDetail}
                    >
                      <span className="tab1-check-label">{r.label}</span>
                      <span className={`tab1-chip tab1-chip--${r.status.toLowerCase()}`}>
                        {r.status}
                      </span>
                      {hasDetail && (
                        <span className="tab1-check-chevron" aria-hidden>
                          {isExpanded ? '▼' : '▶'}
                        </span>
                      )}
                    </button>
                    {hasDetail && isExpanded && (
                      <div className="tab1-check-detail">
                        {r.value != null && (
                          <p className="tab1-check-value">{t.value} {r.value}</p>
                        )}
                        {r.matchedTerms && r.matchedTerms.length > 0 && (
                          <>
                            <p className="tab1-check-matched">
                              {t.flaggedTerms} <strong>{r.matchedTerms.join(', ')}</strong>
                            </p>
                            {r.matchedReplacements && r.matchedReplacements.length > 0 && (
                              <p className="tab1-check-replacements">
                                {t.useInstead} {r.matchedReplacements.map(({ term, replacements }) => `${term} → ${replacements.join(', ')}`).join('; ')}
                              </p>
                            )}
                          </>
                        )}
                        {r.flaggedWords && r.flaggedWords.length > 0 && (
                          <p className="tab1-check-matched">
                            {t.flaggedWords} <strong>{r.flaggedWords.join(', ')}</strong>
                          </p>
                        )}
                        {r.duplicateList && r.duplicateList.length > 0 && (
                          <p className="tab1-check-matched">
                            {t.repeatedWords} <strong>{r.duplicateList.map(({ word, count }) => `${word} (${count})`).join(', ')}</strong>
                          </p>
                        )}
                        <p className="tab1-check-message">{r.message}</p>
                        {results.suggestions && results.suggestions[r.id] && (
                          <div className="tab1-suggestion">
                            <p className="tab1-suggestion-label">{t.suggestion}</p>
                            {(results.suggestions[r.id].explanation || results.suggestions[r.id].fix) && (
                              <>
                                {results.suggestions[r.id].explanation && (
                                  <p className="tab1-suggestion-text">{results.suggestions[r.id].explanation}</p>
                                )}
                                {results.suggestions[r.id].fix && (
                                  <p className="tab1-suggestion-fix">{results.suggestions[r.id].fix}</p>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {(r.status === 'WARNING' || r.status === 'BAD') && (
                          <div className="tab1-rewrite-wrap">
                            <button
                              type="button"
                              className="tab1-rewrite-btn"
                              onClick={() => handleRewrite(r)}
                              disabled={rewriteLoading[r.id]}
                            >
                              {rewriteLoading[r.id] ? t.rewritingBtn : t.rewriteBtn}
                            </button>
                            {rewriteError[r.id] && (
                              <p className="tab1-rewrite-error">{t.rewriteError}</p>
                            )}
                            {rewriteResult[r.id] != null && rewriteResult[r.id] !== '' && !rewriteLoading[r.id] && (
                              <div className="tab1-rewrite-result">
                                <label className="tab1-rewrite-label">{t.rewriteLabel}</label>
                                <textarea
                                  className="tab1-textarea tab1-rewrite-textarea"
                                  readOnly
                                  value={rewriteResult[r.id]}
                                  rows={12}
                                />
                                <button
                                  type="button"
                                  className="tab1-rewrite-copy"
                                  onClick={() => navigator.clipboard.writeText(rewriteResult[r.id])}
                                >
                                  {t.copyRewrite}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <p className="tab1-disclaimer">
              {t.disclaimer}
            </p>
          </>
        )}
          </aside>
        </div>
      </div>
    </div>
  );
}
