'use client';

import { useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';

const steps = [
  {
    num: '01',
    label: 'FOUNDATION',
    icon: '🎯',
    iconClass: 'iw1',
    title: 'Set Your Target Role',
    desc: 'Choose the role, level & industry you\'re aiming for with precision. The AI calibrates everything to your destination.',
    tagClass: 't1',
    hoverClass: 'hover-blue',
    badge: { color: '#818cf8', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.38)', glow: '0 0 14px rgba(99,102,241,0.28), 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' },
  },
  {
    num: '02',
    label: 'EVALUATION',
    icon: '🧠',
    iconClass: 'iw2',
    title: 'Self-Assessment',
    desc: 'Complete a structured competency & soft skill evaluation. Measures what hiring managers actually test for.',
    tagClass: 't2',
    hoverClass: 'hover-cyan',
    badge: { color: '#a78bfa', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.38)', glow: '0 0 14px rgba(139,92,246,0.28), 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' },
  },
  {
    num: '03',
    label: 'INSIGHT',
    icon: '📊',
    iconClass: 'iw3',
    title: 'Your Gap Report',
    desc: 'Receive a personalised breakdown: strengths, gaps, blind spots. Know exactly what\'s holding you back.',
    tagClass: 't3',
    hoverClass: 'hover-violet',
    badge: { color: '#c084fc', bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.38)', glow: '0 0 14px rgba(168,85,247,0.28), 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' },
  },
  {
    num: '04',
    label: 'GROWTH',
    icon: '📚',
    iconClass: 'iw4',
    title: 'Curated Learning Plan',
    desc: 'Get course & resource recommendations matched to each gap — no generic lists, only what you need.',
    tagClass: 't4',
    hoverClass: 'hover-sky',
    badge: { color: '#e879f9', bg: 'rgba(217,70,239,0.12)', border: 'rgba(217,70,239,0.38)', glow: '0 0 14px rgba(217,70,239,0.28), 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' },
  },
  {
    num: '05',
    label: 'LAUNCH',
    icon: '🚀',
    iconClass: 'iw5',
    title: 'Apply With Confidence',
    desc: 'Track progress, re-assess, and step into interviews ready. The data proves you\'re qualified.',
    tagClass: 't5',
    hoverClass: 'hover-teal',
    badge: { color: '#fb7185', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.38)', glow: '0 0 14px rgba(244,63,94,0.28), 0 2px 8px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)' },
  },
];

const stats = [
  {
    num: '87%',
    label: 'Average readiness score after completing all 5 steps',
    sub: 'vs. 34% industry average for self-taught candidates',
  },
  {
    num: '3.2×',
    label: 'Faster time-to-offer compared to unguided job seekers',
    sub: 'Based on 2,400+ elevAIte pro users tracked over 6 months',
  },
  {
    num: '94%',
    label: 'User satisfaction rating across the full journey',
    sub: '"It felt like having a career coach in my pocket — always on."',
  },
];

export default function UserJourney() {
  const starsRef = useRef(null);

  useEffect(() => {
    const c = starsRef.current;
    if (!c) return;
    const x = c.getContext('2d');
    let W, H, animId;

    function resize() {
      W = c.width = c.offsetWidth;
      H = c.height = c.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const stars = [];
    for (let i = 0; i < 180; i++) {
      stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.2 + 0.2,
        o: Math.random() * 0.6 + 0.1,
        speed: Math.random() * 0.4 + 0.1,
      });
    }

    function draw() {
      x.clearRect(0, 0, W, H);
      stars.forEach(s => {
        s.o += Math.sin(Date.now() * s.speed * 0.001) * 0.008;
        s.o = Math.max(0.05, Math.min(0.8, s.o));
        x.beginPath();
        x.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        x.fillStyle = `rgba(255,255,255,${s.o})`;
        x.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section className="uj-section">
      <canvas ref={starsRef} className="uj-stars" />
      <div className="uj-orbs">
        <div className="uj-orb uj-ob1"></div>
        <div className="uj-orb uj-ob2"></div>
        <div className="uj-orb uj-ob3"></div>
        <div className="uj-orb uj-ob4"></div>
      </div>
      <div className="uj-hero">
        <h2 className="uj-heading">
          From <span className="uj-grad">&ldquo;I want that job&rdquo;</span>
          <br />to <span className="uj-grad">&ldquo;I&rsquo;m ready.&rdquo;</span>
        </h2>
        <p className="uj-sub">
          Five AI-powered milestones — from clarity to confidence. Every step is data-driven, every hour lands on exactly the right gap.
        </p>
        <div
          className="relative overflow-hidden rounded-[16px] px-8 py-5 text-sm italic leading-relaxed text-white/90"
          style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(139,92,246,0.18) 50%, rgba(109,40,217,0.22) 100%)',
            border: '1px solid rgba(167,139,250,0.3)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 8px 32px rgba(79,70,229,0.25), inset 0 1px 0 rgba(255,255,255,0.12), 0 0 0 1px rgba(99,102,241,0.08)',
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, transparent 50%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }} />
          <span className="relative z-[1]">&ldquo;elevAIte pro doesn&rsquo;t replace hard work — it makes sure every hour of effort lands on exactly the right gap.&rdquo;</span>
        </div>
      </div>

      <div className="uj-steps-section">
        <div className="uj-steps-label">
          <div className="uj-sl-ln"></div>
          Five Steps to Career Launch
          <div className="uj-sl-ln r"></div>
        </div>

        <div className="uj-steps-grid">
          {steps.map((step, i) => (
            <Card key={i} className={`uj-step-card ${step.hoverClass}`}>
              <div
                className="relative inline-flex items-center gap-[6px] overflow-hidden rounded-full px-[10px] py-[4px] mb-4 text-[10px] font-bold tracking-[0.11em] uppercase"
                style={{
                  background: step.badge.bg,
                  border: `1px solid ${step.badge.border}`,
                  color: step.badge.color,
                  boxShadow: step.badge.glow,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
              >
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
                <div className="pointer-events-none absolute left-[12%] right-[12%] top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${step.badge.color}33, transparent)` }} />
                <span
                  className="relative z-[1] inline-block w-[5px] h-[5px] rounded-full flex-shrink-0"
                  style={{ background: step.badge.color, boxShadow: `0 0 6px ${step.badge.color}` }}
                />
                <span className="relative z-[1]">{step.num} / {step.label}</span>
              </div>
              <div className={`uj-sc-icon-wrap ${step.iconClass}`}>{step.icon}</div>
              <div className="uj-sc-title">{step.title}</div>
              <div className="uj-sc-desc">{step.desc}</div>
            </Card>
          ))}
        </div>

    
      </div>
    </section>
  );
}
