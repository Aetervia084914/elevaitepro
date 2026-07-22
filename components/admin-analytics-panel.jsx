"use client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { BarChart3 as BarIcon, Award as AwardIcon, Gauge as GaugeIcon, Clock as ClockIcon } from "lucide-react";

function AdminAnalyticsPanel({ analytics }) {
  const safeAnalytics = analytics || {
    averageAtsScore: 0,
    averageUpskillingTimeMonths: 0,
    skillsDemandFrequency: [],
    topCertifications: []
  };

  const maxSkillCount = Math.max(
    ...(safeAnalytics.skillsDemandFrequency || []).map((s) => s.count),
    1
  );
  const maxCertCount = Math.max(
    ...(safeAnalytics.topCertifications || []).map((c) => c.count),
    1
  );

  return <div className="flex flex-col gap-4">{
    /* Summary Cards */
  }<div className="grid grid-cols-2 gap-3"><Card className="glass-glossy rounded-[1.25rem] border border-white bg-white/80 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vibrant-azure/10 border border-vibrant-azure/20"><GaugeIcon className="h-5 w-5 text-vibrant-azure" /></div><div><p className="text-2xl font-bold text-slate-900">{safeAnalytics.averageAtsScore}</p><p className="text-[10px] text-slate-500 font-bold tracking-widest">
                Avg. ATS Score
              </p></div></CardContent></Card><Card className="glass-glossy rounded-[1.25rem] border border-white bg-white/80 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-vibrant-purple/10 border border-vibrant-purple/20"><ClockIcon className="h-5 w-5 text-vibrant-purple" /></div><div><p className="text-2xl font-bold text-slate-900">{safeAnalytics.averageUpskillingTimeMonths}<span className="text-sm font-normal text-slate-500">
                  mo
                </span></p><p className="text-[10px] text-slate-500 font-bold tracking-widest">
                Avg. Upskilling Time
              </p></div></CardContent></Card></div>{
    /* Skills Demand */
  }<Card className="glass-glossy rounded-[1.25rem] border border-white bg-white/80 shadow-sm"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-slate-900"><BarIcon className="h-3.5 w-3.5 text-vibrant-amber" />
            Skills Demand Frequency
          </CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{(safeAnalytics.skillsDemandFrequency || []).map((item, index) => <div key={`${item.skill}-${index}`} className="flex items-center gap-3"><span title={item.skill} className="w-56 shrink-0 whitespace-normal break-words text-xs text-muted-foreground">{item.skill}</span><div className="h-5 flex-1 overflow-hidden rounded bg-secondary"><div
    className="flex h-full items-center rounded bg-vibrant-amber/80 px-2 transition-all duration-700"
    style={{
      width: `${Math.min(85, item.count / maxSkillCount * 100)}%`
    }}
  ><span className="text-[10px] font-medium text-primary-foreground">{item.count}</span></div></div></div>)}</CardContent></Card>{
    /* Top Certifications */
  }<Card className="glass-glossy rounded-[1.25rem] border border-white bg-white/80 shadow-sm"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-slate-900"><AwardIcon className="h-3.5 w-3.5 text-vibrant-teal" />
            Top Certifications
          </CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{(safeAnalytics.topCertifications || []).map((item, index) => <div key={item.certification || `cert-${index}`} className="flex items-center gap-3"><span title={item.certification} className="w-56 shrink-0 whitespace-normal break-words text-xs text-muted-foreground">{item.certification}</span><div className="h-5 flex-1 overflow-hidden rounded bg-secondary"><div
    className="flex h-full items-center rounded bg-vibrant-teal/80 px-2 transition-all duration-700"
    style={{
      width: `${Math.min(85, item.count / maxCertCount * 100)}%`
    }}
  ><span className="text-[10px] font-medium text-accent-foreground">{item.count}</span></div></div></div>)}</CardContent></Card></div>;
}
export {
  AdminAnalyticsPanel
};
