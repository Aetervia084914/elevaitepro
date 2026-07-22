"use client";

import { useState } from "react";
import { Card, CardContent } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { Checkbox } from "./ui/checkbox.jsx";
import {
  Clock,
  Award,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Trophy,
  Layers,
  Shield,
  Sparkles,
  ExternalLink,
  GraduationCap,
  Target,
} from "lucide-react";
import CertificationEcosystemRoadmap from "./CertificationEcosystemRoadmap.jsx";

const DIFFICULTY_CONFIG = {
  Beginner: {
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200/50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  Easy: {
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200/50",
    text: "text-emerald-700",
    dot: "bg-emerald-400",
  },
  Medium: {
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200/50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  Intermediate: {
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    border: "border-amber-200/50",
    text: "text-amber-700",
    dot: "bg-amber-400",
  },
  Advanced: {
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    border: "border-rose-200/50",
    text: "text-rose-700",
    dot: "bg-rose-400",
  },
  Hard: {
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    border: "border-rose-200/50",
    text: "text-rose-700",
    dot: "bg-rose-400",
  },
};

const VALUE_CONFIG = {
  High: {
    gradient: "from-indigo-500 to-blue-500",
    bg: "bg-indigo-50",
    border: "border-indigo-200/50",
    text: "text-indigo-700",
  },
  Medium: {
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-50",
    border: "border-violet-200/50",
    text: "text-violet-700",
  },
  Low: {
    gradient: "from-slate-400 to-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200/50",
    text: "text-slate-600",
  },
};

const PROVIDER_COLORS = {
  "Amazon Web Services": { accent: "from-[#FF9900] to-[#FF6600]", badge: "bg-orange-50 text-orange-700 border-orange-200/50" },
  "AWS": { accent: "from-[#FF9900] to-[#FF6600]", badge: "bg-orange-50 text-orange-700 border-orange-200/50" },
  "Microsoft": { accent: "from-[#00A4EF] to-[#0078D4]", badge: "bg-sky-50 text-sky-700 border-sky-200/50" },
  "Google": { accent: "from-[#4285F4] to-[#34A853]", badge: "bg-blue-50 text-blue-700 border-blue-200/50" },
  "Google Cloud": { accent: "from-[#4285F4] to-[#34A853]", badge: "bg-blue-50 text-blue-700 border-blue-200/50" },
  "HashiCorp": { accent: "from-[#7B42BC] to-[#000000]", badge: "bg-purple-50 text-purple-700 border-purple-200/50" },
  "Linux Foundation": { accent: "from-[#009639] to-[#003D1E]", badge: "bg-green-50 text-green-700 border-green-200/50" },
  "CNCF": { accent: "from-[#446CA9] to-[#231F20]", badge: "bg-blue-50 text-blue-700 border-blue-200/50" },
};

function getProviderStyle(provider) {
  if (!provider) return { accent: "from-indigo-500 to-purple-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200/50" };
  for (const [key, val] of Object.entries(PROVIDER_COLORS)) {
    if (provider.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { accent: "from-indigo-500 to-purple-500", badge: "bg-indigo-50 text-indigo-700 border-indigo-200/50" };
}

export default function CertificationCard({ item, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  const diff = DIFFICULTY_CONFIG[item.difficulty] || DIFFICULTY_CONFIG.Medium;
  const val = VALUE_CONFIG[item.marketValue] || VALUE_CONFIG.Medium;
  const providerStyle = getProviderStyle(item.provider);
  const steps = Array.isArray(item.steps) ? item.steps : [];
  const hasSteps = steps.length > 0;
  const hasFlowDiagram = Boolean(item.flowDiagram);
  const hasExpandableContent = hasSteps || hasFlowDiagram;

  return (
    <Card
      className={`relative rounded-2xl border transition-all duration-300 overflow-hidden group ${
        item.checked
          ? "opacity-50 grayscale bg-slate-50/50 border-slate-200/30"
          : "bg-white/80 backdrop-blur-xl border-white shadow-[0_4px_24px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)]"
      }`}
    >
      {/* Top accent bar */}
      {!item.checked && (
        <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${providerStyle.accent}`} />
      )}

      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
      <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-to-br from-indigo-100/20 to-purple-100/10 blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="relative z-10 p-0">
        {/* Main card body */}
        <div className="flex items-start gap-3.5 p-4 pb-3">
          {/* Checkbox */}
          <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white border border-slate-100 group-hover:border-indigo-200 transition-all shadow-sm shrink-0 mt-0.5">
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => onToggle(item.id)}
              className="w-4 h-4 rounded-md border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 shadow-sm"
              aria-label={`Mark ${item.title} as complete`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${providerStyle.accent} flex items-center justify-center shadow-sm shrink-0`}>
                    <GraduationCap className="w-3 h-3 text-white" />
                  </div>
                  <h4
                    className={`text-[13px] font-bold text-slate-800 tracking-tight leading-snug ${
                      item.checked ? "line-through opacity-50" : ""
                    }`}
                  >
                    {item.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 pl-8">
                  <Badge
                    className={`text-[9px] font-bold tracking-wide px-2 py-0.5 rounded-lg border ${providerStyle.badge}`}
                  >
                    {item.provider}
                  </Badge>
                </div>
              </div>

              {/* Badges */}
              <div className="flex shrink-0 gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold tracking-wide border ${diff.bg} ${diff.border} ${diff.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
                  {item.difficulty}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold tracking-wide border ${val.bg} ${val.border} ${val.text}`}>
                  <Award className="w-2.5 h-2.5" />
                  {item.marketValue}
                </span>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <p className="text-[11px] font-medium text-slate-500 leading-relaxed tracking-tight pl-8 mb-2.5 line-clamp-2">
                {item.description}
              </p>
            )}

            {/* Meta row */}
            <div className="flex items-center gap-4 pl-8">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Clock className="h-3 w-3 text-indigo-400" />
                {item.duration}
              </span>
              {hasSteps && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Layers className="h-3 w-3 text-purple-400" />
                  {steps.length} Steps
                </span>
              )}
              {hasFlowDiagram && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                  <Shield className="h-3 w-3 text-teal-400" />
                  Roadmap
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Expand toggle */}
        {hasExpandableContent && !item.checked && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border-t border-slate-100/80 text-[10px] font-bold tracking-wider uppercase text-slate-400 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all duration-200"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Collapse Details
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                View Preparation Path
              </>
            )}
          </button>
        )}

        {/* Expanded content */}
        {expanded && !item.checked && (
          <div className="px-4 pb-4 pt-1 space-y-4">
            {/* Steps timeline */}
            {hasSteps && (
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
                    <Target className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Preparation Steps
                  </span>
                </div>

                <div className="relative ml-3.5">
                  {/* Vertical connector line */}
                  <div className="absolute left-0 top-2 bottom-2 w-[2px] bg-gradient-to-b from-indigo-200 via-purple-200 to-pink-200 rounded-full" />

                  {steps.map((step, i) => {
                    const stepColors = [
                      { ring: "ring-indigo-200", bg: "bg-indigo-500", text: "text-indigo-500" },
                      { ring: "ring-purple-200", bg: "bg-purple-500", text: "text-purple-500" },
                      { ring: "ring-pink-200", bg: "bg-pink-500", text: "text-pink-500" },
                      { ring: "ring-sky-200", bg: "bg-sky-500", text: "text-sky-500" },
                      { ring: "ring-teal-200", bg: "bg-teal-500", text: "text-teal-500" },
                      { ring: "ring-amber-200", bg: "bg-amber-500", text: "text-amber-500" },
                      { ring: "ring-emerald-200", bg: "bg-emerald-500", text: "text-emerald-500" },
                    ];
                    const sc = stepColors[i % stepColors.length];

                    return (
                      <div key={step.stepNumber || i} className="relative flex gap-3.5 pb-4 last:pb-0">
                        {/* Step number circle */}
                        <div className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${sc.bg} text-white text-[10px] font-bold shadow-md ring-2 ${sc.ring}`}>
                          {step.stepNumber || i + 1}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-[12px] font-bold text-slate-700 tracking-tight leading-snug">
                              {step.title}
                            </h5>
                            {step.duration && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[9px] font-semibold text-slate-500 shrink-0">
                                <Clock className="w-2.5 h-2.5 text-slate-400" />
                                {step.duration}
                              </span>
                            )}
                          </div>
                          {step.description && step.description !== step.title && (
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-2">
                              {step.description}
                            </p>
                          )}

                          {/* Resources */}
                          {step.resources?.length > 0 && (
                            <div className="mb-2">
                              <div className="flex items-center gap-1 mb-1">
                                <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
                                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-indigo-500">
                                  Resources
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 pl-3.5">
                                {step.resources.map((r, ri) => (
                                  <span
                                    key={ri}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50/80 border border-indigo-100/50 text-[10px] font-medium text-indigo-600 tracking-tight"
                                  >
                                    <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Milestones */}
                          {step.milestones?.length > 0 && (
                            <div>
                              <div className="flex items-center gap-1 mb-1">
                                <Trophy className="w-2.5 h-2.5 text-amber-400" />
                                <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-amber-600">
                                  Milestones
                                </span>
                              </div>
                              <ul className="space-y-1 pl-3.5">
                                {step.milestones.map((m, mi) => (
                                  <li key={mi} className="flex items-start gap-1.5">
                                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)] shrink-0" />
                                    <span className="text-[10px] font-medium text-slate-600 leading-relaxed">
                                      {m}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Flow Diagram */}
            {hasFlowDiagram && (
              <CertificationEcosystemRoadmap flowDiagram={item.flowDiagram} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}