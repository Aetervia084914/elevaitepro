"use client";
import { Card, CardContent } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { Checkbox } from "./ui/checkbox.jsx";
import { BookOpen } from "lucide-react";

const PRIORITY_STYLES = {
  High: "bg-vibrant-coral text-white",
  Medium: "bg-vibrant-amber text-white",
  Low: "bg-vibrant-teal text-white"
};

const CATEGORY_STYLES = {
  Technical: "text-vibrant-azure bg-vibrant-azure/5 border-vibrant-azure/20",
  Soft: "text-vibrant-purple bg-vibrant-purple/5 border-vibrant-purple/20",
  Domain: "text-vibrant-teal bg-vibrant-teal/5 border-vibrant-teal/20"
};

export function SkillGapCard({ item, onToggle }) {
  return (
    <Card
      className={`glass-glossy rounded-[1.25rem] border transition-all duration-300 flex overflow-hidden relative group ${
        item.checked ? "opacity-50 grayscale bg-slate-50/50" : "bg-white/80 border-white shadow-sm"
      }`}
    >
      {!item.checked && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          item.priority === 'High' ? 'bg-vibrant-coral' : item.priority === 'Medium' ? 'bg-vibrant-amber' : 'bg-vibrant-teal'
        } opacity-80`} />
      )}
      
      <CardContent className="flex items-center gap-4 p-4 w-full relative z-10">
        <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-white border border-slate-100 group-hover:border-vibrant-azure transition-all shadow-sm shrink-0">
          <Checkbox
            checked={item.checked}
            onCheckedChange={() => onToggle(item.id)}
            className="w-4 h-4 rounded-md border-slate-300 data-[state=checked]:bg-vibrant-azure shadow-sm"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-[14px] font-semibold text-slate-800 tracking-tight leading-snug ${item.checked ? "line-through opacity-50" : ""}`}>
              {item.title}
            </h4>
          </div>
          <p className="text-[12px] font-normal text-slate-500 leading-relaxed tracking-tight mb-2">{item.description}</p>
          <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-500 tracking-tight">
            <BookOpen className="h-3 w-3 text-vibrant-azure" />
            <span>{item.learningPath}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className={`text-[9px] font-bold tracking-widest px-2 py-1 rounded-lg border-none shadow-sm ${PRIORITY_STYLES[item.priority] || ""}`}>
            {item.priority}
          </Badge>
          <Badge variant="outline" className={`text-[9px] font-bold tracking-widest px-2 py-1 rounded-lg border bg-white/40 ${CATEGORY_STYLES[item.category] || ""}`}>
            {item.category}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
