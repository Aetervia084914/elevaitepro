'use client';

export default function Footer({ onViewChange }) {
  const handleNavClick = (view) => {
    if (onViewChange) {
      onViewChange(view);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <footer>
      <div className="footer-logo">elev<em>AIte</em> pro</div>
      <div className="footer-links">
        <button 
          onClick={() => handleNavClick('features')}
          className="footer-link-btn"
        >
          Why elevAIte pro
        </button>
        <button 
          onClick={() => handleNavClick('how-it-works')}
          className="footer-link-btn"
        >
          How it Works
        </button>
        <button 
          onClick={() => handleNavClick('pricing')}
          className="footer-link-btn"
        >
          Value For Money
        </button>
        <button 
          onClick={() => handleNavClick('terms')}
          className="footer-link-btn"
        >
          Terms
        </button>
      </div>
      <div className="footer-copy">© 2026 elevAIte pro. All rights reserved.</div>
    </footer>
  );
}
