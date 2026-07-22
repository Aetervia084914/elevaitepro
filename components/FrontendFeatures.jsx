'use client';

import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

export default function Features() {
  return (
    <section className="features">
      <div className="features-header">
        <h2 className="features-title">
          MORE THAN JUST A <em className="cv-highlight">CV.</em>
        </h2>
        <p className="features-subtitle">
          Everyone deserves a great career.
          <br />
          We make career coaching simple, smart, and personal to you.
        </p>
      </div>
      <div className="feat-grid">
        {/* CARD 1: Violet/Radar - Smart AI Skill Intelligence */}
        <Card className="relative overflow-hidden rounded-[22px] border border-[rgba(160,139,255,0.32)] bg-gradient-to-br from-[#2d1f78] via-[#1e1458] to-[#12103a] transition-all duration-400 ease-out hover:-translate-y-2 cursor-default" style={{ boxShadow: '0 0 0 1px rgba(91,69,200,0.12) inset, 0 24px 60px rgba(10,6,40,0.7), 0 0 40px rgba(129,140,248,0.1), inset 0 1px 0 rgba(255,255,255,0.08)' }}>
          {/* Glass overlay */}
          <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.07) 0%, transparent 45%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px z-[5]" style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.5), transparent)' }} />
          {/* Radar rings decoration */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full rounded-full border border-[rgba(160,139,255,0.12)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full border border-[rgba(160,139,255,0.16)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[52%] h-[52%] rounded-full border border-[rgba(160,139,255,0.22)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32%] h-[32%] rounded-full border border-[rgba(160,139,255,0.30)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[16%] h-[16%] rounded-full border border-[rgba(160,139,255,0.50)] bg-[rgba(91,69,200,0.4)]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.9),0_0_24px_rgba(160,139,255,0.9)]" />
          </div>
          <div className="absolute top-0 right-[-40px] w-[200%] h-[200%] rounded-full border border-[rgba(160,139,255,0.08)] pointer-events-none" />
          <div className="absolute top-[18px] left-5 w-0 h-0 border-l-[18px] border-l-transparent border-r-[18px] border-r-transparent border-b-[30px] border-b-[rgba(160,139,255,0.22)] pointer-events-none" />
          <div className="absolute bottom-7 left-7 w-14 h-3.5 rounded-full bg-[rgba(160,139,255,0.18)] pointer-events-none" />
          
          <div className="relative z-10 p-8">
            <CardHeader className="flex flex-col items-start gap-3 p-0 mb-3">
              <div className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full border border-[rgba(160,139,255,0.35)] font-bold text-[9.5px] uppercase tracking-[0.12em] text-[#c4b5fd]" style={{ background: 'linear-gradient(135deg, rgba(91,69,200,0.28), rgba(91,69,200,0.12))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(160,139,255,0.2), inset 0 1px 0 rgba(255,255,255,0.1)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.12) 0%, transparent 55%)' }} />
                <span className="relative z-[1] inline-block w-[5px] h-[5px] rounded-full bg-[#a08bff]" style={{ boxShadow: '0 0 6px #a08bff, 0 0 14px rgba(160,139,255,0.6)' }} />
                <span className="relative z-[1]">AI POWERED</span>
              </div>
              <CardTitle className="font-[var(--font-bricolage-grotesque),var(--font-bricolage),Bricolage_Grotesque,sans-serif] text-[22px] font-extrabold leading-[1.2] text-white tracking-[-0.02em]" style={{ textShadow: '0 2px 10px rgba(160,139,255,0.25)' }}>Smart AI Skill Intelligence</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-[13.5px] font-normal leading-[1.72] text-white/70 mb-7" style={{ letterSpacing: '0.005em' }}>A clear analysis of your skills to support your career growth.</div>
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(91,69,200,0.35)] text-[#a08bff] ring-1 ring-[rgba(160,139,255,0.4)]" style={{ boxShadow: '0 2px 10px rgba(160,139,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Advanced support for your goals
                </div>
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(91,69,200,0.35)] text-[#a08bff] ring-1 ring-[rgba(160,139,255,0.4)]" style={{ boxShadow: '0 2px 10px rgba(160,139,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Compare yourself with the market
                </div>
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(91,69,200,0.35)] text-[#a08bff] ring-1 ring-[rgba(160,139,255,0.4)]" style={{ boxShadow: '0 2px 10px rgba(160,139,255,0.3), inset 0 1px 0 rgba(255,255,255,0.15)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Discover hidden strengths
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* CARD 2: Teal - Fix Skill Gaps */}
        <Card className="relative overflow-hidden rounded-[22px] border border-[rgba(45,212,191,0.25)] bg-gradient-to-br from-[#0d2a35] via-[#091e28] to-[#050f18] transition-all duration-400 ease-out hover:border-[rgba(45,212,191,0.4)] hover:-translate-y-2 cursor-default" style={{ boxShadow: '0 24px 60px rgba(5,10,20,0.8), 0 0 40px rgba(14,181,164,0.08), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
          {/* Glass overlay */}
          <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, transparent 45%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px z-[5]" style={{ background: 'linear-gradient(90deg, transparent, rgba(45,212,191,0.4), transparent)' }} />
          {/* Hexagonal mesh pattern */}
          <svg className="absolute top-0 right-0 w-[180px] h-[180px] opacity-35 pointer-events-none" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="60" x2="180" y2="60" stroke="#0eb5a4" strokeWidth="0.5"/>
            <line x1="0" y1="120" x2="180" y2="120" stroke="#0eb5a4" strokeWidth="0.5"/>
            <line x1="60" y1="0" x2="60" y2="180" stroke="#0eb5a4" strokeWidth="0.5"/>
            <line x1="120" y1="0" x2="120" y2="180" stroke="#0eb5a4" strokeWidth="0.5"/>
            <line x1="0" y1="0" x2="180" y2="180" stroke="#0eb5a4" strokeWidth="0.5"/>
            <line x1="60" y1="0" x2="180" y2="120" stroke="#0eb5a4" strokeWidth="0.5"/>
            <line x1="0" y1="60" x2="120" y2="180" stroke="#0eb5a4" strokeWidth="0.5"/>
            <circle cx="60" cy="60" r="3" fill="#0eb5a4"/>
            <circle cx="120" cy="60" r="3" fill="#0eb5a4"/>
            <circle cx="60" cy="120" r="3" fill="#0eb5a4"/>
            <circle cx="120" cy="120" r="3" fill="#2dd4bf" opacity="0.8"/>
          </svg>
          
          <div className="relative z-10 p-8">
            <CardHeader className="flex flex-col items-start gap-3 p-0 mb-3">
              <div className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full border border-[rgba(45,212,191,0.35)] font-bold text-[9.5px] uppercase tracking-[0.12em] text-[#2dd4bf]" style={{ background: 'linear-gradient(135deg, rgba(14,181,164,0.22), rgba(14,181,164,0.08))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(45,212,191,0.2), inset 0 1px 0 rgba(255,255,255,0.08)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
                <span className="relative z-[1] inline-block w-[5px] h-[5px] rounded-full bg-[#2dd4bf]" style={{ boxShadow: '0 0 6px #2dd4bf, 0 0 14px rgba(45,212,191,0.6)' }} />
                <span className="relative z-[1]">SKILL ANALYSIS</span>
              </div>
              <CardTitle className="font-[var(--font-bricolage-grotesque),var(--font-bricolage),Bricolage_Grotesque,sans-serif] text-[22px] font-extrabold leading-[1.2] text-white tracking-[-0.02em]" style={{ textShadow: '0 2px 10px rgba(45,212,191,0.2)' }}>Fix Skill Gaps</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-[13.5px] font-normal leading-[1.72] text-white/70 mb-7" style={{ letterSpacing: '0.005em' }}>Find exactly what is holding you back and fix it fast.</div>
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(14,181,164,0.3)] text-[#2dd4bf] ring-1 ring-[rgba(45,212,191,0.4)]" style={{ boxShadow: '0 2px 10px rgba(45,212,191,0.3), inset 0 1px 0 rgba(255,255,255,0.12)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Updates CV based on your progress
                </div>
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(14,181,164,0.3)] text-[#2dd4bf] ring-1 ring-[rgba(45,212,191,0.4)]" style={{ boxShadow: '0 2px 10px rgba(45,212,191,0.3), inset 0 1px 0 rgba(255,255,255,0.12)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Helpful learning resources in one place
                </div>
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(14,181,164,0.3)] text-[#2dd4bf] ring-1 ring-[rgba(45,212,191,0.4)]" style={{ boxShadow: '0 2px 10px rgba(45,212,191,0.3), inset 0 1px 0 rgba(255,255,255,0.12)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Track progress through clear milestones
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* CARD 3: Rose/Midnight - Your Career Partner */}
        <Card className="relative overflow-hidden rounded-[22px] border border-[rgba(244,63,142,0.25)] bg-gradient-to-br from-[#260d1e] via-[#180a14] to-[#0d060e] transition-all duration-400 ease-out hover:border-[rgba(244,63,142,0.4)] hover:-translate-y-2 cursor-default" style={{ boxShadow: '0 24px 60px rgba(5,3,10,0.85), 0 0 40px rgba(244,63,142,0.08), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
          {/* Glass overlay */}
          <div className="pointer-events-none absolute inset-0 z-[5]" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.05) 0%, transparent 45%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px z-[5]" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,142,0.4), transparent)' }} />
          {/* Scattered dots pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[22px]">
            <div className="absolute w-1 h-1 rounded-full bg-[rgba(244,63,142,0.3)]" style={{top: '14%', right: '18%', opacity: 0.6}} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[rgba(244,63,142,0.3)]" style={{top: '28%', right: '8%', opacity: 0.4}} />
            <div className="absolute w-[3px] h-[3px] rounded-full bg-[rgba(244,63,142,0.3)]" style={{top: '9%', right: '32%', opacity: 0.5}} />
            <div className="absolute w-1.5 h-1.5 rounded-full bg-[rgba(244,63,142,0.3)]" style={{top: '48%', right: '12%', opacity: 0.35}} />
            <div className="absolute w-2 h-2 rounded-full bg-[rgba(244,63,142,0.3)]" style={{top: '18%', right: '44%', opacity: 0.2}} />
            <div className="absolute -top-[60px] -right-[60px] w-[180px] h-[180px] rounded-full bg-[radial-gradient(circle,rgba(244,63,142,0.18)_0%,transparent_70%)]" />
          </div>
          {/* Waveform decoration */}
          <svg className="absolute bottom-0 left-0 right-0 w-full h-20 opacity-[0.18]" viewBox="0 0 400 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <polyline points="0,40 30,20 60,55 90,10 120,50 150,30 180,45 210,15 240,55 270,25 300,48 330,18 360,42 400,35" fill="none" stroke="#f43f8e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          
          <div className="relative z-10 p-8">
            <CardHeader className="flex flex-col items-start gap-3 p-0 mb-3">
              <div className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full border border-[rgba(244,63,142,0.35)] font-bold text-[9.5px] uppercase tracking-[0.12em] text-[#f43f8e]" style={{ background: 'linear-gradient(135deg, rgba(228,18,106,0.22), rgba(228,18,106,0.08))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: '0 2px 12px rgba(244,63,142,0.2), inset 0 1px 0 rgba(255,255,255,0.08)', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.1) 0%, transparent 55%)' }} />
                <span className="relative z-[1] inline-block w-[5px] h-[5px] rounded-full bg-[#f43f8e]" style={{ boxShadow: '0 0 6px #f43f8e, 0 0 14px rgba(244,63,142,0.6)' }} />
                <span className="relative z-[1]">CAREER COACH</span>
              </div>
              <CardTitle className="font-[var(--font-bricolage-grotesque),var(--font-bricolage),Bricolage_Grotesque,sans-serif] text-[22px] font-extrabold leading-[1.2] text-white tracking-[-0.02em]" style={{ textShadow: '0 2px 10px rgba(244,63,142,0.2)' }}>Your Career Partner</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="text-[13.5px] font-normal leading-[1.72] text-white/70 mb-7" style={{ letterSpacing: '0.005em' }}>We stay by your side until you reach the top.</div>
              <div className="flex flex-col gap-[10px]">
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(228,18,106,0.3)] text-[#f43f8e] ring-1 ring-[rgba(244,63,142,0.4)]" style={{ boxShadow: '0 2px 10px rgba(244,63,142,0.3), inset 0 1px 0 rgba(255,255,255,0.12)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Measure career goals to achieve success
                </div>
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(228,18,106,0.3)] text-[#f43f8e] ring-1 ring-[rgba(244,63,142,0.4)]" style={{ boxShadow: '0 2px 10px rgba(244,63,142,0.3), inset 0 1px 0 rgba(255,255,255,0.12)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Identify skills needed to reach goals
                </div>
                <div className="flex items-center gap-[10px] text-[13px] text-white/85 font-medium">
                  <div className="relative overflow-hidden w-[18px] h-[18px] rounded-full grid place-items-center text-[10px] flex-shrink-0 bg-[rgba(228,18,106,0.3)] text-[#f43f8e] ring-1 ring-[rgba(244,63,142,0.4)]" style={{ boxShadow: '0 2px 10px rgba(244,63,142,0.3), inset 0 1px 0 rgba(255,255,255,0.12)' }}><span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.18) 0%, transparent 55%)' }} /><span className="relative z-[1]">✓</span></div> 
                  Close career gaps with smarter direction
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </section>
  );
}
