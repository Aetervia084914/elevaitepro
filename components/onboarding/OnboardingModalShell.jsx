"use client";

import React from "react";
import { X } from "lucide-react";


export function OnboardingModalShell({
  onClose,
  leftIcon: LeftIcon,
  leftEyebrow,
  leftTitle,
  leftSubtitle,
  leftFooterItems = [],
  leftCentered = false,
  children,
  className = "",
}) {
  return (
    <div className="fixed inset-0 z-[1000] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(160deg,var(--m05-bg-1)_0%,var(--m05-bg-2)_10%,var(--m05-bg-3)_22%,var(--m05-bg-4)_36%,var(--m05-bg-5)_52%,var(--m05-bg-6)_66%,var(--m05-bg-7)_80%,var(--m05-bg-2)_92%,var(--m05-bg-1)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.028] bg-[url(data:image/svg+xml,%3Csvg_viewBox='0_0_512_512'_xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter_id='n'%3E%3CfeTurbulence_type='fractalNoise'_baseFrequency='0.72'_numOctaves='4'_stitchTiles='stitch'/%3E%3C/filter%3E%3Crect_width='100%25'_height='100%25'_filter='url(%23n)'/%3E%3C/svg%3E)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(57,73,171,0.055)_1px,transparent_1px)] [background-size:30px_30px] [mask-image:radial-gradient(ellipse_100%_100%_at_50%_50%,black_20%,transparent_95%)]" />

      <div className="pointer-events-none absolute -left-[260px] -top-[320px] h-[900px] w-[900px] rounded-full bg-[radial-gradient(circle_at_38%_38%,rgba(99,120,230,0.58)_0%,rgba(57,73,171,0.28)_50%,transparent_75%)] blur-[110px]" />
      <div className="pointer-events-none absolute -right-[220px] -top-[120px] h-[780px] w-[780px] rounded-full bg-[radial-gradient(circle_at_60%_38%,rgba(0,188,212,0.52)_0%,rgba(0,151,167,0.22)_52%,transparent_75%)] blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-120px] left-[8%] h-[680px] w-[680px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(124,77,255,0.42)_0%,rgba(94,53,177,0.18)_52%,transparent_75%)] blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[60px] right-[4%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(41,182,246,0.46)_0%,rgba(3,155,229,0.22)_52%,transparent_75%)] blur-[110px]" />
      <div className="pointer-events-none absolute left-[36%] top-[48%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(179,157,219,0.38)_0%,rgba(149,117,205,0.16)_52%,transparent_75%)] blur-[110px]" />

      <div className="pointer-events-none absolute left-1/2 top-[22px] hidden h-[54px] w-[680px] -translate-x-1/2 items-center gap-[10px] rounded-[18px] border border-white/70 bg-white/40 px-[22px] shadow-[0_0_0_1px_rgba(57,73,171,0.06),0_8px_32px_rgba(57,73,171,0.10),inset_0_1px_0_rgba(255,255,255,0.90)] backdrop-blur-[32px] lg:flex">
        <div className="h-7 w-7 rounded-lg bg-[linear-gradient(135deg,var(--m05-indigo-700),var(--m05-cyan-500))]" />
        <div className="ml-[14px] flex gap-[6px]">
          <div className="h-[10px] w-14 rounded-[5px] bg-[rgba(57,73,171,0.14)]" />
          <div className="h-[10px] w-[68px] rounded-[5px] bg-[rgba(57,73,171,0.14)]" />
          <div className="h-[10px] w-12 rounded-[5px] bg-[rgba(57,73,171,0.14)]" />
        </div>
        <div className="ml-auto h-7 w-[90px] rounded-lg bg-[linear-gradient(135deg,rgba(57,73,171,0.30),rgba(0,188,212,0.25))]" />
      </div>

      <div className="pointer-events-none absolute left-[3%] top-1/2 hidden w-[220px] -translate-y-1/2 rounded-[22px] border border-white/80 bg-white/45 p-[20px_18px] opacity-50 shadow-[inset_0_2px_0_rgba(255,255,255,0.90),0_16px_56px_rgba(57,73,171,0.13),0_4px_12px_rgba(57,73,171,0.08)] backdrop-blur-[36px] xl:block">
        <div className="mb-1 font-[var(--font-exo-2)] text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--m05-cyan-700)]">Career Score</div>
        <div className="mb-3 font-[var(--font-unbounded)] text-[13px] font-bold text-[var(--m05-indigo-900)]">Momentum Index</div>
        <div className="mb-3 grid h-[52px] w-[52px] place-items-center rounded-full bg-[conic-gradient(var(--m05-indigo-700)_0%_87%,#E8EAF6_87%_100%)] shadow-[0_4px_16px_rgba(57,73,171,0.22)]">
          <div className="grid h-[38px] w-[38px] place-items-center rounded-full bg-white font-[var(--font-unbounded)] text-[12px] font-extrabold text-[var(--m05-indigo-900)]">87%</div>
        </div>
        <div className="mb-2 h-1 overflow-hidden rounded bg-[#E8EAF6]"><div className="h-full w-[87%] rounded bg-[linear-gradient(90deg,var(--m05-indigo-700),var(--m05-cyan-500))]" /></div>
        <div className="flex flex-wrap gap-[5px] font-[var(--font-exo-2)] text-[8.5px] font-bold">
          <span className="rounded-[10px] bg-[rgba(57,73,171,0.10)] px-[7px] py-[2px] text-[var(--m05-indigo-700)]">Signal</span>
          <span className="rounded-[10px] bg-[rgba(0,188,212,0.10)] px-[7px] py-[2px] text-[var(--m05-cyan-700)]">Growth</span>
          <span className="rounded-[10px] bg-[rgba(124,77,255,0.10)] px-[7px] py-[2px] text-[#6A1B9A]">Focus</span>
        </div>
      </div>

      <div className="pointer-events-none absolute right-[3%] top-1/2 hidden w-[210px] -translate-y-1/2 rounded-[22px] border border-white/80 bg-white/45 p-[18px_16px] opacity-50 shadow-[inset_0_2px_0_rgba(255,255,255,0.90),0_16px_56px_rgba(57,73,171,0.13),0_4px_12px_rgba(57,73,171,0.08)] backdrop-blur-[36px] xl:block">
        <div className="mb-[10px] font-[var(--font-exo-2)] text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--m05-cyan-700)]">Live Metrics</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            ["94%", "Match Rate", "🎯", "from-[#3949AB] to-[#7986CB]"],
            ["3.2×", "Growth", "⚡", "from-[#00BCD4] to-[#4DD0E1]"],
            ["24", "Matches", "💼", "from-[#7C4DFF] to-[#AB47BC]"],
            ["6 wk", "To Goal", "🗺️", "from-[#29B6F6] to-[#4FC3F7]"],
          ].map(([value, label, icon, gradient]) => (
            <div key={label} className="relative overflow-hidden rounded-xl border border-white/80 bg-white/55 p-[10px_10px_8px] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(57,73,171,0.06)]">
              <div className={`absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r ${gradient}`} />
              <span className="mb-1 block text-[13px]">{icon}</span>
              <span className="mb-[1px] block font-[var(--font-unbounded)] text-[15px] font-extrabold text-[var(--m05-indigo-900)]">{value}</span>
              <span className="block text-[8px] font-bold uppercase tracking-[0.07em] text-[#607D8B]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-[10px] opacity-50 xl:flex">
        <div className="flex items-center gap-[7px] rounded-[20px] border border-white/80 bg-white/55 px-4 py-[7px] text-[11px] font-semibold text-[var(--m05-indigo-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_4px_16px_rgba(57,73,171,0.08)] backdrop-blur-[24px]"><span className="h-1.5 w-1.5 rounded-full bg-[#FF7043] shadow-[0_0_6px_rgba(255,112,67,0.7)]" />Live Guidance</div>
        <div className="flex items-center gap-[7px] rounded-[20px] border border-white/80 bg-white/55 px-4 py-[7px] text-[11px] font-semibold text-[var(--m05-indigo-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_4px_16px_rgba(57,73,171,0.08)] backdrop-blur-[24px]"><span className="h-1.5 w-1.5 rounded-full bg-[#29B6F6] shadow-[0_0_6px_rgba(41,182,246,0.7)]" />Cosmic UI</div>
        <div className="flex items-center gap-[7px] rounded-[20px] border border-white/80 bg-white/55 px-4 py-[7px] text-[11px] font-semibold text-[var(--m05-cyan-700)] shadow-[inset_0_1px_0_rgba(255,255,255,0.90),0_4px_16px_rgba(57,73,171,0.08)] backdrop-blur-[24px]"><span className="h-1.5 w-1.5 rounded-full bg-[#69F0AE] shadow-[0_0_6px_rgba(105,240,174,0.8)]" />Secure Flow</div>
      </div>

      <div className="fixed bottom-5 left-5 z-[15] hidden h-10 w-10 place-items-center rounded-full border-2 border-white/70 bg-[linear-gradient(135deg,var(--m05-indigo-900),var(--m05-indigo-700))] font-[var(--font-unbounded)] text-[13px] font-extrabold text-white shadow-[0_4px_20px_rgba(57,73,171,0.35),0_0_0_3px_rgba(255,255,255,0.40)] lg:grid">N</div>

      <div className="absolute inset-0 grid place-items-center bg-[rgba(57,73,171,0.08)] backdrop-blur-[2px] px-4 py-8">
        <div className={`relative z-[11] flex w-full max-w-[780px] overflow-hidden rounded-[24px] bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.70),0_4px_6px_rgba(57,73,171,0.06),0_20px_60px_rgba(57,73,171,0.22),0_56px_100px_rgba(57,73,171,0.14),0_0_120px_rgba(0,188,212,0.08)] ${className}`}>
          <div className={`relative hidden w-[290px] shrink-0 flex-col overflow-hidden bg-[linear-gradient(155deg,#312E81_0%,#3949AB_35%,#1565C0_65%,#0891B2_100%)] px-7 py-[38px] text-white md:flex${leftCentered ? ' items-center justify-center text-center' : ''}`}>
            <div className="pointer-events-none absolute left-0 right-0 top-0 h-[1.5px] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.80),transparent)]" />
            <div className="pointer-events-none absolute -right-[60px] -top-20 h-[220px] w-[220px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_65%)]" />

            {leftEyebrow && (
              <div className="mb-5 inline-flex w-fit items-center gap-[6px] rounded-[20px] border border-white/20 bg-white/10 px-[10px] py-1 font-[var(--font-exo-2)] text-[10.5px] font-semibold tracking-[0.05em] text-white/65">
                <div className="h-[5px] w-[5px] rounded-full bg-[var(--m05-emerald-300)] shadow-[0_0_7px_rgba(105,240,174,0.90)]" />
                {leftEyebrow}
              </div>
            )}

            {LeftIcon && (
              <div className="mb-[22px] grid h-[50px] w-[50px] place-items-center rounded-2xl border-[1.5px] border-white/30 bg-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.36),0_4px_14px_rgba(0,0,0,0.18)]">
                <LeftIcon className="h-[22px] w-[22px]" />
              </div>
            )}

            {leftTitle && (
              <div className="mb-[14px] font-[var(--font-bricolage-grotesque)] text-[18px] font-extrabold tracking-[-0.02em] text-white">
                {leftTitle}
              </div>
            )}

            {leftSubtitle && (
              <div className="mb-7 text-[12.5px] leading-[1.65] text-white/55">
                {leftSubtitle}
              </div>
            )}

            {leftFooterItems.length > 0 && (
              <div className="mt-auto flex flex-col gap-[10px]">
                {leftFooterItems.map((item) => (
                  <div key={item} className="flex items-center gap-[10px]">
                    <div className="h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--m05-emerald-300)] shadow-[0_0_8px_rgba(105,240,174,0.80)]" />
                    <div className="text-[12px] text-white/60">{item}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-1 px-6 py-8 md:px-[34px] md:py-[38px] [font-family:var(--font-inter),var(--font-manrope),ui-sans-serif,system-ui,sans-serif]">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 grid h-[30px] w-[30px] place-items-center rounded-full border border-[#E8EDF8] bg-[#F5F6FA] text-[#9DB0C8] transition-all hover:bg-[#EEF0FF] hover:text-[var(--m05-indigo-700)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
