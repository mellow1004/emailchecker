import { useState, useCallback } from 'react';

const UI_TEXT = {
  EN: {
    description:
      "Enter your company URL and optional targeting details — we'll generate 3 scored cold email variants tailored to your offer.",
    urlLabel: 'Company or product URL',
    urlHint: 'Used to understand your offer and generate relevant drafts',
    urlPlaceholder: 'e.g. https://yourcompany.com',
    targetingTitle: 'Targeting & context',
    targetingHint: '— optional, helps tailor the output',
    prospectUrlLabel: 'Prospect company URL',
    prospectUrlPlaceholder: 'e.g. https://prospectcompany.com',
    industryLabel: 'Target industry',
    industryPlaceholder: 'e.g. Banking, Fintech, SaaS',
    roleLabel: 'Target role / department',
    rolePlaceholder: 'e.g. CFO, Head of Treasury',
    contextLabel: 'Additional context',
    contextPlaceholder: 'e.g. Focus on regulatory complexity, targeting banks with 50–500 employees',
    spellingLabel: 'Spelling:',
    needsContextMsg:
      "We couldn't find enough information from this URL. Please add a brief product description, target audience, and key value proposition in the Additional context field above.",
    generateBtn: 'Generate emails',
    generatingBtn: 'Generating...',
    emptyTitle: 'Drafts will appear here',
    emptyList: [
      '3 tailored cold email variants',
      'A score for each draft',
      'Notes on strengths and weaknesses',
      'Copy you can edit and use immediately',
    ],
    loadingText: 'Fetching page and generating drafts…',
    copyEmail: 'Copy email',
    showChecks: 'Show check results',
    hideChecks: 'Hide check results',
    flaggedTerms: 'Flagged terms:',
    useInstead: 'Use instead:',
    flaggedWords: 'Flagged words:',
    repeatedWords: 'Repeated words:',
    noSubject: 'No subject',
    noDrafts: 'No drafts were returned. Try another URL.',
    draft: 'Draft',
    coherenceGood: 'Good',
    coherenceWarning: 'Moderate',
    coherenceBad: 'Weak',
    subjectLinePrefix: 'Subject:',
    noSubjectClipboard: '(no subject)',
    spamLabel: 'Spam',
  },
  SV: {
    description:
      'Ange din företags-URL och valfria målgruppsdetaljer — vi genererar 3 betygsatta kalla säljmejlvarianter anpassade till ditt erbjudande.',
    urlLabel: 'Företags- eller produkt-URL',
    urlHint: 'Används för att förstå ditt erbjudande och generera relevanta utkast',
    urlPlaceholder: 't.ex. https://dittforetag.se',
    targetingTitle: 'Målgrupp & kontext',
    targetingHint: '— valfritt, hjälper till att anpassa resultatet',
    prospectUrlLabel: 'Prospektföretagets URL',
    prospectUrlPlaceholder: 't.ex. https://prospektforetag.se',
    industryLabel: 'Målbransch',
    industryPlaceholder: 't.ex. Bank, Fintech, SaaS',
    roleLabel: 'Målroll / avdelning',
    rolePlaceholder: 't.ex. CFO, Ekonomichef',
    contextLabel: 'Ytterligare kontext',
    contextPlaceholder:
      't.ex. Fokus på regulatorisk komplexitet, riktar sig till banker med 50–500 anställda',
    spellingLabel: 'Stavning:',
    needsContextMsg:
      'Vi hittade inte tillräckligt med information från denna URL. Lägg till en kort produktbeskrivning, målgrupp och viktigaste värdeerbjudande i fältet Ytterligare kontext ovan.',
    generateBtn: 'Generera mejl',
    generatingBtn: 'Genererar...',
    emptyTitle: 'Utkast visas här',
    emptyList: [
      '3 anpassade kalla säljmejlvarianter',
      'Ett betyg för varje utkast',
      'Noteringar om styrkor och svagheter',
      'Kopia du kan redigera och använda direkt',
    ],
    loadingText: 'Hämtar sida och genererar utkast…',
    copyEmail: 'Kopiera mejl',
    showChecks: 'Visa kontrollresultat',
    hideChecks: 'Dölj kontrollresultat',
    flaggedTerms: 'Flaggade termer:',
    useInstead: 'Använd istället:',
    flaggedWords: 'Flaggade ord:',
    repeatedWords: 'Upprepade ord:',
    noSubject: 'Inget ämne',
    noDrafts: 'Inga utkast returnerades. Prova en annan URL.',
    draft: 'Utkast',
    coherenceGood: 'Bra',
    coherenceWarning: 'Måttlig',
    coherenceBad: 'Svag',
    subjectLinePrefix: 'Ämne:',
    noSubjectClipboard: '(inget ämne)',
    spamLabel: 'Spam',
  },
};

