import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import {
  Gauge,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  FileText,
  Tag,
  Zap,
  Brain,
  Award,
  CheckCircle2,
  Target,
  Sparkles,
} from "lucide-react";

function ScoreRing({ score = 0, label, size = "lg" }) {
  const radius = size === "lg" ? 54 : 32;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const svgSize = size === "lg" ? 132 : 80;
  const strokeWidth = size === "lg" ? 8 : 6;

  const color =
    score >= 70
      ? "#10B981"
      : score >= 40
        ? "#F59E0B"
        : "#EC4899";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg
        width={svgSize}
        height={svgSize}
        className="-rotate-90 drop-shadow-[0_8px_18px_rgba(99,102,241,0.10)]"
      >
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="rgba(148,163,184,0.22)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
        <text
          x={svgSize / 2}
          y={svgSize / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90, ${svgSize / 2}, ${svgSize / 2})`}
          fill="#0F172A"
          style={{
            fontSize: size === "lg" ? "1.5rem" : "0.875rem",
            fontWeight: 700,
          }}
        >
          {score}
        </text>
      </svg>
      <span
        className={`text-center ${size === "lg" ? "text-xs" : "text-[10px]"} text-slate-500 font-semibold tracking-tight`}
      >
        {label}
      </span>
    </div>
  );
}

function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ThemeCard({ title, icon: Icon, accentBar, iconGradient, className = "", children }) {
  return (
    <Card className={`relative overflow-hidden rounded-2xl border border-white bg-white/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(15,23,42,0.08)] ${className}`}>
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${accentBar}`} />
      <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-24 -right-24 h-56 w-56 rounded-full bg-gradient-to-br from-indigo-100/40 to-purple-100/20 blur-3xl pointer-events-none" />
      <CardHeader className="pb-2 relative z-10">
        <CardTitle className="flex items-center gap-2 text-sm text-slate-800">
          <div className={`p-1.5 rounded-lg bg-gradient-to-br ${iconGradient} shadow-[0_8px_18px_rgba(99,102,241,0.18)]`}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">{children}</CardContent>
    </Card>
  );
}

/**
 * Returns the priority/importance label & accent color for a requirement item.
 * Falls back to neutral when no priority field is present.
 */
