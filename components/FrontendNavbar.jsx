'use client';
import { useState } from 'react';

export default function Navbar({ activeView, onViewChange, onRecruiterClick, onGetStarted }) {
  const [clearEmail, setClearEmail] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearMessage, setClearMessage] = useState('');

  const handleClearData = async () => {
    if (!clearEmail || !clearEmail.includes('@')) {
      setClearMessage('Please enter a valid email');
      setTimeout(() => setClearMessage(''), 3000);
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL data for ${clearEmail}? This action cannot be undone.`)) {
      return;
    }

    setIsClearing(true);
    setClearMessage('');

    try {
      const response = await fetch('/api/fastapi/clear-candidate-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clearEmail }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setClearMessage('✓ Data cleared successfully');
        setClearEmail('');
      } else {
        setClearMessage(`✗ ${data.error || 'Failed to clear data'}`);
      }
    } catch (error) {
      console.error('[ClearData] Error:', error);
      setClearMessage('✗ Network error');
    } finally {
      setIsClearing(false);
      setTimeout(() => setClearMessage(''), 5000);
    }
  };

  return (
    <nav>
      <button 
        onClick={() => onViewChange('home')} 
        className="flex items-center gap-[12px] font-[var(--font-bricolage)] text-[20px] font-bold tracking-[-0.5px] text-[var(--indigo-d)] no-underline"
      >
        <div className="relative w-[40px] h-[40px] shrink-0 grid place-items-center rounded-[12px] bg-gradient-to-br from-[#5b8dee] to-[#7c3aed] shadow-[0_4px_16px_rgba(57,73,171,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] overflow-hidden logo-shimmer">
          <svg className="relative z-10 w-[20px] h-[20px]" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10 2L17 6.5V13.5L10 18L3 13.5V6.5L10 2Z" fill="white" opacity="0.9" />
            <path d="M10 7L13 8.75V12.25L10 14L7 12.25V8.75L10 7Z" fill="white" opacity="0.5" />
          </svg>
        </div>
        <span>elev<em className="bg-[linear-gradient(135deg,var(--indigo),var(--cyan))] bg-clip-text text-transparent not-italic">AIte</em> pro</span>
      </button>

      <div className="nav-links">
        <button 
          onClick={() => onViewChange('features')}
          className={activeView === 'features' ? 'active' : ''}
        >
          Why elevAIte pro
        </button>
        <button 
          onClick={() => onViewChange('how-it-works')}
          className={activeView === 'how-it-works' ? 'active' : ''}
        >
          How It Works
        </button>
        <button
          onClick={() => onViewChange('pricing')}
          className={activeView === 'pricing' ? 'active' : ''}
        >
          Value For Money
        </button>
        <button
          onClick={() => onViewChange('support')}
          className={activeView === 'support' ? 'active' : ''}
        >
          Support
        </button>
        <button
          onClick={() => onViewChange('terms')}
          className={activeView === 'terms' ? 'active' : ''}
        >
          Terms
        </button>

      </div>

      {/* Admin Clear Data Section */}
      <div className="flex items-center gap-2 ml-4">
        <input
          type="email"
          value={clearEmail}
          onChange={(e) => setClearEmail(e.target.value)}
          placeholder="Email to clear"
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          style={{ minWidth: '180px' }}
        />
        <button
          onClick={handleClearData}
          disabled={isClearing}
          className="px-4 py-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors"
        >
          {isClearing ? 'Clearing...' : 'Clear'}
        </button>
        {clearMessage && (
          <span className={`text-sm font-medium ${clearMessage.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>
            {clearMessage}
          </span>
        )}
      </div>

      <button onClick={onGetStarted} className="btn-nav">Get Started →</button>
    </nav>
  );
}
