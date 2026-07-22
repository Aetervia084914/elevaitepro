
import React from 'react';
import { 
  UserPlus, LogIn, ArrowRight, Orbit, ChevronLeft, ArrowUpRight,
  Target, TrendingUp, Zap, Cpu, Code, Globe, Brain 
} from 'lucide-react';

export const OnboardingStepChoice = ({ onSelectAction, onBack }) => {
  const trendingSkills = [
    { name: 'Generative AI Strategy', growth: '+42%', icon: Cpu, color: 'text-amber-500' },
    { name: 'Cloud Native Arch', growth: '+28%', icon: Globe, color: 'text-blue-500' },
    { name: 'Predictive Analytics', growth: '+30%', icon: TrendingUp, color: 'text-emerald-500' },
  ];

  return (
    <section className="relative flex min-h-screen w-full overflow-hidden bg-[var(--hybrid-sand)] [font-family:var(--font-manrope),ui-sans-serif,system-ui,sans-serif]">
      <div className="hidden lg:flex lg:w-[400px] lg:min-w-[360px] lg:shrink-0 lg:flex-col lg:overflow-hidden lg:px-[34px] lg:pb-[22px] lg:pt-[22px] text-white bg-[linear-gradient(155deg,var(--hybrid-indigo-900)_0%,var(--hybrid-indigo-700)_30%,var(--hybrid-violet-700)_58%,var(--hybrid-cyan-700)_85%,var(--hybrid-cyan-600)_100%)] relative">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.12)_0%,rgba(255,255,255,0.02)_45%,transparent_100%)]" />
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-[3] h-[1.5px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.8),rgba(216,216,255,0.9),rgba(255,255,255,0.8),transparent)]" />
        <div className="pointer-events-none absolute -right-20 -top-24 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_65%)]" />

        <div className="relative z-[2] mb-5 flex items-center gap-3">
          <div className="relative grid h-[42px] w-[42px] place-items-center overflow-hidden rounded-full border border-white/40 shadow-[0_4px_20px_rgba(129,140,248,0.35),inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(255,255,255,0.12)]" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.10))', backdropFilter: 'blur(16px) saturate(200%)', WebkitBackdropFilter: 'blur(16px) saturate(200%)' }}>
            <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.35) 0%, transparent 55%)' }} />
            <Brain className="relative z-[1] h-5 w-5" style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' }} />
          </div>
          <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[16px] font-extrabold tracking-[-0.01em] text-white" style={{ textShadow: '0 1px 8px rgba(129,140,248,0.35)' }}>
            elevAIte pro
          </div>
        </div>

        <div
          className="relative z-[2] mb-3 inline-flex w-fit items-center gap-[7px] overflow-hidden rounded-full px-[14px] py-[6px]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.26)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.18) inset, 0 -1px 0 rgba(0,0,0,0.12) inset, 0 0 0 1px rgba(129,140,248,0.12)',
          }}
        >
          {/* Gloss overlay */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)' }}
          />
          {/* Top shine line */}
          <div
            className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.75), transparent)' }}
          />
          {/* Icon */}
          <span className="relative z-[1]" style={{ filter: 'drop-shadow(0 0 5px rgba(167,139,250,0.9))' }}>
            <Code className="h-[13px] w-[13px] text-[#c4b5fd]" />
          </span>
          {/* Label */}
          <span className="relative z-[1] text-[10px] font-bold tracking-[0.12em] uppercase text-white">
            Career Intelligence
          </span>
          {/* Glowing dot */}
          <span
            className="relative z-[1] ml-[1px] inline-block h-[5px] w-[5px] flex-shrink-0 rounded-full"
            style={{ background: '#818cf8', boxShadow: '0 0 6px #818cf8, 0 0 14px rgba(129,140,248,0.55)' }}
          />
        </div>

        <h2 className="relative z-[2] mb-2 font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[21px] font-extrabold leading-[1.3] tracking-[-0.025em] text-white" style={{ textShadow: '0 2px 12px rgba(129,140,248,0.2)' }}>
          Know what career suits you
        </h2>

        <p className="relative z-[2] mb-4 text-[12px] leading-[1.65] text-white/55">
          elevAIte pro uses advanced neural mapping to decode industry demand and suggest high-impact skills that accelerate your specific trajectory.
        </p>

        <div className="relative z-[2] mb-[6px] inline-flex w-fit items-center gap-[5px] overflow-hidden rounded-full px-[10px] py-[3px] text-[9px] font-bold uppercase tracking-[0.16em] text-white/55" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)' }}>
          <span className="inline-block h-[4px] w-[4px] rounded-full bg-[#f0abfc]" style={{ boxShadow: '0 0 5px #e879f9' }} />
          Trending Nodes
        </div>

        <div className="relative z-[2] flex flex-col gap-[4px]">
          {trendingSkills.map((skill, idx) => (
            <div
              key={idx}
              className="group relative flex cursor-default items-center gap-[11px] overflow-hidden rounded-[10px] px-3 py-[7px] transition-all duration-300 hover:translate-x-[5px]"
              style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)', boxShadow: '0 2px 10px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
            >
              <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08), transparent 60%)' }} />
              <div className="pointer-events-none absolute left-[10%] right-[10%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
              <div className="relative grid h-7 w-7 place-items-center overflow-hidden rounded-[8px] text-[12px]" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.18), rgba(255,255,255,0.06))', border: '1px solid rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2)' }}>
                <skill.icon className={`h-[14px] w-[14px] ${skill.color}`} style={{ filter: 'drop-shadow(0 0 3px currentColor)' }} />
              </div>
              <span className="relative z-[1] flex-1 text-[12px] font-semibold text-white/85">{skill.name}</span>
              <span className="relative z-[1] text-[11.5px] font-bold text-[#6EE7B7]" style={{ textShadow: '0 0 8px rgba(110,231,183,0.5)' }}>{skill.growth}</span>
            </div>
          ))}
        </div>

        <div className="relative z-[2] mt-2 flex items-center gap-[10px] overflow-hidden rounded-[12px] px-3 py-[8px]" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 100%)', border: '1px solid rgba(105,240,174,0.22)', backdropFilter: 'blur(16px) saturate(180%)', WebkitBackdropFilter: 'blur(16px) saturate(180%)', boxShadow: '0 4px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 20px rgba(105,240,174,0.08)' }}>
          <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.16) 0%, transparent 50%)' }} />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(105,240,174,0.35), transparent)' }} />
          <div className="relative grid h-[30px] w-[30px] place-items-center overflow-hidden rounded-[8px] bg-[linear-gradient(135deg,var(--hybrid-cyan-600),#22D3EE)]" style={{ boxShadow: '0 2px 12px rgba(34,211,238,0.4), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
            <Target className="h-[14px] w-[14px] text-white" style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.7))' }} />
          </div>
          <div className="relative z-[1]">
            <p className="mb-[2px] text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300/90" style={{ textShadow: '0 0 6px rgba(105,240,174,0.5)' }}>Target Accuracy</p>
            <p className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[13px] font-extrabold text-white">98.4% Skill Match</p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="relative z-[2] mt-auto inline-flex items-center gap-[6px] overflow-hidden rounded-full px-[12px] py-[5px] text-[11px] font-medium text-white/45 transition-all duration-300 hover:text-white/80"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          >
            <ChevronLeft className="h-[13px] w-[13px]" />
            Return to Landing
          </button>
        )}
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[var(--hybrid-sand)] px-6 py-6 [font-family:var(--font-manrope),ui-sans-serif,system-ui,sans-serif] sm:px-10 lg:px-[60px]">
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(-45deg,transparent,transparent_18px,rgba(0,0,0,0.02)_18px,rgba(0,0,0,0.02)_19px)]" />

        <div className="relative z-[1] grid w-full max-w-[720px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          <button
            type="button"
            onClick={() => onSelectAction(false)}
            className="group relative overflow-hidden rounded-[22px] text-left transition-all duration-300 ease-out hover:-translate-y-3 hover:scale-[1.024] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 shadow-[0_12px_40px_rgba(57,73,171,0.28),0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.6)] hover:shadow-[0_24px_64px_rgba(57,73,171,0.4),0_4px_12px_rgba(0,0,0,0.1),0_0_30px_rgba(99,102,241,0.12)]"
          >
            <div className="relative flex h-[175px] flex-col justify-end bg-[linear-gradient(145deg,var(--hybrid-journey-start),var(--hybrid-journey-mid),var(--hybrid-journey-end))] p-[22px] text-white">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(175deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_40%,transparent_60%)]" />
              <div className="pointer-events-none absolute left-[5%] right-[5%] top-0 h-[1.5px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
              <div className="pointer-events-none absolute bottom-0 left-[10%] right-[10%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)]" />
              <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center overflow-hidden rounded-[11px] border border-white/35 text-white transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.10))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 12px rgba(0,0,0,0.15)' }}>
                <ArrowUpRight className="h-[14px] w-[14px]" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} />
              </div>
              <div className="relative grid h-[46px] w-[46px] place-items-center overflow-hidden rounded-[14px] border border-white/40" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.3), rgba(255,255,255,0.10))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.18)' }}>
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
                <UserPlus className="relative z-[1] h-[23px] w-[23px]" style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))' }} />
              </div>
            </div>

            <div className="relative overflow-hidden bg-white px-6 pb-[26px] pt-[22px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(99,102,241,0.03)_0%,transparent_40%)]" />
              <div className="relative z-[1] mb-[7px] font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[18px] font-bold tracking-[-0.022em] text-[var(--hybrid-ink)]">NEW JOURNEY</div>
              <p className="relative z-[1] mb-5 text-[12px] font-normal leading-[1.65] text-[var(--hybrid-muted)]">
                Architect your professional career with neural precision.
              </p>
              <div className="relative z-[1] inline-flex items-center gap-[7px] overflow-hidden rounded-[10px] px-[18px] py-[11px] text-[13px] font-semibold text-white transition-all duration-200 group-hover:shadow-[0_8px_28px_rgba(57,73,171,0.5)]" style={{ background: 'linear-gradient(135deg, #3949AB, #5C6BC0)', boxShadow: '0 4px 16px rgba(57,73,171,0.35), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px rgba(57,73,171,0.15)' }}>
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 50%)' }} />
                <span className="relative z-[1]">Sign Up</span>
                <ArrowRight className="relative z-[1] h-[14px] w-[14px]" />
              </div>
            </div>

            <div className="absolute right-5 top-[144px] z-[2] grid h-9 w-9 place-items-center overflow-hidden rounded-full text-white" style={{ background: 'linear-gradient(145deg, #3949AB, #2A3B65)', boxShadow: '0 4px 16px rgba(57,73,171,0.45), 0 0 12px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
              <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 55%)' }} />
              <Zap className="relative z-[1] h-[14px] w-[14px]" style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' }} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => onSelectAction(true)}
            className="group relative overflow-hidden rounded-[22px] text-left transition-all duration-300 ease-out hover:-translate-y-3 hover:scale-[1.024] focus:outline-none focus:ring-2 focus:ring-cyan-600/30 shadow-[0_12px_40px_rgba(6,182,212,0.28),0_2px_8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.6)] hover:shadow-[0_24px_64px_rgba(6,182,212,0.4),0_4px_12px_rgba(0,0,0,0.1),0_0_30px_rgba(6,182,212,0.12)]"
          >
            <div className="relative flex h-[175px] flex-col justify-end bg-[linear-gradient(145deg,var(--hybrid-returning-start),var(--hybrid-returning-mid),var(--hybrid-returning-end))] p-[22px] text-white">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(175deg,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0.04)_40%,transparent_60%)]" />
              <div className="pointer-events-none absolute left-[5%] right-[5%] top-0 h-[1.5px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.95),transparent)]" />
              <div className="pointer-events-none absolute bottom-0 left-[10%] right-[10%] h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)]" />
              <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center overflow-hidden rounded-[11px] border border-white/35 text-white transition-all duration-200 group-hover:translate-x-[2px] group-hover:-translate-y-[2px]" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.28), rgba(255,255,255,0.10))', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 4px 12px rgba(0,0,0,0.15)' }}>
                <ArrowUpRight className="h-[14px] w-[14px]" style={{ filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.5))' }} />
              </div>
              <div className="relative grid h-[46px] w-[46px] place-items-center overflow-hidden rounded-[14px] border border-white/40" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.3), rgba(255,255,255,0.10))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 4px 16px rgba(0,0,0,0.18)' }}>
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.3) 0%, transparent 55%)' }} />
                <LogIn className="relative z-[1] h-[23px] w-[23px]" style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.5))' }} />
              </div>
            </div>

            <div className="relative overflow-hidden bg-white px-6 pb-[26px] pt-[22px]">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(6,182,212,0.03)_0%,transparent_40%)]" />
              <div className="relative z-[1] mb-[7px] font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-[18px] font-bold tracking-[-0.022em] text-[var(--hybrid-ink)]">Welcome Back</div>
              <p className="relative z-[1] mb-5 text-[12px] font-normal leading-[1.65] text-[var(--hybrid-muted)]">
                Re-engage with your secure Intelligence Dashboard.
              </p>
              <div className="relative z-[1] inline-flex items-center gap-[7px] overflow-hidden rounded-[10px] px-[18px] py-[11px] text-[13px] font-semibold text-white transition-all duration-200 group-hover:shadow-[0_8px_28px_rgba(8,145,178,0.5)]" style={{ background: 'linear-gradient(135deg, #0891B2, #22D3EE)', boxShadow: '0 4px 16px rgba(8,145,178,0.35), inset 0 1px 0 rgba(255,255,255,0.18), 0 0 0 1px rgba(8,145,178,0.15)' }}>
                <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.22) 0%, transparent 50%)' }} />
                <span className="relative z-[1]">Sign In</span>
                <ArrowRight className="relative z-[1] h-[14px] w-[14px]" />
              </div>
            </div>

            <div className="absolute right-5 top-[144px] z-[2] grid h-9 w-9 place-items-center overflow-hidden rounded-full text-white" style={{ background: 'linear-gradient(145deg, #3B82F6, #60A5FA)', boxShadow: '0 4px 16px rgba(59,130,246,0.45), 0 0 12px rgba(96,165,250,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' }}>
              <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(255,255,255,0.25) 0%, transparent 55%)' }} />
              <Orbit className="relative z-[1] h-[14px] w-[14px]" style={{ filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))' }} />
            </div>
          </button>
        </div>
      </div>
    </section>

  );
};
