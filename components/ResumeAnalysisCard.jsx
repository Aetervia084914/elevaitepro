"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// =============================
// Score Ring — animated circular score gauge
// =============================
function ScoreRing({ score, label, size = 80, color }) {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const ringColor = color || (score >= 70 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444");

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="drop-shadow-sm"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={6}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="black"
          style={{ fontSize: size < 80 ? 14 : 17, fontWeight: 700 }}
        >
          {score}%
        </text>
      </svg>
      <span className="text-[11px] text-slate-400 font-medium tracking-wide">
        {label}
      </span>
    </div>
  );
}

// =============================
// Tiny bar for ATS checks
// =============================
function AtsBar({ label, score, max }) {
  const pct = Math.round((score / max) * 100);
  const barColor = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="text-slate-400 w-[130px] shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${barColor}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <span className="text-white/60 w-[32px] text-right">
        {score}/{max}
      </span>
    </div>
  );
}

// =============================
// Section check row
// =============================
function SectionRow({ label, found }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span
        className={`w-4 h-4 flex items-center justify-center rounded-full text-[10px] shrink-0 ${
          found
            ? "bg-emerald-500/20 text-emerald-400"
            : "bg-red-500/20 text-red-400"
        }`}
      >
        {found ? "✓" : "✗"}
      </span>
      <span className={found ? "text-slate-300" : "text-slate-500"}>
        {label}
      </span>
    </div>
  );
}

// =============================
// Main Card
// =============================
export default function ResumeAnalysisCard({ analysis, onClose }) {
  const [expanded, setExpanded] = useState(true);

  if (!analysis) return null;

  const {
    contact,
    sections,
    completenessScore,
    atsScore,
    atsChecks,
    bullets,
    skills,
    qualityIssues,
    suggestions,
    wordCount,
  } = analysis;

  const overallScore = Math.round(completenessScore * 0.5 + atsScore * 0.5);
  const gradeLabel =
    overallScore >= 80
      ? "Excellent"
      : overallScore >= 60
      ? "Good"
      : overallScore >= 40
      ? "Needs Work"
      : "Weak";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-xl overflow-hidden"
    >
      {/* ─── Header ─── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              overallScore >= 70
                ? "bg-emerald-500"
                : overallScore >= 40
                ? "bg-yellow-500"
                : "bg-red-500"
            }`}
          />
          <span className="text-white font-semibold text-sm tracking-wide">
            Resume Validation Score
          </span>
          <span className="text-xs text-slate-400 font-medium">
            — {gradeLabel} ({overallScore}/100)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">
            {wordCount} words
          </span>
          <svg
            className={`w-4 h-4 text-slate-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ─── Expandable Body ─── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-5">
              {/* ─── Score Rings ─── */}
              <div className="flex items-center justify-center gap-8 py-3">
                <ScoreRing score={overallScore} label="OVERALL" size={88} />
                <ScoreRing score={completenessScore} label="COMPLETE" size={72} />
                <ScoreRing score={atsScore} label="ATS" size={72} />
              </div>

              {/* ─── Two‑column grid ─── */}
              <div className="grid grid-cols-2 gap-5">
                {/* ── Left: Sections detected ── */}
                <div className="space-y-2">
                  <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                    Sections Detected
                  </h4>
                  {Object.values(sections).map((s) => (
                    <SectionRow key={s.label} label={s.label} found={s.found} />
                  ))}
                </div>

                {/* ── Right: ATS Breakdown ── */}
                <div className="space-y-2">
                  <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                    ATS Breakdown
                  </h4>
                  {atsChecks.map((c) => (
                    <AtsBar key={c.label} label={c.label} score={c.score} max={c.max} />
                  ))}
                </div>
              </div>

              {/* ─── Bullet Quality ─── */}
              {bullets.total > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                    Bullet Quality
                  </h4>
                  <div className="flex items-center gap-4 text-[12px] text-slate-300">
                    <span className="text-emerald-400">{bullets.strong} strong</span>
                    <span className="text-yellow-400">{bullets.weak} need improvement</span>
                    <span className="text-slate-500">{bullets.total} total</span>
                  </div>
                  {bullets.weakExamples.length > 0 && (
                    <div className="text-[11px] text-slate-500 space-y-0.5 mt-1 pl-3 border-l border-white/5">
                      {bullets.weakExamples.map((ex, i) => (
                        <p key={i} className="truncate max-w-[90%]">
                          ↳ &quot;{ex.substring(0, 80)}{ex.length > 80 ? "…" : ""}&quot;
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── Skills Detected ─── */}
              {Object.keys(skills).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                    Skills Detected
                  </h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                    {Object.entries(skills).map(([cat, list]) => (
                      <div key={cat} className="text-[11px]">
                        <span className="text-indigo-400 font-medium">{cat}: </span>
                        <span className="text-slate-400">{list.join(", ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Suggestions ─── */}
              {suggestions.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
                    Improvement Suggestions
                  </h4>
                  <ul className="space-y-1 text-[12px] text-slate-400">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ─── Close ─── */}
              {onClose && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={onClose}
                    className="text-[11px] text-slate-500 hover:text-white transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
