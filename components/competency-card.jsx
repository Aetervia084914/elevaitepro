"use client";
import { Card, CardContent } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { Checkbox } from "./ui/checkbox.jsx";
import { Clock, LinkIcon } from "lucide-react";
const IMPORTANCE_STYLES = {
  Critical: "bg-destructive/10 text-destructive border-destructive/20",
  Important: "bg-warning/10 text-warning border-warning/20",
  Beneficial: "bg-success/10 text-success border-success/20"
};
function CompetencyCard({ item, onToggle }) {
  return (
    <Card className={`glass-glossy rounded-[1.25rem] border transition-all duration-300 flex overflow-hidden relative group ${item.checked ? "opacity-50 grayscale bg-slate-50/50" : "bg-white/80 border-white shadow-sm"}`}>
      {!item.checked && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${item.importance === 'Critical' ? 'bg-vibrant-coral' : item.importance === 'Important' ? 'bg-vibrant-amber' : 'bg-vibrant-teal'} opacity-80`} />
      )}
      <CardContent className="flex items-start gap-3 p-4 w-full relative z-10">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-slate-100 group-hover:border-vibrant-azure transition-all shadow-sm shrink-0">
          <Checkbox
            checked={item.checked}
            onCheckedChange={() => onToggle(item.id)}
            className="w-4 h-4 rounded-md border-slate-300 data-[state=checked]:bg-vibrant-azure shadow-sm"
            aria-label={`Mark ${item.title} as complete`}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-[13px] font-bold text-slate-800 tracking-tight leading-snug ${item.checked ? "line-through opacity-50" : ""}`}>{item.title}</h4>
            <Badge variant="outline" className={`shrink-0 text-[9px] font-bold tracking-widest px-2 py-1 rounded-lg border bg-white/40 ${IMPORTANCE_STYLES[item.importance] || ""}`}>{item.importance}</Badge>
          </div>
          <p className="text-[11px] font-medium text-slate-500 leading-relaxed tracking-tight">{item.description}</p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <Clock className="h-3 w-3 text-vibrant-azure" />{item.timeToAcquire}
            </span>
          </div>
          {item.resources.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.resources.map((r, i) => (
                <span key={i} className="flex items-center gap-1 rounded-md bg-vibrant-purple/5 border border-vibrant-purple/20 px-2 py-0.5 text-[10px] text-vibrant-purple">
                  <LinkIcon className="h-2.5 w-2.5" />{r}
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
export {
  CompetencyCard
};