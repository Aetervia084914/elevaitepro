"use client";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "./ui/sheet.jsx";
import { Badge } from "./ui/badge.jsx";
import { Button } from "./ui/button.jsx";
import { ScrollArea } from "./ui/scroll-area.jsx";
import {
  Check,
  Circle,
  Clock,
  BookOpen,
  Trophy,
  Loader2
} from "lucide-react";


function CertificationDrawer({
  cert,
  open,
  onClose
}) {
  const [pathFlow, setPathFlow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState([]);
  const [animatedSteps, setAnimatedSteps] = useState([]);

  useEffect(() => {
    if (!cert || !open) {
      setPathFlow(null);
      setSteps([]);
      setAnimatedSteps([]);
      setLoading(false);
      return;
    }

    // Prefer using data already returned by OpenAI and mapped in services.js.
    // This avoids extra network calls and ensures the drawer matches the response.
    const directSteps = Array.isArray(cert.steps) ? cert.steps : [];
    const directTotal = cert.totalDuration || cert.duration || cert.preparation?.totalPreparationDuration || "";
    const directFlow = cert.flowDiagram || "";

    // Always set pathFlow with available data (preparation details are valuable even without steps)
    setLoading(false);
    setPathFlow({
      totalDuration: directTotal,
      steps: directSteps,
      flowDiagram: directFlow,
      preparation: cert.preparation || null,
    });
    setSteps(directSteps);
    // Avoid queuing timeouts (can cause UI hangs on repeated open/close).
    setAnimatedSteps(directSteps.map((_, i) => i));
    return;

    // Legacy fallback (if getCertificationPathFlow exists in runtime) for older data.
    if (typeof getCertificationPathFlow === 'function') {
      setLoading(true);
      setAnimatedSteps([]);
      getCertificationPathFlow(cert.id, cert.title).then((flow) => {
        setPathFlow(flow);
        setSteps(flow.steps || []);
        setLoading(false);
        flow.steps?.forEach((_, i) => {
          setTimeout(() => {
            setAnimatedSteps((prev) => [...prev, i]);
          }, 200 * (i + 1));
        });
      }).catch(() => {
        setLoading(false);
        setPathFlow(null);
        setSteps([]);
      });
    } else {
      setLoading(false);
      setPathFlow(null);
      setSteps([]);
    }
  }, [cert, open]);

  function toggleStep(index) {
    setSteps(
      (prev) => prev.map(
        (s, i) => i === index ? { ...s, completed: !s.completed } : s
      )
    );
  }

  const completedCount = steps.filter((s) => s.completed).length;
  const progressPercent = steps.length > 0 ? Math.round(completedCount / steps.length * 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full border-border bg-white sm:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-card-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            {cert?.title || "Certification Path"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Detailed certification preparation path.
          </SheetDescription>
          {cert && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{cert.provider}</Badge>
              <Badge variant="outline" className="text-xs">{cert.duration}</Badge>
            </div>
          )}
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-140px)] pr-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading certification path...</p>
            </div>
          ) : pathFlow ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium text-card-foreground">{completedCount}/{steps.length} steps</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">Total Duration: {pathFlow.totalDuration}</span>
              </div>

              {pathFlow.preparation && (
                <div className="flex flex-col gap-3 rounded-lg bg-secondary/30 p-3">
                  {pathFlow.preparation.eligibilityPrerequisites && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Eligibility</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.eligibilityPrerequisites}</div>
                    </div>
                  )}
                  {pathFlow.preparation.foundationKnowledge && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Foundation Knowledge</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.foundationKnowledge}</div>
                    </div>
                  )}
                  {pathFlow.preparation.learningSequence && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Learning Sequence</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.learningSequence}</div>
                    </div>
                  )}
                  {Array.isArray(pathFlow.preparation.handsOnProjects) && pathFlow.preparation.handsOnProjects.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Hands-On Projects</div>
                      <ul className="text-xs text-muted-foreground list-disc ml-4">
                        {pathFlow.preparation.handsOnProjects.map((p, pi) => (
                          <li key={pi}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {pathFlow.preparation.examPreparationStrategy && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Exam Strategy</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.examPreparationStrategy}</div>
                    </div>
                  )}
                  {pathFlow.preparation.mockTestsAndRevision && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Mock Tests & Revision</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.mockTestsAndRevision}</div>
                    </div>
                  )}
                  {pathFlow.preparation.examRegistrationAndAttempt && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Exam Registration</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.examRegistrationAndAttempt}</div>
                    </div>
                  )}
                  {pathFlow.preparation.postCertificationApplication && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Post-Certification Application</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.postCertificationApplication}</div>
                    </div>
                  )}
                  {pathFlow.preparation.milestonesAndOutcomes && (
                    <div>
                      <div className="text-[11px] font-semibold text-card-foreground">Milestones & Outcomes</div>
                      <div className="text-xs text-muted-foreground">{pathFlow.preparation.milestonesAndOutcomes}</div>
                    </div>
                  )}
                </div>
              )}

              <div className="relative flex flex-col">
                <div className="absolute left-[15px] top-0 h-full w-[2px] bg-border" />
                {steps.map((step, i) => {
                  const isVisible = animatedSteps.includes(i);
                  return (
                    <div
                      key={step.stepNumber}
                      className="relative flex gap-4 pb-6 last:pb-0"
                      style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? "translateY(0)" : "translateY(12px)",
                        transition: `opacity 0.4s ease, transform 0.4s ease`
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleStep(i)}
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-all ${step.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary"}`}
                        aria-label={`Toggle step ${step.stepNumber}: ${step.title}`}
                      >
                        {step.completed ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                      </button>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5 pb-2">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-medium ${step.completed ? "text-muted-foreground line-through" : "text-card-foreground"}`}>{step.title}</h4>
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-2.5 w-2.5" />{step.duration}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{step.description}</p>
                        {step.resources?.length > 0 && (
                          <div className="flex flex-col gap-1 pt-1">
                            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><BookOpen className="h-2.5 w-2.5" />Resources</span>
                            <div className="flex flex-wrap gap-1">
                              {step.resources.map((r, ri) => (
                                <span key={ri} className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{r}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {step.milestones?.length > 0 && (
                          <div className="flex flex-col gap-1 pt-1">
                            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground"><Trophy className="h-2.5 w-2.5" />Milestones</span>
                            <ul className="flex flex-col gap-0.5">
                              {step.milestones.map((m, mi) => (
                                <li key={mi} className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-1 w-1 rounded-full bg-primary" />{m}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {pathFlow.flowDiagram && (
                <div className="mt-4 rounded bg-secondary/60 p-3 text-xs text-muted-foreground">
                  <div className="mb-1 font-semibold text-card-foreground">Certification Flow:</div>
                  <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{pathFlow.flowDiagram}</pre>
                </div>
              )}
              <Button onClick={onClose} className="mt-2 w-full bg-primary text-primary-foreground hover:bg-primary/90">Close</Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <p className="text-sm text-muted-foreground">No path data available</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export { CertificationDrawer };
