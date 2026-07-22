'use client';

export default function Navbar({ activeView, onViewChange, onRecruiterClick, onGetStarted }) {
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

      <button onClick={onGetStarted} className="btn-nav">Get Started →</button>
    </nav>
  );
}
