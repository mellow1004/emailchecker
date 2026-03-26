import { useState } from 'react';
import Tab1CheckDraft from './components/Tab1CheckDraft.jsx';
import Tab2GenerateScore from './components/Tab2GenerateScore.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState('tab1');

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-badge">⚡ Free B2B Outbound Tool</div>
        <h1 className="hero-title">
          Stop sending cold emails
          <br />
          that <span className="hero-title-accent">sound</span> cold
        </h1>
        <p className="hero-subtitle">
          Score your draft against 9 real outbound checks, or generate tailored
          variants in seconds — built from the same framework we use on live campaigns.
        </p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="hero-stat-number">9</span>
            <span className="hero-stat-label">Quality checks</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">3</span>
            <span className="hero-stat-label">AI-generated variants</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-number">100%</span>
            <span className="hero-stat-label">Free to use</span>
          </div>
        </div>
        <div className="hero-tabs">
          <button
            type="button"
            className={`hero-tab ${activeTab === 'tab1' ? 'hero-tab--active' : ''}`}
            onClick={() => setActiveTab('tab1')}
          >
            ✏️ Review Draft
          </button>
          <button
            type="button"
            className={`hero-tab ${activeTab === 'tab2' ? 'hero-tab--active' : ''}`}
            onClick={() => setActiveTab('tab2')}
          >
            ⚡ Generate Drafts
          </button>
        </div>
      </header>
      <main className="app-main">
        {activeTab === 'tab1' && <Tab1CheckDraft />}
        {activeTab === 'tab2' && <Tab2GenerateScore />}
      </main>

      <section className="lp-section lp-section--light">
        <div className="container">
          <div className="lp-section-label">HOW IT WORKS</div>
          <h2 className="lp-section-title">Three steps to a stronger outbound email</h2>
          <p className="lp-section-subtitle">
            Whether you're reviewing a draft or generating from scratch, the process is the same.
          </p>
          <div className="lp-steps">
            <div className="lp-step">
              <div className="lp-step-number">1</div>
              <h3 className="lp-step-title">Paste a draft or enter a URL</h3>
              <p className="lp-step-text">Start with an existing cold email you want to improve, or let the tool generate drafts from your company page.</p>
            </div>
            <div className="lp-step lp-step--featured">
              <div className="lp-step-number">2</div>
              <h3 className="lp-step-title">Get scored across 9 checks</h3>
              <p className="lp-step-text">See exactly where your email is strong and where it needs work — from subject line clarity to CTA strength and spam-risk wording.</p>
            </div>
            <div className="lp-step">
              <div className="lp-step-number">3</div>
              <h3 className="lp-step-title">Improve before you send</h3>
              <p className="lp-step-text">Use the flagged issues and suggestions to strengthen your message before it reaches a single inbox.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--light">
        <div className="container">
          <div className="lp-section-label">THE FRAMEWORK</div>
          <h2 className="lp-section-title">9 checks built for B2B cold outreach</h2>
          <p className="lp-section-subtitle">
            Every check reflects what actually matters when a prospect decides to reply or ignore your email.
          </p>
          <div className="lp-checks-grid">
            {[
              { n: 1, title: 'Subject line clarity', text: 'Is the subject relevant, clear, and natural enough to earn an open?' },
              { n: 2, title: 'Opening strength', text: 'Does the first line feel credible and relevant — or generic and skippable?' },
              { n: 3, title: 'Personalisation', text: 'Does the draft feel tailored to the recipient, or like it could be sent to anyone?' },
              { n: 4, title: 'Audience relevance', text: 'Is the message aligned to the target role, company, or industry?' },
              { n: 5, title: 'Structure & readability', text: 'Is the email easy to scan, well-paced, and quick to understand?' },
              { n: 6, title: 'CTA strength', text: 'Is the ask clear, low-friction, and appropriate for a first cold touch?' },
              { n: 7, title: 'Tone & credibility', text: 'Does the email sound professional, confident, and human — not robotic or pushy?' },
              { n: 8, title: 'Spam-risk wording', text: 'Are there phrases that sound overly promotional, vague, or likely to trigger filters?' },
              { n: 9, title: 'Outbound readiness', text: 'Would you feel confident putting this email in front of real prospects today?' },
            ].map(({ n, title, text }) => (
              <div className="lp-check-card" key={n}>
                <div className="lp-check-number">{n}</div>
                <h3 className="lp-check-title">{title}</h3>
                <p className="lp-check-text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--dark">
        <div className="container">
          <div className="lp-section-label lp-section-label--light">WHY THIS TOOL</div>
          <h2 className="lp-section-title lp-section-title--light">Built from live campaign experience</h2>
          <p className="lp-section-subtitle lp-section-subtitle--light">
            This isn't a generic writing assistant. Every check in this tool reflects principles we apply when reviewing real outbound emails for real campaigns.
          </p>
          <div className="lp-features-grid">
            {[
              { icon: '🎯', title: 'Outbound-specific framework', text: 'Scored against the things that actually affect reply rates — not grammar rules or generic readability scores.' },
              { icon: '✏️', title: 'Tested on real campaigns', text: 'The 9-check framework comes from reviewing thousands of cold emails across B2B campaigns in multiple industries.' },
              { icon: '🚫', title: 'No fluff scoring', text: "We don't score open rates or click-through — those metrics are unreliable and damage deliverability. We score what you can control." },
              { icon: '⚡', title: 'Instant and actionable', text: 'You get specific flags, not vague suggestions. Every issue comes with a clear reason and a practical fix.' },
            ].map(({ icon, title, text }) => (
              <div className="lp-feature-card" key={title}>
                <div className="lp-feature-icon">{icon}</div>
                <h3 className="lp-feature-title">{title}</h3>
                <p className="lp-feature-text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--light">
        <div className="container">
          <div className="lp-disclaimer">
            <div className="lp-disclaimer-icon">⚠️</div>
            <div>
              <strong>Important note</strong>
              <p>This tool reviews the <strong>email content itself</strong> — message quality, structure, tone, and wording. It does not replace technical deliverability factors such as SPF, DKIM, DMARC, domain reputation, sending setup, or inbox health. Content quality and technical setup both matter — this tool covers one side.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-section lp-section--light">
        <div className="container">
          <div className="lp-section-label">WHO IT'S FOR</div>
          <h2 className="lp-section-title">Built for teams that send outbound</h2>
          <p className="lp-section-subtitle">
            Whether you're launching your first campaign or optimising an existing one, this tool helps you catch weak spots before prospects do.
          </p>
          <div className="lp-audience-grid">
            {[
              { icon: '🏹', title: 'SDR & BDR teams', text: 'QA your sequences before they go live. Catch weak openers, generic messaging, and risky wording in seconds.' },
              { icon: '🎯', title: 'Campaign managers', text: 'Score every variant in your A/B tests. Make sure all versions meet the same quality bar before launch.' },
              { icon: '🚀', title: 'Founders & GTM leads', text: "You're writing the emails yourself and want a second opinion before pressing send. This is that second opinion." },
              { icon: '📊', title: 'Marketing teams', text: 'Supporting sales with email copy? Validate that your messaging works for cold outreach — not just brand comms.' },
              { icon: '🏢', title: 'Agencies & consultants', text: 'Running outbound for clients? Use the checker as a quality gate before any email goes out under a client\'s name.', featured: true },
              { icon: '🌱', title: 'Teams starting outbound', text: 'New to cold email? Get scored feedback that teaches you what good looks like — faster than trial and error.' },
            ].map(({ icon, title, text, featured }) => (
              <div className={`lp-audience-card ${featured ? 'lp-audience-card--featured' : ''}`} key={title}>
                <div className="lp-audience-icon">{icon}</div>
                <h3 className="lp-audience-title">{title}</h3>
                <p className="lp-audience-text">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="container">
          <h2 className="lp-cta-title">Need help beyond the email itself?</h2>
          <p className="lp-cta-subtitle">
            Brightvision helps B2B teams improve outbound strategy, targeting, messaging, and execution — not just the draft.
          </p>
          <div className="lp-cta-buttons">
            <a href="https://brightvision.com/contact" className="btn-primary" target="_blank" rel="noopener noreferrer">
              Book a strategy call
            </a>
            <a href="https://brightvision.com" className="btn-secondary" target="_blank" rel="noopener noreferrer">
              Explore outbound services
            </a>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="container">
          <p className="lp-footer-text">
            <span className="lp-footer-brand">Brightvision</span> Email Checker · Built for B2B outbound teams · March 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
