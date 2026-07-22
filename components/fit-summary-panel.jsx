"use client";

import { motion } from "framer-motion";
import {
  Target,
  TrendingUp,
  ArrowUpRight,
  Layers,
  MessageSquareText,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

const FIT_LEVELS = {
  strong: {
    label: "Strong Fit",
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    border: "border-emerald-200/60",
    text: "text-emerald-700",
    ring: "ring-emerald-400/30",
    bar: "from-emerald-400 to-teal-400",
    percent: 85,
  },
  moderate: {
    label: "Moderate Fit",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-gradient-to-br from-amber-50 to-orange-50",
    border: "border-amber-200/60",
    text: "text-amber-700",
    ring: "ring-amber-400/30",
    bar: "from-amber-400 to-orange-400",
    percent: 60,
  },
  weak: {
    label: "Weak Fit",
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-gradient-to-br from-rose-50 to-pink-50",
    border: "border-rose-200/60",
    text: "text-rose-700",
    ring: "ring-rose-400/30",
    bar: "from-rose-400 to-pink-400",
    percent: 35,
  },
};

function detectLevel(overallFit) {
  if (!overallFit) return FIT_LEVELS.moderate;
  const lower = overallFit.toLowerCase();
  if (lower.includes("strong") || lower.includes("excellent") || lower.includes("high"))
    return FIT_LEVELS.strong;
  if (lower.includes("weak") || lower.includes("low") || lower.includes("poor"))
    return FIT_LEVELS.weak;
  return FIT_LEVELS.moderate;
}

function InfoCard({ icon: Icon, label, value, gradient, delay = 0 }) {
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="relative group"
    >
      <div className="rounded-2xl border border-white bg-white/80 backdrop-blur-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
        <div className="absolute -top-12 -right-12 w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100/30 to-purple-100/20 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}
          >
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-1">
              {label}
            </p>
            <p className="text-[13px] font-semibold text-slate-700 leading-relaxed tracking-tight">
              {value}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function FitSummaryPanel({ fitSummary, completionPercent = 0 }) {
  if (!fitSummary || (!fitSummary.overallFit && !fitSummary.rationale)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-sm">
          <Target className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-400 tracking-tight">
          No fit summary available yet
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Re-run analysis to generate role fit assessment
        </p>
      </div>
    );
  }

  // Use dynamic completion percentage to determine fit level
  const dynamicPercent = Math.min(Math.max(completionPercent, 0), 100);
  const level = dynamicPercent >= 70
    ? { ...FIT_LEVELS.strong, percent: dynamicPercent }
    : dynamicPercent >= 40
      ? { ...FIT_LEVELS.moderate, percent: dynamicPercent }
      : { ...FIT_LEVELS.weak, percent: dynamicPercent };

  return (
    <div className="space-y-5">
      {/* Hero fit indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`relative rounded-2xl ${level.bg} ${level.border} border p-5 overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${level.gradient} flex items-center justify-center shadow-lg ring-4 ${level.ring}`}
          >
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className={`text-lg font-extrabold tracking-tight ${level.text}`}>
                {level.label}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${level.gradient} text-white shadow-sm`}
              >
                {dynamicPercent}%
              </span>
            </div>
            <p className="text-[13px] font-medium text-slate-600 leading-snug tracking-tight">
              {dynamicPercent >= 100
                ? "Strong — all requirements completed"
                : dynamicPercent >= 70
                  ? "Strong — most requirements completed"
                  : dynamicPercent >= 40
                    ? "Moderate — some requirements remaining"
                    : dynamicPercent > 0
                      ? "Weak — many requirements remaining"
                      : "Weak — no requirements completed yet"}
            </p>
          </div>
        </div>

        {/* Fit bar — driven by completion of skill gaps, AI skills, competencies & certifications */}
        <div className="relative z-10 mt-4">
          <div className="h-2.5 w-full rounded-full bg-white/60 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${dynamicPercent}%` }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
              className={`h-full rounded-full bg-gradient-to-r ${level.bar} shadow-sm`}
            />
          </div>
        </div>
      </motion.div>

      {/* Detail cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InfoCard
          icon={Layers}
          label="Seniority Target"
          value={fitSummary.seniorityTarget}
          gradient="from-violet-500 to-purple-500"
          delay={0.1}
        />
        <InfoCard
          icon={ArrowUpRight}
          label="Transition Feasibility"
          value={fitSummary.transitionFeasibility}
          gradient="from-sky-500 to-blue-500"
          delay={0.15}
        />
      </div>

      {/* Rationale */}
      {fitSummary.rationale && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative rounded-2xl border border-white bg-white/80 backdrop-blur-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100/30 to-purple-100/20 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <MessageSquareText className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Assessment Rationale
              </p>
            </div>
            <p className="text-[13px] font-medium text-slate-600 leading-relaxed tracking-tight pl-10">
              {fitSummary.rationale}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
