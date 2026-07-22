'use client';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from './ui/table';
import { Layers, Sparkles, Bot } from 'lucide-react';

const pricingData = [
  {
    "Dimension": "Skills gap map",
    "elevAIte pro": "A structured gap map covering soft skills, competencies, and AI skills. Your CV goes in — a career diagnosis comes out. Not vibes. Evidence.",
    "Any Other Chatbot": "Paste your CV and you\u2019ll get encouragement, some bullet points, and the word \u201cpassionate\u201d used unironically. Helpful — the way a horoscope is helpful."
  },
  {
    "Dimension": "Role-specific gap analysis",
    "elevAIte pro": "Lets you select your target role and maps exactly what\u2019s missing between where you are and where you want to be. No guesswork. Just the delta that matters.",
    "Any Other Chatbot": "You supply the job description, the role, the industry, the seniority level, your goals, your constraints\u2026 at which point, congratulations \u2014 you\u2019ve done all the analysis yourself."
  },
  {
    "Dimension": "AI readiness",
    "elevAIte pro": "Tells you which skills you need and what to do about it. Yes, we\u2019re using AI to tell you to guide you on your journey. We see the irony. It\u2019s still useful.",
    "Any Other Chatbot": "Ask any AI chatbot if AI will take your job and it\u2019ll say \u201cit depends.\u201d Which is true, unhelpful, and the career equivalent of a shrug emoji."
  },
  {
    "Dimension": "Upskilling roadmap",
    "elevAIte pro": "Gaps become a prioritised plan, certifications, quick wins sequenced around your actual goal. You close the tab knowing exactly what to do next. Novel concept, we know.",
    "Any Other Chatbot": "Every session starts from scratch. No memory of your last chat. No baseline. No tracking. It\u2019s career coaching from someone who forgets you the moment you close the tab."
  },
  {
    "Dimension": "Market data",
    "elevAIte pro": "The skills flagged as gaps are what employers are actually hiring for \u2014 not what sounded impressive in a LinkedIn article from two years ago.",
    "Any Other Chatbot": "Trained on the internet, capped at a cutoff date, with no live job market feed. Asking it what skills are in demand is like checking a 2022 Argos catalogue for the latest iPhone."
  }
];