function getPriorityMeta(item) {
  const value = item?.priority || item?.importance || item?.marketValue || "";
  const v = String(value).toLowerCase();
  if (v === "high" || v === "critical") {
    return { label: value, badge: "bg-rose-50 text-rose-600 border-rose-200", dot: "bg-rose-500" };
  }
  if (v === "medium" || v === "important") {
    return { label: value, badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" };
  }
  if (v === "low" || v === "beneficial") {
    return { label: value, badge: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" };
  }
  return { label: value, badge: "bg-slate-50 text-slate-600 border-slate-200", dot: "bg-slate-400" };
}

/**
 * Professional, modern requirement section with pointer-style bullets.
 * Used for Required Skills / Competencies / Certifications inside the ATS-Ready CV Preview.
 * When `items` is empty (user completed everything) shows a success state instead.
 */
function RequirementSection({ title, icon: Icon, accent, items, emptyLabel, getTitle, getMeta }) {
  const list = Array.isArray(items) ? items : [];
  const titleOf = getTitle || ((it) => it?.title || it?.gap || it?.name || it?.skill || it?.competency || it?.certification || "");
  const metaOf = getMeta || getPriorityMeta;

  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent.iconBg}`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className={`text-[11px] font-bold uppercase tracking-wider ${accent.text}`}>
            {title}
          </span>
        </div>
        <span className="text-[10px] font-bold text-slate-400">
          {list.length} {list.length === 1 ? "item" : "items"}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50/60 border border-emerald-100 px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-semibold text-emerald-700 leading-tight">
            {emptyLabel || "All requirements completed"}
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((item, index) => {
            const meta = metaOf(item);
            const name = titleOf(item);
            const sub = item?.description || item?.learningPath || item?.provider || item?.timeToAcquire || "";
            const categoryLabel = item?.category && item.category !== sub ? item.category : "";
            return (
              <li
                key={item?.id || index}
                className="flex items-start gap-2.5 rounded-xl bg-white border border-slate-100 px-3 py-2 hover:border-indigo-200 hover:shadow-[0_4px_12px_rgba(99,102,241,0.08)] transition-all duration-200"
              >
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-bold text-slate-800 leading-tight tracking-tight">
                      {name}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {meta.label && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md border ${meta.badge}`}
                        >
                          {meta.label}
                        </Badge>
                      )}
                      {categoryLabel && (
                        <Badge
                          variant="outline"
                          className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-md border bg-slate-50 text-slate-600 border-slate-200"
                        >
                          {categoryLabel}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {sub && (
                    <p className="mt-0.5 text-[10px] font-medium text-slate-500 leading-snug">
                      {sub}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BulletList({ items, bulletClassName }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, index) => (
        <li
          key={index}
          className="flex items-start gap-2 text-xs text-slate-600 font-medium leading-relaxed"
        >
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${bulletClassName}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AtsPanel({
  atsScore,
  atsResume,
  selectedRole = "",
  requiredSkills = [],
  requiredAiSkills = [],
  requiredCompetencies = [],
  requiredCertifications = [],
  hideScore = false,
}) {
  const safeAtsScore = atsScore ?? {
    overallScore: 0,
    sectionScores: {},
    strengths: [],
    gaps: [],
    recommendations: [],
  };

  const safeAtsResume = atsResume ?? {
    headline: "",
    summary: "",
    keywordOptimization: [],
    coreSkills: [],
    competencies: [],
    certifications: [],
  };

  // Use the user's selected future role for keyword optimization (single target).
  const targetRole = String(selectedRole || "").trim();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ThemeCard
          title="Strengths"
          icon={TrendingUp}
          accentBar="bg-gradient-to-r from-emerald-400 to-teal-400"
          iconGradient="from-emerald-400 to-teal-400"
        >
          <BulletList
            items={safeAtsScore.strengths ?? []}
            bulletClassName="bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.45)]"
          />
        </ThemeCard>

        <ThemeCard
          title="Gaps"
          icon={AlertTriangle}
          accentBar="bg-gradient-to-r from-amber-400 to-orange-400"
          iconGradient="from-amber-400 to-orange-400"
        >
          <BulletList
            items={ensureArray(safeAtsScore.gaps)}
            bulletClassName="bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.45)]"
          />
        </ThemeCard>

        <ThemeCard
          title="Recommendations"
          icon={Lightbulb}
          accentBar="bg-gradient-to-r from-purple-500 to-pink-500"
          iconGradient="from-purple-500 to-pink-500"
          className="md:col-span-2"
        >
          <BulletList
            items={ensureArray(safeAtsScore.recommendations)}
            bulletClassName="bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.45)]"
          />
        </ThemeCard>
      </div>

      <ThemeCard
        title="ATS-Ready CV Preview"
        icon={FileText}
        accentBar="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        iconGradient="from-indigo-500 via-purple-500 to-pink-500"
      >
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {safeAtsResume.headline}
            </h4>
            <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
              {safeAtsResume.summary}
            </p>
          </div>

          {/* Keyword Optimization — single target role chosen by the user */}
          <div className="flex flex-col gap-2">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <Tag className="h-2.5 w-2.5 text-indigo-500" />
              Keyword Optimization
            </span>
            <div className="flex flex-wrap gap-1.5">
              {targetRole ? (
                <Badge className="border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 shadow-[0_2px_8px_rgba(99,102,241,0.12)]">
                  <Target className="w-3 h-3 mr-1" />
                  {targetRole}
                </Badge>
              ) : (
                <span className="text-[10px] font-medium text-slate-400 italic">
                  No target role selected
                </span>
              )}
            </div>
          </div>

          {/* Required for selected role — filtered to items the user has not yet completed. */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Required to land this role
              </span>
            </div>

            <RequirementSection
              title="Required Skills"
              icon={Zap}
              accent={{ iconBg: "bg-gradient-to-br from-indigo-500 to-blue-500", text: "text-indigo-600" }}
              items={requiredSkills}
              emptyLabel="All required skills completed"
            />

            <RequirementSection
              title="Required AI Skills"
              icon={Sparkles}
              accent={{ iconBg: "bg-gradient-to-br from-violet-500 to-purple-500", text: "text-violet-600" }}
              items={requiredAiSkills}
              emptyLabel="All AI skills completed"
            />

            <RequirementSection
              title="Required Competencies"
              icon={Brain}
              accent={{ iconBg: "bg-gradient-to-br from-amber-500 to-orange-500", text: "text-amber-600" }}
              items={requiredCompetencies}
              emptyLabel="All required competencies completed"
            />

            <RequirementSection
              title="Required Certifications"
              icon={Award}
              accent={{ iconBg: "bg-gradient-to-br from-purple-500 to-pink-500", text: "text-purple-600" }}
              items={requiredCertifications}
              emptyLabel="All required certifications completed"
              getMeta={(item) => {
                const meta = getPriorityMeta(item);
                if (meta.label) return meta;
                if (item?.provider) {
                  return { label: item.provider, badge: "bg-purple-50 text-purple-600 border-purple-200", dot: "bg-purple-500" };
                }
                return { label: "", badge: "", dot: "bg-purple-400" };
              }}
            />
          </div>
        </div>
      </ThemeCard>

      {!hideScore && (
        <ThemeCard
          title="ATS Score"
          icon={Gauge}
          accentBar="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
          iconGradient="from-indigo-500 via-purple-500 to-pink-500"
        >
          <div className="rounded-2xl border border-indigo-100/70 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/70 p-5">
            <div className="flex flex-wrap items-center justify-center gap-6">
              <ScoreRing score={safeAtsScore.overallScore} label="Overall" />
              <ScoreRing
                score={safeAtsScore.sectionScores?.skills ?? 0}
                label="Skills"
                size="sm"
              />
              <ScoreRing
                score={safeAtsScore.sectionScores?.competencies ?? 0}
                label="Competencies"
                size="sm"
              />
              <ScoreRing
                score={safeAtsScore.sectionScores?.certifications ?? 0}
                label="Certifications"
                size="sm"
              />
            </div>
          </div>
        </ThemeCard>
      )}
    </div>
  );
}