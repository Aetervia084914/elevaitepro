"use client";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { BarChart3, Clock, Award, TrendingUp } from "lucide-react";
const DIFFICULTY_COLOR = {
  Low: "bg-success/10 text-success border-success/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  High: "bg-destructive/10 text-destructive border-destructive/20"
};
function ComparisonPanel({ items }) {
  if (items.length <= 1) {
    return <Card className="border-border/50 bg-card"><CardContent className="flex flex-col items-center justify-center py-12"><BarChart3 className="mb-3 h-10 w-10 text-muted-foreground/40" /><p className="text-sm text-muted-foreground">
            Add comparison career goals to see a side-by-side analysis
          </p></CardContent></Card>;
  }
  const maxScore = Math.max(...items.map((i) => i.atsScore));
  const maxDuration = Math.max(...items.map((i) => i.totalDurationMonths));
  return <div className="flex flex-col gap-4"><Card className="border-border/50 bg-card"><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base text-card-foreground"><BarChart3 className="h-4 w-4 text-primary" />
            Career Comparison
          </CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left"><th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">
                    Career Goal
                  </th><th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">
                    ATS Score
                  </th><th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">
                    Duration
                  </th><th className="pb-2 pr-4 text-xs font-medium text-muted-foreground">
                    Certs
                  </th><th className="pb-2 text-xs font-medium text-muted-foreground">
                    Difficulty
                  </th></tr></thead><tbody>{items.map((item, i) => <tr
    key={i}
    className="border-b border-border/50 last:border-0"
  ><td className="py-3 pr-4"><span className="font-medium text-card-foreground">{item.careerGoal}</span>{i === 0 && <Badge className="ml-2 bg-primary/10 text-[10px] text-primary">
                          Primary
                        </Badge>}</td><td className="py-3 pr-4"><div className="flex items-center gap-2"><div className="h-2 w-16 overflow-hidden rounded-full bg-secondary"><div
    className="h-full rounded-full bg-primary transition-all duration-700"
    style={{
      width: `${item.atsScore / maxScore * 100}%`
    }}
  /></div><span className="text-xs text-card-foreground">{item.atsScore}</span></div></td><td className="py-3 pr-4"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{item.totalDurationMonths}mo
                      </span></td><td className="py-3 pr-4"><span className="flex items-center gap-1 text-xs text-muted-foreground"><Award className="h-3 w-3" />{item.certificationCount}</span></td><td className="py-3"><Badge
    variant="outline"
    className={`text-[10px] ${DIFFICULTY_COLOR[item.difficultyLevel] || ""}`}
  >{item.difficultyLevel}</Badge></td></tr>)}</tbody></table></div></CardContent></Card>{
    /* Visual comparison bars */
  }<div className="grid grid-cols-1 gap-3 md:grid-cols-2"><Card className="border-border/50 bg-card"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-card-foreground"><TrendingUp className="h-3.5 w-3.5 text-primary" />
              ATS Score Comparison
            </CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{items.map((item, i) => <div key={i} className="flex items-center gap-2"><span className="w-24 truncate text-xs text-muted-foreground">{item.careerGoal}</span><div className="h-5 flex-1 overflow-hidden rounded bg-secondary"><div
    className="flex h-full items-center rounded bg-primary px-2 transition-all duration-700"
    style={{
      width: `${item.atsScore / 100 * 100}%`
    }}
  ><span className="text-[10px] font-medium text-primary-foreground">{item.atsScore}</span></div></div></div>)}</CardContent></Card><Card className="border-border/50 bg-card"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm text-card-foreground"><Clock className="h-3.5 w-3.5 text-primary" />
              Duration Comparison
            </CardTitle></CardHeader><CardContent className="flex flex-col gap-2">{items.map((item, i) => <div key={i} className="flex items-center gap-2"><span className="w-24 truncate text-xs text-muted-foreground">{item.careerGoal}</span><div className="h-5 flex-1 overflow-hidden rounded bg-secondary"><div
    className="flex h-full items-center rounded bg-accent px-2 transition-all duration-700"
    style={{
      width: `${item.totalDurationMonths / maxDuration * 100}%`
    }}
  ><span className="text-[10px] font-medium text-accent-foreground">{item.totalDurationMonths}mo
                    </span></div></div></div>)}</CardContent></Card></div></div>;
}
export {
  ComparisonPanel
};