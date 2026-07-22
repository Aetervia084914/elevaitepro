'use client';

import Link from 'next/link';

export default function CtaBand() {
  const bullets = [
    'Clarity for your next move. Confidence for every step after.',
    'Ship your career roadmap in minutes — not months of confusion.',
    'Discover what comes next — and how to get there.',
    'Turn ambition into a clear career path.',
    'Find your direction. Build the right skills. Move forward with confidence.',
    'The smarter way to plan your next career move.',
  ];

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', padding: '0 48px 60px' }}>
      <div className="cta-band">
        <div className="cta-text-col">
          <div
            style={{
              fontFamily: 'var(--font-bricolage), "Bricolage Grotesque", sans-serif',
              fontWeight: '800',
              letterSpacing: '-1px',
              background: 'linear-gradient(135deg, #ffffff 0%, #a8c8ff 40%, #7eb8f7 70%, #c084fc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textAlign: 'center',
            }}
            className='text-3xl'
          >
            Ready to Launch Your Dream Career?
          </div>

          <div className="cta-bullets-card">
            <ul className="cta-bullets-list">
              {bullets.map((item, i) => (
                <li key={i} className="cta-bullet-item">
                  <span className="cta-bullet-icon">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="cta-actions">
          <Link href="/" className="btn-cta-white">Start Journey →</Link>
          <Link href="/" className="btn-cta-outline">⊙ View Pricing Plans</Link>
        </div>
      </div>

      <style>{`
        .cta-bullets-card {
          margin-top: 20px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px;
          padding: 24px 28px;
          backdrop-filter: blur(10px);
        }

        .cta-bullets-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .cta-bullet-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          font-size: 15px;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.85);
        }

        .cta-bullet-icon {
          flex-shrink: 0;
          margin-top: 2px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
