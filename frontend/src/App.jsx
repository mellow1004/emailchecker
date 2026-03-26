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
    </div>
  );
}
