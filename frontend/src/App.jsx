import { useState } from 'react';
import Tab1CheckDraft from './components/Tab1CheckDraft.jsx';
import Tab2GenerateScore from './components/Tab2GenerateScore.jsx';

export default function App() {
  const [activeTab, setActiveTab] = useState(1);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-hero">
          <div className="app-wordmark">Brightvision</div>
          <h1 className="app-title">Email Checker</h1>
          <p className="app-tagline">Analyze and generate high-performing B2B cold emails</p>
        </div>
        <nav className="app-nav">
          <button
            type="button"
            className={`app-tab ${activeTab === 1 ? 'app-tab--active' : ''}`}
            onClick={() => setActiveTab(1)}
          >
            Check Draft
          </button>
          <button
            type="button"
            className={`app-tab ${activeTab === 2 ? 'app-tab--active' : ''}`}
            onClick={() => setActiveTab(2)}
          >
            Generate & Score
          </button>
        </nav>
      </header>
      <main className="app-main">
        {activeTab === 1 && <Tab1CheckDraft />}
        {activeTab === 2 && <Tab2GenerateScore />}
      </main>
    </div>
  );
}
