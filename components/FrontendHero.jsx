'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { ArrowRight } from 'lucide-react';

export default function FrontendHero({ onStartJourney, onViewPlans, prices }) {
  return (
    <section className="min-h-screen flex items-center pt-[120px] px-[30px] max-w-[1240px] mx-auto gap-[10px]" style={{ fontFamily: "var(--font-manrope), 'Manrope', ui-sans-serif, system-ui, sans-serif" }}>
      <div className='flex flex-col items-center w-full justify-center'>
            
          {/* Badge */}
          <div className="mb-6">
                  <div
                    className="relative inline-flex items-center justify-center gap-[10px] rounded-full py-[8px] pr-[16px] pl-[8px] overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #312e81 0%, #4338ca 40%, #6d28d9 70%, #7c3aed 100%)',
                      border: '1px solid rgba(167,139,250,0.4)',
                      backdropFilter: 'blur(24px) saturate(200%)',
                      WebkitBackdropFilter: 'blur(24px) saturate(200%)',
                      boxShadow: '0 8px 32px rgba(79,70,229,0.3), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.12)',
                    }}
                  >
                    <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
                    <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                    <div
                      className="relative w-[28px] h-[28px] rounded-full shrink-0 grid place-items-center overflow-hidden border border-white/25"
                      style={{ background: 'linear-gradient(145deg, #818cf8, #6366f1)', boxShadow: '0 4px 14px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' }}
                    >
                      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.35) 0%, transparent 55%)' }} />
                      <span className="relative z-[1] block w-[8px] h-[8px] bg-white rounded-full" style={{ boxShadow: '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.4)' }} />
                    </div>
                    <span className="relative z-[1] font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[10.5px] font-bold text-white tracking-[0.1em] uppercase" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                      The Simplest Way to Grow Your Career
                    </span>
                    <span
                      className="relative z-[1] overflow-hidden rounded-full px-[8px] py-[2px] text-[10px] font-bold text-white tracking-[0.04em] border border-white/25"
                      style={{ background: 'linear-gradient(145deg, #818cf8, #6366f1)', boxShadow: '0 2px 8px rgba(99,102,241,0.35)', textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}
                    >
                      <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 55%)' }} />
                      <span className="relative z-[1]">New</span>
                    </span>
                  </div>
          </div>    
          <div className="flex items-center  px-[30px] pb-[40px] max-w-[1240px] mx-auto gap-[10px]">
                {/* LEFT */}
                <div className="flex-1 min-w-0">

             

                  {/* Headline */}
                  <h1
                    className="font-extrabold leading-[1.04] mb-[22px] text-[#0f1e3d]"
                    style={{ fontFamily: "var(--font-bricolage-grotesque), var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontSize: 'clamp(46px, 5vw, 68px)', letterSpacing: '-0.04em' }}
                  >
                    <span style={{ background: 'linear-gradient(100deg, #3949AB, #818cf8, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 2px 10px rgba(129,140,248,0.3))' }}>
                      CLEAR
                    </span>
                    <br />
                    <span className="font-bold" style={{ color: 'rgba(138,158,197,0.85)' }}>SIMPLE</span>
                    <br />
                    <span style={{ background: 'linear-gradient(100deg, #3949AB, #818cf8, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 2px 10px rgba(129,140,248,0.3))' }}>
                      STRONG
                    </span>
                  </h1>

                  {/* Subheading */}
                  <p className="text-[15.5px] leading-[1.72] max-w-[500px] mb-[44px]" style={{ color: 'rgba(84,110,122,0.85)', fontWeight: 400, letterSpacing: '0.005em' }}>
                    An AI coach that helps you find your strengths, fix skill gaps, and get your dream job.
                  </p>

                  {/* CTAs */}
                  <div className="flex gap-[14px] items-center mb-[52px] flex-wrap">
                    <Button
                      onClick={onStartJourney}
                      className="h-12 group inline-flex items-center gap-[10px] text-white cursor-pointer py-[15px] px-[30px] rounded-[12px] text-[14px] font-semibold tracking-[0.02em] no-underline transition-all duration-300 relative overflow-hidden hover:-translate-y-1"
                      style={{
                        background: 'linear-gradient(145deg, #4338ca, #6366f1, #7c3aed)',
                        boxShadow: '0 6px 24px rgba(79,70,229,0.35), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 0 1px rgba(99,102,241,0.12)',
                        border: '1px solid rgba(167,139,250,0.3)',
                      }}
                    >
                      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.2) 0%, transparent 50%)' }} />
                      <span className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)' }} />
                      <span className="relative z-[1]">Start Journey</span>
                    </Button>

                    <Button
                      onClick={onViewPlans}
                      className="h-12 inline-flex items-center gap-[10px] text-[#1A237E] py-[15px] px-[28px] rounded-[12px] text-[14px] font-semibold no-underline cursor-pointer transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0.45))',
                        backdropFilter: 'blur(24px) saturate(200%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
                        border: '1px solid rgba(255,255,255,0.85)',
                        boxShadow: '0 4px 16px rgba(100,130,200,0.12), inset 0 1px 0 rgba(255,255,255,0.95), 0 0 0 1px rgba(255,255,255,0.3)',
                      }}
                    >
                      <span className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 50%)' }} />
                      <span className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)' }} />
                      <span className="relative z-[1]">View Plans</span>
                      <ArrowRight size={15} className="relative z-[1]" />
                    </Button>
                  </div>

                  {/* Trust row */}
                  <div className="flex items-center gap-4" />
                </div>

                {/* RIGHT — DASHBOARD */}
                <div className="w-[600px] shrink-0 flex flex-col gap-[10px]">
                  <Image
                    src="/images/image1.png"
                    alt="AI Career Dashboard"
                    width={850}
                    height={625}
                    className="relative z-10 w-full h-auto"
                    style={{ filter: 'drop-shadow(0 30px 60px rgba(30,63,168,0.22)) drop-shadow(0 8px 24px rgba(124,58,237,0.14))' }}
                  />
                </div>
          </div>
      </div>
    </section>
  );
}
