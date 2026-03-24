import { useState, useCallback } from 'react';

export default function Tab2GenerateScore() {
  const [url, setUrl] = useState('');
  const [prospectUrl, setProspectUrl] = useState('');
  const [targetIndustry, setTargetIndustry] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [context, setContext] = useState('');
  const [locale, setLocale] = useState('US');
  const [needsContext, setNeedsContext] = useState(false);
  const [drafts, setDrafts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);

  const canSubmit =
    url.trim().length > 0 &&
    !loading &&
    (!needsContext || context.trim().length > 0);

  const generate = useCallback(async () => {
    setError(null);
    setLoading(true);
    setDrafts(null);
    setExpandedCard(null);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          locale: locale,
          prospectUrl: prospectUrl.trim() || undefined,
          targetIndustry: targetIndustry.trim() || undefined,
          targetRole: targetRole.trim() || undefined,
          context: context.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText || 'Generate failed');
      setNeedsContext(!!data.needsContext);
      setDrafts(data.drafts || []);
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [url, prospectUrl, targetIndustry, targetRole, context, locale]);

  const copyEmail = useCallback((draft) => {
    const full = [
      `Subject: ${draft.subject || '(no subject)'}`,
      '',
      draft.body || '',
      '',
      draft.signoff || '',
    ]
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(full);
  }, []);

  const toggleCard = (index) => {
    setExpandedCard((prev) => (prev === index ? null : index));
  };

  return (
    <div className="tab2-layout">
      <section className="tab2-editor">
        <label className="tab2-label" htmlFor="tab2-url">
          Company or product URL
        </label>
        <input
          id="tab2-url"
          type="url"
          className="tab2-input"
          placeholder="Enter company or product URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
        />
        <p className="tab2-description">
          Enter a company URL and we'll generate 3 ready-to-send cold email drafts, each automatically scored against our 9 checks.
        </p>
        <div className="tab2-targeting">
          <h3 className="tab2-targeting-title">Targeting & context</h3>
          <p className="tab2-targeting-subtitle">Optional — helps tailor the generated emails</p>
          <label className="tab2-label" htmlFor="tab2-prospect-url">
            Prospect company URL
          </label>
          <p className="tab2-targeting-hint">Optional — we'll read their website to tailor the email to them</p>
          <input
            id="tab2-prospect-url"
            type="url"
            className="tab2-input"
            placeholder="e.g. https://prospectcompany.com"
            value={prospectUrl}
            onChange={(e) => setProspectUrl(e.target.value)}
            disabled={loading}
          />
          <label className="tab2-label" htmlFor="tab2-target-industry">
            Target industry
          </label>
          <input
            id="tab2-target-industry"
            type="text"
            className="tab2-input"
            placeholder="e.g. Banking, Fintech, Insurance"
            value={targetIndustry}
            onChange={(e) => setTargetIndustry(e.target.value)}
            disabled={loading}
          />
          <label className="tab2-label" htmlFor="tab2-target-role">
            Target role / department
          </label>
          <input
            id="tab2-target-role"
            type="text"
            className="tab2-input"
            placeholder="e.g. CFO, Head of Treasury, IT Director"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            disabled={loading}
          />
          <label className="tab2-label" htmlFor="tab2-additional-context">
            Additional context
          </label>
          <textarea
            id="tab2-additional-context"
            className="tab2-input tab2-context-textarea"
            placeholder="e.g. Focus on regulatory compliance challenges, targeting banks with 50–500 employees"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
            disabled={loading}
          />
        </div>
        <div className="tab1-spelling">
          <span className="tab1-spelling-label">Spelling:</span>
          <button
            type="button"
            className={`tab1-spelling-btn ${locale === 'US' ? 'tab1-spelling-btn--active' : ''}`}
            onClick={() => setLocale('US')}
            disabled={loading}
          >
            US
          </button>
          <button
            type="button"
            className={`tab1-spelling-btn ${locale === 'UK' ? 'tab1-spelling-btn--active' : ''}`}
            onClick={() => setLocale('UK')}
            disabled={loading}
          >
            UK
          </button>
        </div>
        {needsContext && (
          <div className="tab2-context-wrap">
            <p className="tab2-context-message">
              We couldn't find enough information from this URL. Please add a brief product description, target audience, and key value proposition in the Additional context field above.
            </p>
          </div>
        )}
        <button
          type="button"
          className="tab2-submit"
          disabled={!canSubmit}
          onClick={generate}
        >
          {loading ? 'Generating…' : 'Generate emails'}
        </button>
        {error && <p className="tab2-error">{error}</p>}
      </section>

      <aside className="tab2-results">
        {!drafts && !loading && (
          <div className="tab2-results-empty">
            <div className="tab2-results-empty-icon" aria-hidden>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M32 12L52 24v24L32 52 12 48V24L32 12z" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.4" />
                <path d="M32 12v40M12 24l20 12 20-12M12 48l20-12 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              </svg>
            </div>
            <h3 className="tab2-results-empty-title">Drafts will appear here</h3>
            <p className="tab2-results-empty-text">Enter a company or product URL and click <strong>Generate emails</strong> to get 3 cold email variants, each scored against our 9 checks.</p>
          </div>
        )}
        {loading && (
          <div className="tab2-results-loading">
            <p>Fetching page and generating drafts…</p>
          </div>
        )}
        {drafts && drafts.length > 0 && !loading && (
          <div className="tab2-drafts">
            {drafts.map((draft, index) => (
              <article key={index} className="tab2-draft-card">
                <div className="tab2-draft-header">
                  <span className="tab2-draft-badge">Draft {index + 1}</span>
                  <span className={`tab2-draft-score chip chip--${draft.level}`}>
                    {draft.score}%
                  </span>
                </div>
                <h4 className="tab2-draft-subject">{draft.subject || 'No subject'}</h4>
                {draft.subjectAnalysis && (
                  <div className="tab2-draft-subject-analysis">
                    {draft.subjectAnalysis.spamWords.status !== 'GOOD' && (
                      <span className={`tab2-subject-chip chip chip--${draft.subjectAnalysis.spamWords.status.toLowerCase()}`}>
                        Spam {draft.subjectAnalysis.spamWords.status}
                      </span>
                    )}
                    <span className={`tab2-subject-chip chip chip--${draft.subjectAnalysis.coherence.status}`}>
                      {draft.subjectAnalysis.coherence.status === 'good' && 'Good'}
                      {draft.subjectAnalysis.coherence.status === 'warning' && 'Moderate'}
                      {draft.subjectAnalysis.coherence.status === 'bad' && 'Weak'}
                    </span>
                    <span className="tab2-subject-reason">— {draft.subjectAnalysis.coherence.reason}</span>
                  </div>
                )}
                <div className="tab2-draft-body">
                  {draft.body}
                  {draft.signoff && (
                    <>
                      <br /><br />
                      {draft.signoff}
                    </>
                  )}
                </div>
                <div className="tab2-draft-actions">
                  <button
                    type="button"
                    className="tab2-draft-copy"
                    onClick={() => copyEmail(draft)}
                  >
                    Copy email
                  </button>
                  <button
                    type="button"
                    className="tab2-draft-toggle"
                    onClick={() => toggleCard(index)}
                  >
                    {expandedCard === index ? 'Hide check results' : 'Show check results'}
                  </button>
                </div>
                {expandedCard === index && (
                  <ul className="tab2-draft-checks">
                    {(draft.results || []).map((r) => (
                      <li key={r.id} className="tab2-check-item">
                        <span className="tab2-check-label">{r.label}</span>
                        <span className={`chip chip--${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                        {r.status !== 'GOOD' && (
                          <div className="tab2-check-detail">
                            <p className="tab2-check-message">{r.message}</p>
                            {r.matchedTerms && r.matchedTerms.length > 0 && (
                              <>
                                <p className="tab2-check-matched">
                                  Flagged terms: <strong>{r.matchedTerms.join(', ')}</strong>
                                </p>
                                {r.matchedReplacements && r.matchedReplacements.length > 0 && (
                                  <p className="tab2-check-replacements">
                                    Use instead: {r.matchedReplacements.map(({ term, replacements }) => `${term} → ${replacements.join(', ')}`).join('; ')}
                                  </p>
                                )}
                              </>
                            )}
                            {r.flaggedWords && r.flaggedWords.length > 0 && (
                              <p className="tab2-check-matched">
                                Flagged words: <strong>{r.flaggedWords.join(', ')}</strong>
                              </p>
                            )}
                            {r.duplicateList && r.duplicateList.length > 0 && (
                              <p className="tab2-check-matched">
                                Repeated words: <strong>{r.duplicateList.map(({ word, count }) => `${word} (${count})`).join(', ')}</strong>
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        )}
        {drafts && drafts.length === 0 && !loading && (
          <div className="tab2-results-empty">
            <p className="tab2-results-empty-text">No drafts were returned. Try another URL.</p>
          </div>
        )}
      </aside>
    </div>
  );
}
