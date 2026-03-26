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
    <div className="tab-content">
      <div className="tab-layout">
        <div className="tab-layout-left">
          <section className="input-card">
            <p className="input-card-description">
              Enter your company URL and optional targeting details — we'll generate 3 scored cold email variants tailored to your offer.
            </p>

            <div className="input-field-group">
              <label className="input-label" htmlFor="tab2-url">Company or product URL</label>
              <span className="input-hint">Used to understand your offer and generate relevant drafts</span>
              <input
                id="tab2-url"
                className="input-field"
                type="url"
                placeholder="e.g. https://yourcompany.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-targeting">
              <div className="input-targeting-header">
                <span className="input-targeting-title">Targeting & context</span>
                <span className="input-hint">— optional, helps tailor the output</span>
              </div>

              <div className="input-field-group">
                <label className="input-label" htmlFor="tab2-prospect-url">Prospect company URL</label>
                <input
                  id="tab2-prospect-url"
                  className="input-field"
                  type="url"
                  placeholder="e.g. https://prospectcompany.com"
                  value={prospectUrl}
                  onChange={(e) => setProspectUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-row">
                <div className="input-field-group">
                  <label className="input-label" htmlFor="tab2-target-industry">Target industry</label>
                  <input
                    id="tab2-target-industry"
                    className="input-field"
                    type="text"
                    placeholder="e.g. Banking, Fintech, SaaS"
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="input-field-group">
                  <label className="input-label" htmlFor="tab2-target-role">Target role / department</label>
                  <input
                    id="tab2-target-role"
                    className="input-field"
                    type="text"
                    placeholder="e.g. CFO, Head of Treasury"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label" htmlFor="tab2-additional-context">Additional context</label>
                <textarea
                  id="tab2-additional-context"
                  className="input-field input-textarea input-textarea--short"
                  placeholder="e.g. Focus on regulatory complexity, targeting banks with 50–500 employees"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="input-footer">
              <div className="spelling-toggle">
                <span className="spelling-label">Spelling:</span>
                <button
                  type="button"
                  className={`spelling-btn ${locale === 'US' ? 'spelling-btn--active' : ''}`}
                  onClick={() => setLocale('US')}
                  disabled={loading}
                >
                  US
                </button>
                <button
                  type="button"
                  className={`spelling-btn ${locale === 'UK' ? 'spelling-btn--active' : ''}`}
                  onClick={() => setLocale('UK')}
                  disabled={loading}
                >
                  UK
                </button>
              </div>
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
              className="btn-run"
              onClick={generate}
              disabled={!url.trim() || loading}
            >
              {loading ? 'Generating...' : 'Generate emails'}
            </button>
            {error && <p className="tab2-error">{error}</p>}
          </section>
        </div>

        <div className="tab-layout-right">
          <aside className="tab2-results">
        {!drafts && !loading && (
          <div className="results-empty">
            <div className="results-empty-icon">⚡</div>
            <h3 className="results-empty-title">Drafts will appear here</h3>
            <ul className="results-empty-list">
              <li>✓ 3 tailored cold email variants</li>
              <li>✓ A score for each draft</li>
              <li>✓ Notes on strengths and weaknesses</li>
              <li>✓ Copy you can edit and use immediately</li>
            </ul>
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
          <div className="results-empty">
            <p className="tab2-results-empty-text">No drafts were returned. Try another URL.</p>
          </div>
        )}
          </aside>
        </div>
      </div>
    </div>
  );
}
