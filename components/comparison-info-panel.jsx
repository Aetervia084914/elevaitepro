"use client";

import { motion } from "framer-motion";
import {
  ArrowRightLeft,
  Clock,
  AlertTriangle,
  MessageCircle,
  StickyNote,
  Gauge,
  ChevronRight,
} from "lucide-react";

const DIFFICULTY_CONFIG = {
  easy: {
    label: "Easy",
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-gradient-to-br from-emerald-50/80 to-teal-50/80",
    border: "border-emerald-200/50",
    text: "text-emerald-700",
    ring: "ring-emerald-400/25",
    barColor: "from-emerald-400 to-teal-400",
    percent: 25,
    icon: "🟢",
  },
  moderate: {
    label: "Moderate",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-gradient-to-br from-amber-50/80 to-orange-50/80",
    border: "border-amber-200/50",
    text: "text-amber-700",
    ring: "ring-amber-400/25",
    barColor: "from-amber-400 to-orange-400",
    percent: 55,
    icon: "🟡",
  },
  hard: {
    label: "Hard",
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-gradient-to-br from-rose-50/80 to-pink-50/80",
    border: "border-rose-200/50",
    text: "text-rose-700",
    ring: "ring-rose-400/25",
    barColor: "from-rose-400 to-pink-400",
    percent: 80,
    icon: "🔴",
  },
};

function detectDifficulty(val) {
  if (!val) return DIFFICULTY_CONFIG.moderate;
  const lower = val.toLowerCase();
  if (lower.includes("easy") || lower.includes("low") || lower.includes("straightforward"))
    return DIFFICULTY_CONFIG.easy;
  if (lower.includes("hard") || lower.includes("high") || lower.includes("difficult") || lower.includes("challenging"))
    return DIFFICULTY_CONFIG.hard;
  return DIFFICULTY_CONFIG.moderate;
}

function MetricTile({ icon: Icon, label, value, gradient, delay = 0 }) {
  if (!value) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="relative group"
    >
      <div className="rounded-2xl border border-white bg-white/80 backdrop-blur-xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] transition-all duration-300 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100/25 to-purple-100/15 blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

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

export function ComparisonInfoPanel({ comparisonInfo }) {
  if (
    !comparisonInfo ||
    (!comparisonInfo.transitionDifficulty &&
      !comparisonInfo.reason &&
      !comparisonInfo.estimatedTransitionDuration &&
      (!comparisonInfo.notes || comparisonInfo.notes.length === 0))
  ) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center mb-4 shadow-sm">
          <ArrowRightLeft className="w-6 h-6 text-slate-300" />
        </div>
        <p className="text-sm font-semibold text-slate-400 tracking-tight">
          No transition comparison available yet
        </p>
        <p className="text-xs text-slate-300 mt-1">
          Add comparison roles or re-run analysis to generate transition insights
        </p>
      </div>
    );
  }

  const diff = detectDifficulty(comparisonInfo.transitionDifficulty);

  return (
    <div className="space-y-5">
      {/* Difficulty hero card */}
      {comparisonInfo.transitionDifficulty && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`relative rounded-2xl ${diff.bg} ${diff.border} border p-5 overflow-hidden`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
          <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${diff.gradient} flex items-center justify-center shadow-lg ring-4 ${diff.ring}`}
            >
              <Gauge className="w-7 h-7 text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`text-lg font-extrabold tracking-tight ${diff.text}`}>
                  {diff.label} Transition
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${diff.gradient} text-white shadow-sm`}
                >
                  {diff.icon} Difficulty
                </span>
              </div>
              <p className="text-[13px] font-medium text-slate-600 leading-snug tracking-tight">
                {comparisonInfo.transitionDifficulty}
              </p>
            </div>
          </div>

          {/* Difficulty bar */}
          <div className="relative z-10 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Effort Level
              </span>
              <span className={`text-[10px] font-bold ${diff.text}`}>{diff.percent}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-white/60 overflow-hidden shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${diff.percent}%` }}
                transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
                className={`h-full rounded-full bg-gradient-to-r ${diff.barColor} shadow-sm`}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Metric tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricTile
          icon={Clock}
          label="Estimated Transition Duration"
          value={comparisonInfo.estimatedTransitionDuration}
          gradient="from-sky-500 to-blue-500"
          delay={0.1}
        />
        <MetricTile
          icon={AlertTriangle}
          label="Reason"
          value={comparisonInfo.reason}
          gradient="from-violet-500 to-purple-500"
          delay={0.15}
        />
      </div>

      {/* Notes */}
      {comparisonInfo.notes && comparisonInfo.notes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="relative rounded-2xl border border-white bg-white/80 backdrop-blur-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.05)] overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-gradient-to-br from-indigo-100/25 to-purple-100/15 blur-2xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                <StickyNote className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Transition Notes
              </p>
            </div>
            <ul className="space-y-2 pl-10">
              {comparisonInfo.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <ChevronRight className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <span className="text-[13px] font-medium text-slate-600 leading-relaxed tracking-tight">
                    {note}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </div>
  );
}
