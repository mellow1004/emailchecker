import { useState, useCallback } from 'react';

const CHAR_LIMIT = 4000;

const LEVEL_MESSAGES = {
  good: "Content quality looks strong. You're in a good place to send.",
  warning: 'Content is close. A few adjustments will reduce risk.',
  bad: 'Content needs revision. Address the items below and test again.',
};

export default function Tab1CheckDraft() {
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
          locale: spelling === 'UK' ? 'en-GB' : 'en-US',
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
    <div className="tab1-layout">
      <section className="tab1-editor">
        <label className="tab1-label" htmlFor="subject-line">
          Subject line
        </label>
        <input
          id="subject-line"
          type="text"
          className="tab1-input"
          placeholder="e.g. ALM and Treasury infrastructure for {{Company}}"
          value={subjectLine}
          onChange={(e) => setSubjectLine(e.target.value)}
        />
        <p className="tab1-hint">Optional — used for subject line analysis</p>
        <label className="tab1-label" htmlFor="draft">
          Email draft
        </label>
        <textarea
          id="draft"
          className="tab1-textarea"
          placeholder="Paste your cold email draft here…"
          value={draft}
          onChange={handleDraftChange}
          rows={20}
          maxLength={CHAR_LIMIT}
        />
        <div className="tab1-meta">
          <span className={`tab1-char-count ${overLimit ? 'tab1-char-count--over' : ''}`}>
            {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()}
          </span>
          <div className="tab1-spelling">
            <span className="tab1-spelling-label">Spelling:</span>
            <button
              type="button"
              className={`tab1-spelling-btn ${spelling === 'US' ? 'tab1-spelling-btn--active' : ''}`}
              onClick={() => setSpelling('US')}
            >
              US
            </button>
            <button
              type="button"
              className={`tab1-spelling-btn ${spelling === 'UK' ? 'tab1-spelling-btn--active' : ''}`}
              onClick={() => setSpelling('UK')}
            >
              UK
            </button>
          </div>
        </div>
        <button
          type="button"
          className="tab1-submit"
          disabled={!canSubmit || loading}
          onClick={runCheck}
        >
          {loading ? 'Checking…' : 'Run email check'}
        </button>
        {error && <p className="tab1-error">{error}</p>}
      </section>

      <aside className="tab1-results">
        {!results && !loading && (
          <div className="tab1-results-empty">
            <div className="tab1-results-empty-icon" aria-hidden>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="8" y="16" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
                <path d="M8 22l24 18 24-18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
              </svg>
            </div>
            <h3 className="tab1-results-empty-title">Results will appear here</h3>
            <p className="tab1-results-empty-text">Paste your email draft in the editor, then click <strong>Run email check</strong> to see your score and personalized suggestions for each check.</p>
          </div>
        )}
        {loading && (
          <div className="tab1-results-loading">
            <p>Running checks…</p>
          </div>
        )}
        {results && !loading && (
          <>
            <div className="tab1-score-block">
              <div className="tab1-score-value">{results.score}%</div>
              <div className={`tab1-level tab1-level--${results.level}`}>
                {results.level === 'good' && 'Good'}
                {results.level === 'warning' && 'Warning'}
                {results.level === 'bad' && 'Needs work'}
              </div>
              <p className="tab1-level-message">
                {LEVEL_MESSAGES[results.level] || results.level}
              </p>
            </div>

            {results.subjectLine && (
              <div className="tab1-subject-panel">
                <h3 className="tab1-subject-title">Subject line</h3>
                <div className="tab1-subject-header">
                  <span className={`tab1-chip tab1-chip--${results.subjectLine.overallStatus}`}>
                    {results.subjectLine.overallStatus === 'good' && 'Good'}
                    {results.subjectLine.overallStatus === 'warning' && 'Warning'}
                    {results.subjectLine.overallStatus === 'bad' && 'Needs work'}
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
                              Flagged: {c.matchedTerms.join(', ')}
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
                              <p className="tab1-check-value">Value: {c.value}</p>
                            )}
                            {c.matchedTerms && c.matchedTerms.length > 0 && (
                              <p className="tab1-check-matched">
                                Flagged terms: <strong>{c.matchedTerms.join(', ')}</strong>
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
                <h3 className="tab1-coherence-title">Subject line + email coherence</h3>
                <div className="tab1-coherence-row">
                  <span className={`tab1-chip tab1-chip--${results.subjectLineCoherence.status}`}>
                    {results.subjectLineCoherence.status === 'good' && 'Good'}
                    {results.subjectLineCoherence.status === 'warning' && 'Warning'}
                    {results.subjectLineCoherence.status === 'bad' && 'Weak'}
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
                          <p className="tab1-check-value">Value: {r.value}</p>
                        )}
                        {r.matchedTerms && r.matchedTerms.length > 0 && (
                          <>
                            <p className="tab1-check-matched">
                              Flagged terms: <strong>{r.matchedTerms.join(', ')}</strong>
                            </p>
                            {r.matchedReplacements && r.matchedReplacements.length > 0 && (
                              <p className="tab1-check-replacements">
                                Use instead: {r.matchedReplacements.map(({ term, replacements }) => `${term} → ${replacements.join(', ')}`).join('; ')}
                              </p>
                            )}
                          </>
                        )}
                        {r.flaggedWords && r.flaggedWords.length > 0 && (
                          <p className="tab1-check-matched">
                            Flagged words: <strong>{r.flaggedWords.join(', ')}</strong>
                          </p>
                        )}
                        {r.duplicateList && r.duplicateList.length > 0 && (
                          <p className="tab1-check-matched">
                            Repeated words: <strong>{r.duplicateList.map(({ word, count }) => `${word} (${count})`).join(', ')}</strong>
                          </p>
                        )}
                        <p className="tab1-check-message">{r.message}</p>
                        {results.suggestions && results.suggestions[r.id] && (
                          <div className="tab1-suggestion">
                            <p className="tab1-suggestion-label">Suggestion</p>
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
                              {rewriteLoading[r.id] ? 'Rewriting…' : 'Rewrite suggestion'}
                            </button>
                            {rewriteError[r.id] && (
                              <p className="tab1-rewrite-error">Something went wrong — try again</p>
                            )}
                            {rewriteResult[r.id] != null && rewriteResult[r.id] !== '' && !rewriteLoading[r.id] && (
                              <div className="tab1-rewrite-result">
                                <label className="tab1-rewrite-label">Suggested rewrite:</label>
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
                                  Copy rewrite
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
              This tool evaluates content and structure only. It does not guarantee deliverability or compliance with your provider or local laws.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