export default function Tab2GenerateScore({ language = 'EN' }) {
  const t = UI_TEXT[language] || UI_TEXT.EN;
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
          language,
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
  }, [url, prospectUrl, targetIndustry, targetRole, context, locale, language]);

  const copyEmail = useCallback(
    (draft) => {
      const full = [
        `${t.subjectLinePrefix} ${draft.subject || t.noSubjectClipboard}`,
        '',
        draft.body || '',
        '',
        draft.signoff || '',
      ]
        .filter(Boolean)
        .join('\n');
      navigator.clipboard.writeText(full);
    },
    [t]
  );

  const toggleCard = (index) => {
    setExpandedCard((prev) => (prev === index ? null : index));
  };

  return (
    <div className="tab-content">
      <div className="tab-layout">
        <div className="tab-layout-left">
          <section className="input-card">
            <p className="input-card-description">{t.description}</p>

            <div className="input-field-group">
              <label className="input-label" htmlFor="tab2-url">
                {t.urlLabel}
              </label>
              <span className="input-hint">{t.urlHint}</span>
              <input
                id="tab2-url"
                className="input-field"
                type="url"
                placeholder={t.urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="input-targeting">
              <div className="input-targeting-header">
                <span className="input-targeting-title">{t.targetingTitle}</span>
                <span className="input-hint">{t.targetingHint}</span>
              </div>

              <div className="input-field-group">
                <label className="input-label" htmlFor="tab2-prospect-url">
                  {t.prospectUrlLabel}
                </label>
                <input
                  id="tab2-prospect-url"
                  className="input-field"
                  type="url"
                  placeholder={t.prospectUrlPlaceholder}
                  value={prospectUrl}
                  onChange={(e) => setProspectUrl(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-row">
                <div className="input-field-group">
                  <label className="input-label" htmlFor="tab2-target-industry">
                    {t.industryLabel}
                  </label>
                  <input
                    id="tab2-target-industry"
                    className="input-field"
                    type="text"
                    placeholder={t.industryPlaceholder}
                    value={targetIndustry}
                    onChange={(e) => setTargetIndustry(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="input-field-group">
                  <label className="input-label" htmlFor="tab2-target-role">
                    {t.roleLabel}
                  </label>
                  <input
                    id="tab2-target-role"
                    className="input-field"
                    type="text"
                    placeholder={t.rolePlaceholder}
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="input-field-group">
                <label className="input-label" htmlFor="tab2-additional-context">
                  {t.contextLabel}
                </label>
                <textarea
                  id="tab2-additional-context"
                  className="input-field input-textarea input-textarea--short"
                  placeholder={t.contextPlaceholder}
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            {language !== 'SV' && (
              <div className="input-footer">
                <div className="spelling-toggle">
                  <span className="spelling-label">{t.spellingLabel}</span>
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
            )}

            {needsContext && (
              <div className="tab2-context-wrap">
                <p className="tab2-context-message">{t.needsContextMsg}</p>
              </div>
            )}

            <button
              type="button"
              className="btn-run"
              onClick={generate}
              disabled={!url.trim() || loading}
            >
              {loading ? t.generatingBtn : t.generateBtn}
            </button>
            {error && <p className="tab2-error">{error}</p>}
          </section>
        </div>

        <div className="tab-layout-right">
          <aside className="tab2-results">
            {!drafts && !loading && (
              <div className="results-empty">
                <div className="results-empty-icon">⚡</div>
                <h3 className="results-empty-title">{t.emptyTitle}</h3>
                <ul className="results-empty-list">
                  {t.emptyList.map((item) => (
                    <li key={item}>✓ {item}</li>
                  ))}
                </ul>
              </div>
            )}
            {loading && (
              <div className="tab2-results-loading">
                <p>{t.loadingText}</p>
              </div>
            )}
            {drafts && drafts.length > 0 && !loading && (
              <div className="tab2-drafts">
                {drafts.map((draft, index) => (
                  <article key={index} className="tab2-draft-card">
                    <div className="tab2-draft-header">
                      <span className="tab2-draft-badge">
                        {t.draft} {index + 1}
                      </span>
                      <span className={`tab2-draft-score chip chip--${draft.level}`}>{draft.score}%</span>
                    </div>
                    <h4 className="tab2-draft-subject">{draft.subject || t.noSubject}</h4>
                    {draft.subjectAnalysis && (
                      <div className="tab2-draft-subject-analysis">
                        {draft.subjectAnalysis.spamWords.status !== 'GOOD' && (
                          <span
                            className={`tab2-subject-chip chip chip--${draft.subjectAnalysis.spamWords.status.toLowerCase()}`}
                          >
                            {t.spamLabel} {draft.subjectAnalysis.spamWords.status}
                          </span>
                        )}
                        <span className={`tab2-subject-chip chip chip--${draft.subjectAnalysis.coherence.status}`}>
                          {draft.subjectAnalysis.coherence.status === 'good' && t.coherenceGood}
                          {draft.subjectAnalysis.coherence.status === 'warning' && t.coherenceWarning}
                          {draft.subjectAnalysis.coherence.status === 'bad' && t.coherenceBad}
                        </span>
                        <span className="tab2-subject-reason">— {draft.subjectAnalysis.coherence.reason}</span>
                      </div>
                    )}
                    <div className="tab2-draft-body">
                      {draft.body}
                      {draft.signoff && (
                        <>
                          <br />
                          <br />
                          {draft.signoff}
                        </>
                      )}
                    </div>
                    <div className="tab2-draft-actions">
                      <button type="button" className="tab2-draft-copy" onClick={() => copyEmail(draft)}>
                        {t.copyEmail}
                      </button>
                      <button type="button" className="tab2-draft-toggle" onClick={() => toggleCard(index)}>
                        {expandedCard === index ? t.hideChecks : t.showChecks}
                      </button>
                    </div>
                    {expandedCard === index && (
                      <ul className="tab2-draft-checks">
                        {(draft.results || []).map((r) => (
                          <li key={r.id} className="tab2-check-item">
                            <span className="tab2-check-label">{r.label}</span>
                            <span className={`chip chip--${r.status.toLowerCase()}`}>{r.status}</span>
                            {r.status !== 'GOOD' && (
                              <div className="tab2-check-detail">
                                <p className="tab2-check-message">{r.message}</p>
                                {r.matchedTerms && r.matchedTerms.length > 0 && (
                                  <>
                                    <p className="tab2-check-matched">
                                      {t.flaggedTerms} <strong>{r.matchedTerms.join(', ')}</strong>
                                    </p>
                                    {r.matchedReplacements && r.matchedReplacements.length > 0 && (
                                      <p className="tab2-check-replacements">
                                        {t.useInstead}{' '}
                                        {r.matchedReplacements
                                          .map(({ term, replacements }) => `${term} → ${replacements.join(', ')}`)
                                          .join('; ')}
                                      </p>
                                    )}
                                  </>
                                )}
                                {r.flaggedWords && r.flaggedWords.length > 0 && (
                                  <p className="tab2-check-matched">
                                    {t.flaggedWords} <strong>{r.flaggedWords.join(', ')}</strong>
                                  </p>
                                )}
                                {r.duplicateList && r.duplicateList.length > 0 && (
                                  <p className="tab2-check-matched">
                                    {t.repeatedWords}{' '}
                                    <strong>
                                      {r.duplicateList.map(({ word, count }) => `${word} (${count})`).join(', ')}
                                    </strong>
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
                <p className="tab2-results-empty-text">{t.noDrafts}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
