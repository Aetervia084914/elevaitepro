"use client";
import { Card, CardContent } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import {
  Calendar, Clock, Rocket, BookOpen, Target, Trophy,
  ChevronRight, Zap, CheckCircle2
} from "lucide-react";

const PHASE_CONFIG = [
  {
    key: 'phase1',
    icon: Rocket,
    gradient: 'from-blue-500 to-cyan-400',
    bg: 'bg-blue-50',
    border: 'border-blue-200/60',
    dot: 'bg-blue-500',
    bar: 'bg-gradient-to-r from-blue-500 to-cyan-400',
    badge: 'bg-blue-100 text-blue-700',
    accent: 'text-blue-600',
  },
  {
    key: 'phase2',
    icon: BookOpen,
    gradient: 'from-violet-500 to-purple-400',
    bg: 'bg-violet-50',
    border: 'border-violet-200/60',
    dot: 'bg-violet-500',
    bar: 'bg-gradient-to-r from-violet-500 to-purple-400',
    badge: 'bg-violet-100 text-violet-700',
    accent: 'text-violet-600',
  },
  {
    key: 'phase3',
    icon: Target,
    gradient: 'from-amber-500 to-orange-400',
    bg: 'bg-amber-50',
    border: 'border-amber-200/60',
    dot: 'bg-amber-500',
    bar: 'bg-gradient-to-r from-amber-500 to-orange-400',
    badge: 'bg-amber-100 text-amber-700',
    accent: 'text-amber-600',
  },
  {
    key: 'phase4',
    icon: Trophy,
    gradient: 'from-emerald-500 to-teal-400',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200/60',
    dot: 'bg-emerald-500',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    badge: 'bg-emerald-100 text-emerald-700',
    accent: 'text-emerald-600',
  },
];

function TimelinePanel({ timeline }) {
  const safeTimeline = timeline || { totalDurationMonths: 0, phases: [], monthlyBreakdown: [] };
  const phases = safeTimeline.phases || [];
  const total = safeTimeline.totalDurationMonths || 18;

  const getFocusAreas = (focus) => {
    if (!focus) return [];
    if (Array.isArray(focus)) return focus;
    if (typeof focus === 'string') {
      return focus.split(/[;,]/).map(f => f.trim()).filter(f => f.length > 0);
    }
    return [];
  };

  if (phases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Calendar className="h-10 w-10 text-slate-300 mb-3" />
        <p className="text-sm font-semibold text-slate-400">No timeline data available yet</p>
        <p className="text-xs text-slate-400 mt-1">Upload a resume and run analysis to generate your career roadmap</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Overview header with segmented progress bar ── */}
      <Card className="rounded-2xl border border-white/80 bg-gradient-to-br from-white via-slate-50/80 to-blue-50/40 shadow-[0_2px_20px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">Career Transition Roadmap</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{phases.length} phases &middot; {total} months total</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-white/80 border border-slate-200/60 rounded-full px-3 py-1.5 shadow-sm">
              <Clock className="h-3 w-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">{total}</span>
              <span className="text-[10px] text-slate-500">months</span>
            </div>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="px-5 pb-5">
          <div className="flex gap-1 h-3 rounded-full overflow-hidden bg-slate-100/80 p-0.5">
            {phases.map((phase, i) => {
              const cfg = PHASE_CONFIG[i] || PHASE_CONFIG[0];
              const widthPercent = total > 0
                ? Math.max(8, Math.round((phase.durationMonths / total) * 100))
                : 25;
              return (
                <div
                  key={i}
                  className={`h-full rounded-full ${cfg.bar} transition-all duration-700`}
                  style={{ width: `${widthPercent}%` }}
                  title={`${phase.phase}: ${phase.durationMonths} months`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {phases.map((phase, i) => {
              const cfg = PHASE_CONFIG[i] || PHASE_CONFIG[0];
              return (
                <span key={i} className={`text-[10px] font-semibold ${cfg.accent}`}>
                  {phase.range || `${phase.durationMonths}mo`}
                </span>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ── Vertical timeline with phase cards ── */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[23px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-blue-300 via-violet-300 via-amber-300 to-emerald-300 rounded-full" />

        <div className="flex flex-col gap-4">
          {phases.map((phase, i) => {
            const cfg = PHASE_CONFIG[i] || PHASE_CONFIG[0];
            const Icon = cfg.icon;
            const items = getFocusAreas(phase.focus);

            return (
              <div key={i} className="relative flex gap-4 pl-0">
                {/* Timeline node */}
                <div className="relative z-10 flex flex-col items-center pt-5">
                  <div className={`flex items-center justify-center h-[46px] w-[46px] rounded-2xl bg-gradient-to-br ${cfg.gradient} shadow-lg`}
                    style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.10)` }}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  {i < phases.length - 1 && (
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 rotate-90 mt-1" />
                  )}
                </div>

                {/* Phase card */}
                <Card className={`flex-1 rounded-2xl border ${cfg.border} ${cfg.bg}/40 bg-white/90 shadow-[0_2px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300`}>
                  <CardContent className="p-4">
                    {/* Phase header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-bold text-slate-900 tracking-tight">
                          {phase.phase}
                        </h4>
                        <Badge className={`${cfg.badge} text-[10px] font-bold px-2 py-0.5 rounded-md border-0`}>
                          Phase {i + 1}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span className="font-semibold text-slate-700">{phase.range || `${phase.durationMonths} months`}</span>
                      </div>
                    </div>

                    {/* Action items */}
                    <div className="flex flex-col gap-1.5">
                      {items.map((item, j) => (
                        <div
                          key={j}
                          className="flex items-start gap-2.5 group"
                        >
                          <div className="mt-[3px] flex-shrink-0">
                            <CheckCircle2 className={`h-3.5 w-3.5 ${cfg.accent} opacity-60 group-hover:opacity-100 transition-opacity`} />
                          </div>
                          <span className="text-[12px] leading-[1.5] text-slate-600 group-hover:text-slate-800 transition-colors">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Item count footer */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {items.length} action{items.length !== 1 ? 's' : ''} in this phase
                        </span>
                        <div className="flex items-center gap-1">
                          <Zap className={`h-3 w-3 ${cfg.accent} opacity-50`} />
                          <span className={`text-[10px] font-bold ${cfg.accent}`}>
                            {phase.durationMonths}mo
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Summary footer ── */}
      <Card className="rounded-2xl border border-white/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 shadow-[0_1px_12px_rgba(0,0,0,0.03)]">
        <CardContent className="py-3.5 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              {phases.map((phase, i) => {
                const cfg = PHASE_CONFIG[i] || PHASE_CONFIG[0];
                return (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    <span className="text-[10px] font-semibold text-slate-500">{phase.phase}</span>
                  </div>
                );
              })}
            </div>
            <span className="text-[11px] text-slate-400">
              {phases.reduce((s, p) => s + getFocusAreas(p.focus).length, 0)} total actions
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { TimelinePanel };
