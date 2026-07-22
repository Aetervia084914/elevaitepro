"use client";

import { motion } from "framer-motion";
import {
  Tag,
  Search,
  Sparkles,
  Copy,
  CheckCircle2,
  ArrowUpRight,
  Hash,
} from "lucide-react";
import { useState, useCallback } from "react";

const TAG_GRADIENTS = [
  "from-indigo-500 to-blue-500",
  "from-violet-500 to-purple-500",
  "from-fuchsia-500 to-pink-500",
  "from-sky-500 to-cyan-500",
  "from-teal-500 to-emerald-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-red-500",
  "from-blue-500 to-indigo-500",
];

const TAG_LIGHT_BG = [
  "bg-indigo-50 border-indigo-200/50 text-indigo-700 hover:bg-indigo-100",
  "bg-violet-50 border-violet-200/50 text-violet-700 hover:bg-violet-100",
  "bg-fuchsia-50 border-fuchsia-200/50 text-fuchsia-700 hover:bg-fuchsia-100",
  "bg-sky-50 border-sky-200/50 text-sky-700 hover:bg-sky-100",
  "bg-teal-50 border-teal-200/50 text-teal-700 hover:bg-teal-100",
  "bg-amber-50 border-amber-200/50 text-amber-700 hover:bg-amber-100",
  "bg-rose-50 border-rose-200/50 text-rose-700 hover:bg-rose-100",
  "bg-blue-50 border-blue-200/50 text-blue-700 hover:bg-blue-100",
];

export function KeywordRecommendationsPanel({ keywords = [], strengths = [], gaps = [] }) {
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = useCallback((text, idx) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  }, []);

  const allKeywords = keywords.length > 0 ? keywords : [];
  const hasAnyContent = allKeywords.length > 0 || strengths.length > 0 || gaps.length > 0;

  if (!hasAnyContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-sm">
          <Search className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-400 tracking-tight">
          No keyword insights available yet
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Re-run analysis to generate ATS keyword recommendations
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header stats bar */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[1px] overflow-hidden shadow-[0_8px_30px_rgba(99,102,241,0.2)]"
      >
        <div className="rounded-[calc(1rem-1px)] bg-white/95 backdrop-blur-xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg">
              <Tag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 tracking-tight">
                ATS Keyword Intelligence
              </h3>
              <p className="text-[10px] font-semibold text-slate-400 tracking-wide">
                Optimise your resume with these high-impact keywords
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {allKeywords.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100">
                <Hash className="w-3 h-3 text-indigo-500" />
                <span className="text-[11px] font-bold text-indigo-600">
                  {allKeywords.length} Keywords
                </span>
              </div>
            )}
            {strengths.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span className="text-[11px] font-bold text-emerald-600">
                  {strengths.length} Strengths
                </span>
              </div>
            )}
            {gaps.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
                <ArrowUpRight className="w-3 h-3 text-amber-500" />
                <span className="text-[11px] font-bold text-amber-600">
                  {gaps.length} Gaps
                </span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Keyword cloud */}
      {allKeywords.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="relative rounded-2xl border border-white bg-white/80 backdrop-blur-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-100/30 to-purple-100/20 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Recommended Keywords
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pl-10">
              {allKeywords.map((kw, i) => {
                const colorIdx = i % TAG_LIGHT_BG.length;
                const isCopied = copiedIdx === i;
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.05 * i, duration: 0.25 }}
                    onClick={() => handleCopy(kw, i)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[12px] font-semibold tracking-tight transition-all duration-200 cursor-pointer ${TAG_LIGHT_BG[colorIdx]}`}
                    title="Click to copy"
                  >
                    {isCopied ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-40 shrink-0" />
                    )}
                    {kw}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Strengths & Gaps side by side */}
      {(strengths.length > 0 || gaps.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Strengths */}
          {strengths.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="relative rounded-2xl border border-emerald-100/60 bg-gradient-to-br from-emerald-50/60 to-teal-50/40 backdrop-blur-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                    Profile Strengths
                  </p>
                </div>
                <ul className="space-y-2.5 pl-10">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                      <span className="text-[12px] font-medium text-slate-600 leading-relaxed tracking-tight">
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Gaps */}
          {gaps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="relative rounded-2xl border border-amber-100/60 bg-gradient-to-br from-amber-50/60 to-orange-50/40 backdrop-blur-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                    <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-600">
                    ATS Gaps to Address
                  </p>
                </div>
                <ul className="space-y-2.5 pl-10">
                  {gaps.map((g, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
                      <span className="text-[12px] font-medium text-slate-600 leading-relaxed tracking-tight">
                        {g}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
