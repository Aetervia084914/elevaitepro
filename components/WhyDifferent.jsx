'use client';

import { cn } from '@/lib/utils';
import { Card } from './ui/card';

export default function WhyDifferent() {
  return (
<div className="relative z-2 min-h-screen flex flex-col items-center px-6 py-10 sm:px-24 sm:py-6" style={{ fontFamily: "var(--font-manrope), 'Manrope', ui-sans-serif, system-ui, sans-serif" }}>
      
      {/* Eyebrow */}
      <div
        className="mt-[88px] mb-[18px] relative inline-flex items-center gap-[10px] overflow-hidden rounded-full px-[18px] py-[8px] animate-[wd-up_0.55s_ease_both]"
        style={{
          background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #6d28d9 70%, #7c3aed 100%)',
          border: '1px solid rgba(167,139,250,0.4)',
          boxShadow: '0 8px 32px rgba(79,70,229,0.35), 0 2px 8px rgba(139,92,246,0.25), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.15), 0 0 40px rgba(99,102,241,0.12)',
        }}
      >
        {/* Gloss overlay */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 45%, transparent 100%)' }} />
        {/* Top shine line */}
        <div className="pointer-events-none absolute left-[10%] right-[10%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)' }} />
        {/* Bottom subtle shine */}
        <div className="pointer-events-none absolute left-[15%] right-[15%] bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.25), transparent)' }} />
        {/* Left gradient bar */}
        <div className="relative z-[1] w-6 h-[2.5px] rounded-full" style={{ background: 'linear-gradient(90deg, #c4b5fd, #818cf8, #22d3ee)', boxShadow: '0 0 8px rgba(129,140,248,0.6)' }} />
        {/* Glowing dot */}
        <span className="relative z-[1] inline-block h-[5px] w-[5px] rounded-full flex-shrink-0" style={{ background: '#a78bfa', boxShadow: '0 0 6px #a78bfa, 0 0 14px rgba(167,139,250,0.6)' }} />
        {/* Label */}
        <span className="relative z-[1] font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[10.5px] font-bold tracking-[0.14em] uppercase text-white" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>Competitive Advantage</span>
        {/* Glowing dot */}
        <span className="relative z-[1] inline-block h-[5px] w-[5px] rounded-full flex-shrink-0" style={{ background: '#22d3ee', boxShadow: '0 0 6px #22d3ee, 0 0 14px rgba(34,211,238,0.6)' }} />
        {/* Right gradient bar */}
        <div className="relative z-[1] w-6 h-[2.5px] rounded-full" style={{ background: 'linear-gradient(90deg, #22d3ee, #818cf8, #c4b5fd)', boxShadow: '0 0 8px rgba(34,211,238,0.6)' }} />
      </div>

      {/* Headline */}
      <h1 className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[clamp(28px,4.8vw,56px)] font-black leading-[1.08] text-center text-[#221c5a] mb-4 tracking-[-0.035em] animate-[wd-up_0.55s_0.08s_ease_both]">
        Other Tools <span className="text-[rgba(49,46,129,0.35)]">&</span> elev<span className="bg-gradient-to-r from-violet-500 via-blue-600 to-cyan-400 bg-clip-text text-transparent" style={{ filter: 'drop-shadow(0 2px 8px rgba(99,102,241,0.25))' }}>AI</span>te pro
      </h1>

      {/* Subtitle */}
      <p className="max-w-[620px] text-center text-[15px] leading-[1.75] text-[rgba(49,46,129,0.62)] mb-[42px] animate-[wd-up_0.55s_0.14s_ease_both]">
        Every other tool asks <em className="not-italic font-bold bg-gradient-to-r from-rose-400 via-violet-500 to-blue-600 bg-clip-text text-transparent">"where have you been?"</em>
        <br />
        elevAIte pro asks <em className="not-italic font-bold bg-gradient-to-r from-rose-400 via-violet-500 to-blue-600 bg-clip-text text-transparent">"what does it take to get where you're going?"</em>
      </p>

      {/* Split Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] max-w-[1020px] w-full animate-[wd-up_0.55s_0.2s_ease_both]">

        {/* ── Other Tools Card ─────────────────────────────── */}
        <Card
          className="relative overflow-hidden rounded-[24px] border py-0 gap-0 transition-all duration-300 hover:-translate-y-1"
          style={{
            background: 'linear-gradient(160deg, rgba(255,245,245,0.97) 0%, rgba(255,237,237,0.94) 50%, rgba(255,240,250,0.92) 100%)',
            backdropFilter: 'blur(40px) saturate(200%)',
            WebkitBackdropFilter: 'blur(40px) saturate(200%)',
            borderColor: 'rgba(239,68,68,0.18)',
            boxShadow: '0 24px 80px rgba(220,38,38,0.12), 0 8px 32px rgba(239,68,68,0.08), inset 0 1px 0 rgba(255,255,255,0.98), 0 0 0 1px rgba(255,255,255,0.4)',
          }}
        >
          {/* Glass shine */}
          <div className="pointer-events-none absolute inset-0 rounded-[24px]" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 100%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)' }} />

          {/* Header */}
          <div
            className="relative px-6 py-5 flex items-center justify-center gap-4 border-b overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 35%, #b91c1c 65%, #be123c 100%)',
              borderColor: 'rgba(255,255,255,0.12)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.12)',
            }}
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
            <div className="pointer-events-none absolute left-[5%] right-[5%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)' }} />
            <div className="relative w-10 h-10 rounded-[12px] flex items-center justify-center text-[16px] shrink-0 overflow-hidden border border-white/30" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 8px 20px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.35)' }}>
              <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
              <span className="relative z-[1]">🚫</span>
            </div>
            <div className="text-center">
              <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[13px] font-bold text-white tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.35)' }}>
                Other AI Models
              </div>
              <div className="text-[10px] mt-[2px] font-semibold text-red-200/85 tracking-wide">
                Outdated approach
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="relative py-1 pb-2">
            {[
              'Rewrites your CV',
              'Generic skill suggestions',
              'Ignores soft skills',
              'One-size-fits-all learning paths',
              'No feedback loop',
            ].map((text, i) => (
              <div
                key={i}
                className={`relative px-6 py-[13px] flex items-center gap-3.5 transition-all duration-200 hover:bg-rose-50/70 ${i < 4 ? 'border-b border-rose-100/60' : ''} wd-row-animate wd-row-delay-${i + 1}`}
              >
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 text-[10px] font-black overflow-hidden relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(254,202,202,0.95) 0%, rgba(252,165,165,0.85) 100%)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#b91c1c',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
                  }}
                >
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.4) 0%, transparent 55%)' }} />
                  <span className="relative z-[1]">✕</span>
                </div>
                <div className="text-[13px] leading-[1.6] text-slate-500 line-through decoration-rose-400/50 decoration-[1.5px]">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── elevAIte pro Card ─────────────────────────────────── */}
        <Card
          className="relative overflow-hidden rounded-[24px] border py-0 gap-0 transition-all duration-300 hover:-translate-y-1"
          style={{
            background: 'linear-gradient(160deg, rgba(238,242,255,0.97) 0%, rgba(237,233,254,0.94) 50%, rgba(224,242,254,0.92) 100%)',
            backdropFilter: 'blur(40px) saturate(220%)',
            WebkitBackdropFilter: 'blur(40px) saturate(220%)',
            borderColor: 'rgba(99,102,241,0.22)',
            boxShadow: '0 24px 90px rgba(79,70,229,0.16), 0 8px 36px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.98), 0 0 0 1px rgba(255,255,255,0.4)',
          }}
        >
          {/* Glass shine */}
          <div className="pointer-events-none absolute inset-0 rounded-[24px]" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.1) 40%, transparent 100%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)' }} />

          {/* Header */}
          <div
            className="relative px-6 py-5 flex items-center justify-center gap-4 border-b overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 62%, #6d28d9 100%)',
              borderColor: 'rgba(255,255,255,0.12)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.12)',
            }}
          >
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.03) 45%, transparent 100%)' }} />
            <div className="pointer-events-none absolute left-[5%] right-[5%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)' }} />
            <div
              className="relative w-10 h-10 rounded-[12px] flex items-center justify-center text-[16px] shrink-0 border border-white/25 overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 45%, #06b6d4 100%)',
                boxShadow: '0 12px 28px rgba(79,70,229,0.45), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 16px rgba(99,102,241,0.25)',
              }}
            >
              <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.35) 0%, transparent 55%)' }} />
              <span className="relative z-[1]">✨</span>
            </div>
            <div className="text-center">
              <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[13px] font-bold text-white tracking-wide" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                elevAIte pro
              </div>
              <div className="text-[10px] mt-[2px] font-semibold text-indigo-200/85 tracking-wide">
                Intelligence-first platform
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="relative py-1 pb-2">
            {[
              "Diagnoses what's actually missing from your profile",
              'Gap-mapped course recommendations tied to your target role',
              'Assesses communication, leadership & EQ alongside hard skills',
              'Personalised journeys built on your exact competency gaps',
              'Tracks progress, re-assesses gaps, evolves with you',
            ].map((text, i) => (
              <div
                key={i}
                className={`relative px-6 py-[13px] flex items-center gap-3.5 transition-all duration-200 hover:bg-indigo-50/60 ${i < 4 ? 'border-b border-indigo-100/50' : ''} wd-row-animate wd-row-delay-${i + 6}`}
              >
                <div
                  className="w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 text-[10px] font-black overflow-hidden relative"
                  style={{
                    background: 'linear-gradient(135deg, rgba(199,210,254,0.95) 0%, rgba(165,180,252,0.85) 100%)',
                    border: '1px solid rgba(99,102,241,0.28)',
                    color: '#4338ca',
                    boxShadow: '0 2px 8px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.6)',
                  }}
                >
                  <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.45) 0%, transparent 55%)' }} />
                  <span className="relative z-[1]">✓</span>
                </div>
                <div className="text-[13px] leading-[1.6] text-slate-700 font-semibold">
                  {text}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quote */}
      <div className="mt-[32px] max-w-[1020px] w-full relative overflow-hidden px-10 py-7 rounded-[20px] border flex items-center gap-6 animate-[wd-up_0.55s_0.72s_ease_both] md:px-10 md:py-7 md:items-center md:gap-6 sm:px-6 sm:py-6 sm:items-start sm:gap-4 wd-quote-gradient" style={{ background: 'linear-gradient(135deg, #643AAE 0%, #5B36A3 25%, #503297 50%, #452C89 75%, #3C2A7A 100%)', borderColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', boxShadow: '0 20px 60px rgba(79,70,229,0.28), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.1), 0 0 40px rgba(129,140,248,0.1)' }}>
        {/* Glass overlays */}
        <div className="pointer-events-none absolute inset-0 rounded-[20px]" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 40%, transparent 100%)' }} />
        <div className="pointer-events-none absolute inset-0 rounded-[20px]" style={{ background: 'linear-gradient(340deg, rgba(255,255,255,0.1) 0%, transparent 40%)' }} />
        <div className="pointer-events-none absolute left-[5%] right-[5%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent)' }} />
        <div className="pointer-events-none absolute left-[10%] right-[10%] bottom-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)' }} />
        {/* Animated shine */}
        <div className="pointer-events-none absolute inset-0 rounded-[20px] overflow-hidden">
          <div className="absolute -top-[100%] left-0 w-full h-full bg-gradient-to-b from-white/30 via-transparent to-transparent animate-[shine-vertical_3s_ease-in-out_infinite]"></div>
        </div>
        <div className="relative w-[4px] h-[60px] rounded-full shrink-0" style={{ background: 'linear-gradient(180deg, #ffffff, rgba(255,255,255,0.8), rgba(255,255,255,0.5))', boxShadow: '0 0 24px rgba(255,255,255,0.6), 0 0 48px rgba(255,255,255,0.25), 0 0 8px rgba(167,139,250,0.4)' }}></div>
        <div className="relative text-[clamp(13px,1.5vw,15.5px)] leading-[1.72] text-white/95 italic" style={{ textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
          The gap between potential and opportunity is measurable.
          <br />
          <em className="not-italic font-extrabold text-white" style={{ textShadow: '0 2px 10px rgba(255,255,255,0.45)' }}>elevAIte pro measures it — then closes it.</em>
        </div>
      </div>
    </div>
  );
}