export default function FrontendPricing({ prices, onSelectTier }) {
  return (
    <section className="pricing-section" style={{ fontFamily: "var(--font-manrope), 'Manrope', ui-sans-serif, system-ui, sans-serif" }}>
      <div className="pricing-header">
        <h1 className="pricing-title">
          Compare every <em className="highlight">feature</em>
        </h1>
        <p className="pricing-subtitle">
          Five dimensions, two answers — what elevAIte pro does, and what any other chatbot does instead.
        </p>
      </div>

      <div className="pricing-table-wrap">
        <div className="border rounded-lg overflow-hidden">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-b border-white/10">
                {/* Dimension — Violet / Indigo / Rose Glass (Pro palette) */}
                <TableHead
                  className="border-r text-center align-middle h-auto py-9 w-[20%] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #3b0764 0%, #6d28d9 30%, #4f46e5 65%, #be185d 100%)',
                    backdropFilter: 'blur(28px) saturate(220%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(0,0,0,0.2), 0 8px 32px rgba(109,40,217,0.45), 0 0 60px rgba(79,70,229,0.18)',
                    borderColor: 'rgba(255,255,255,0.18)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/22 via-white/6 to-transparent pointer-events-none"></div>
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-pink-400/10 pointer-events-none"></div>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 14px rgba(109,40,217,0.35), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                      <Layers size={19} strokeWidth={2} className="text-white" />
                    </div>
                    <span className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] font-bold tracking-widest text-white/90 uppercase text-[13px]" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>Dimension</span>
                    <div className="text-[11px] font-medium text-purple-100/70 tracking-wide">Career capability, measured side by side</div>
                  </div>
                </TableHead>

                {/* elevAlte — Emerald / Teal / Cyan Glass */}
                <TableHead
                  className="border-r text-center align-middle h-auto py-9 w-[40%] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #064e3b 0%, #0d9488 45%, #0891b2 100%)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 24px rgba(6,182,212,0.25)',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/18 via-white/5 to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 14px rgba(6,182,212,0.3), inset 0 1px 0 rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      <Sparkles size={19} strokeWidth={2} className="text-white" />
                    </div>
                    {/* <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-xl font-extrabold text-white tracking-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>Usual Price £24.99 </div> */}
               <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-xl font-extrabold text-white tracking-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
  Usual Price{' '}
  <span style={{ textDecoration: 'line-through', textDecorationColor: 'red', textDecorationThickness: '3px' }}>
    £24.99
  </span>
</div>
                    <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-xl font-extrabold text-white tracking-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>Introductory Price - £19.99</div>
                  </div>
                </TableHead>

                {/* Any Other Chatbot — Amber / Gold / Bronze Glass */}
                <TableHead
                  className="text-center align-middle h-auto py-9 w-[40%] relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #78350f 0%, #b45309 40%, #d97706 75%, #f59e0b 100%)',
                    backdropFilter: 'blur(20px) saturate(180%)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.2), 0 6px 24px rgba(217,119,6,0.25)',
                    borderColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none"></div>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent pointer-events-none"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.15)', boxShadow: '0 2px 14px rgba(217,119,6,0.3), inset 0 1px 0 rgba(255,255,255,0.25)', flexShrink: 0 }}>
                      <Bot size={19} strokeWidth={2} className="text-amber-50" />
                    </div>
                    <div className="font-[var(--font-bricolage-grotesque),Bricolage_Grotesque,var(--font-manrope),sans-serif] text-xl font-extrabold text-amber-50 tracking-tight" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>Any Other Chatbot</div>
                    <div className="text-[11px] font-medium text-amber-100/70 tracking-wide">Generic AI with no career context</div>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pricingData.map((row, index) => {
                const elevAlteVal   = row["elevAIte pro"];
                const chatbotVal    = row["Any Other Chatbot"];

                const renderValue = (val) => {
                  if (val === "Yes") return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-bold border" style={{ background: 'rgba(5,150,105,0.1)', color: '#047857', borderColor: 'rgba(5,150,105,0.25)', boxShadow: '0 1px 6px rgba(5,150,105,0.1)', fontFamily: "var(--font-manrope), 'Manrope', sans-serif", letterSpacing: '0.01em' }}>
                      ✓ Yes
                    </span>
                  );
                  if (val === "No") return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[11px] font-semibold border" style={{ background: 'rgba(100,116,139,0.08)', color: '#94a3b8', borderColor: 'rgba(100,116,139,0.18)', fontFamily: "var(--font-manrope), 'Manrope', sans-serif", letterSpacing: '0.01em' }}>
                      — No
                    </span>
                  );
                  return <span style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '13px', fontWeight: 500, color: '#1e293b', lineHeight: 1.65, letterSpacing: '0.005em' }}>{val}</span>;
                };

                return (
                  <TableRow key={index} className="border-b last:border-b-0 hover:brightness-[0.97] transition-all duration-150">
                    {/* Dimension */}
                    <TableCell
                      className="border-r align-middle w-[20%] py-4 px-5 whitespace-normal break-words"
                      style={{ background: 'linear-gradient(135deg, rgba(59,7,100,0.16) 0%, rgba(79,70,229,0.135) 60%, rgba(190,24,93,0.115) 100%)' }}
                    >
                      <span style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '13px', fontWeight: 700, color: '#0f172a', lineHeight: 1.55, letterSpacing: '-0.01em' }}>{row["Dimension"]}</span>
                    </TableCell>

                    {/* elevAlte */}
                    <TableCell
                      className="border-r align-middle w-[40%] py-4 px-5 whitespace-normal break-words"
                      style={{ background: 'linear-gradient(135deg, rgba(6,78,59,0.14) 0%, rgba(8,145,178,0.12) 100%)' }}
                    >
                      {renderValue(elevAlteVal)}
                    </TableCell>

                    {/* Any Other Chatbot */}
                    <TableCell
                      className="align-middle w-[40%] py-4 px-5 whitespace-normal break-words"
                      style={{ background: 'linear-gradient(135deg, rgba(120,53,15,0.14) 0%, rgba(245,158,11,0.12) 100%)' }}
                    >
                      <span style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif", fontSize: '12.5px', fontWeight: 400, color: '#475569', lineHeight: 1.7, letterSpacing: '0.005em' }}>{chatbotVal}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* <div className="pricing-btn-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>Ready to begin?</div>
          <button onClick={onSelectTier} className="btn btn-p" style={{ marginLeft: 'auto' }}>Start Subscription</button>
        </div> */}
      </div>
    </section>
  );
}
