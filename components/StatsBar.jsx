'use client';

export default function StatsBar({ text = 'Our Promises' }) {
  return (
    <div className="v2-trust-bar">
      <div className="v2-trust-inner">
        {/* Left decorative line + dot */}
        <div className="flex items-center gap-[10px] flex-shrink-0">
          <div style={{ width: 48, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(57,73,171,0.35), rgba(0,188,212,0.4))', borderRadius: 999 }} />
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 6px #818cf8, 0 0 14px rgba(129,140,248,0.5)', flexShrink: 0 }} />
        </div>

        {/* Main text */}
        <div className="promise-text">{text}</div>

        {/* Right decorative dot + line */}
        <div className="flex items-center gap-[10px] flex-shrink-0">
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee, 0 0 14px rgba(34,211,238,0.5)', flexShrink: 0 }} />
          <div style={{ width: 48, height: 1.5, background: 'linear-gradient(90deg, rgba(34,211,238,0.4), rgba(124,77,255,0.35), transparent)', borderRadius: 999 }} />
        </div>
      </div>
    </div>
  );
}
