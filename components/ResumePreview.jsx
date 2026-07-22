"use client";
// =============================
// ResumePreview — Ultra-Premium Resume Builder
// Sapphire Royal design system, ATS-optimized, PDF + DOCX export
// =============================
import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button.jsx";
import {
  FileText,
  X,
  Sparkles,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Award,
  Layers,
  FileDown,
  Wrench,
  Star,
} from "lucide-react";
import { downloadResumeFromBackend, downloadResumePdfFromPreview } from "../services/services.js";
import { ResumeMainContent } from "./ResumeMainContent.jsx";

// =============================
// Section Component — Premium section renderer with gradient icon containers
// =============================
function ResumeSection({ icon: Icon, title, children, gradient = "from-indigo-500 to-purple-500" }) {
  if (!children) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2.5 mb-3">
        {Icon && (
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md shrink-0`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        <h3 className="text-[11px] font-bold tracking-[0.12em] uppercase text-slate-800">
          {title}
        </h3>
      </div>
      <div className={`h-px bg-gradient-to-r ${gradient} opacity-20 mb-3`} />
      {children}
    </div>
  );
}

// =============================
// Bullet Item — Premium bullet rendering with gradient dot
// =============================
function BulletItem({ text }) {
  if (!text) return null;
  return (
    <div className="flex items-start gap-2.5 mb-1.5">
      <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 shrink-0 shadow-sm" />
      <p className="text-[10.5px] leading-[1.6] text-slate-600 font-medium">{text}</p>
    </div>
  );
}

// =============================
// Skill Badge — Category-tinted chip with premium coloring
// =============================
function SkillBadge({ text, tint = "indigo" }) {
  const tints = {
    indigo: "bg-indigo-50/80 border-indigo-200/60 text-indigo-700",
    cyan: "bg-cyan-50/80 border-cyan-200/60 text-cyan-700",
    amber: "bg-amber-50/80 border-amber-200/60 text-amber-700",
    violet: "bg-violet-50/80 border-violet-200/60 text-violet-700",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[9.5px] font-semibold mr-1.5 mb-1.5 transition-colors duration-200 hover:shadow-sm ${tints[tint] || tints.indigo}`}>
      {text}
    </span>
  );
}

// =============================
// Main ResumePreview Component
// =============================
export function ResumePreview({ resumeData, onClose, careerGoal }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const previewPaperRef = useRef(null);

  const sections = resumeData?.sections || {};
  const contact = resumeData?.contact || {};
  const fullText = resumeData?.fullText || "";
  const updatedAtsScore = resumeData?.updatedAtsScore || null;
  const skillsAdded = resumeData?.skillsAdded || [];
  const competenciesAdded = resumeData?.competenciesAdded || [];
  const certificationsAdded = resumeData?.certificationsAdded || [];
  const aiSkillsAdded = resumeData?.aiSkillsAdded || [];

  const displayName = contact.name || sections.name || "Your Name";
  const displayHeadline = contact.headline || sections.headline || careerGoal || "";
  const displayEmail = contact.email || sections.email || "";
  const displayPhone = contact.phone || sections.phone || "";
  const displayLocation = contact.location || sections.location || "";
  const displayLinkedin = contact.linkedin || sections.linkedin || "";
  const displayGithub = contact.github || sections.github || sections.portfolio || "";

  const downloadViaBackend = useCallback(async (format) => {
    setIsDownloading(true);
    try {
      await downloadResumeFromBackend({
        format,
        careerGoal: displayHeadline || '',
        region: displayLocation || '',
        completedSkills: sections.coreSkills || [],
        completedAiSkills: sections.aiSkills || [],
        completedCompetencies: sections.competencies || [],
        completedCertifications: sections.certifications || [],
      });
    } catch (error) {
      console.error(`[ResumeExport] Backend ${format.toUpperCase()} failed:`, error);
    } finally {
      setIsDownloading(false);
    }
  }, [displayHeadline, displayLocation, sections]);

  const handleDownloadPdf = useCallback(async () => {
    setIsDownloading(true);
    try {
      await downloadResumePdfFromPreview({
        resumeData,
        careerGoal: displayHeadline || '',
        previewElement: previewPaperRef.current,
      });
    } catch (error) {
      console.error('[ResumeExport] Preview PDF failed:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [displayHeadline, resumeData]);
  const handleDownloadDocx = useCallback(() => downloadViaBackend('docx'), [downloadViaBackend]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm"
      >
        <div className="absolute inset-0 overflow-y-auto py-6 px-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", damping: 28, stiffness: 260 }}
          className="relative w-full max-w-[860px] mx-auto"
        >
          {/* ===== Glassmorphism Container ===== */}
          <div className="rounded-[24px] bg-white/70 backdrop-blur-[20px] border border-white/30 shadow-[0_32px_80px_rgba(0,0,0,0.18)] overflow-hidden">

            {/* ===== Top Accent Gradient Bar ===== */}
            <div className="h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* ===== Preview Header Bar ===== */}
            <div className="z-20 flex items-center justify-between gap-3 px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_4px_14px_rgba(99,102,241,0.35)]">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold tracking-tight text-slate-900">Resume Preview</h2>
                  <p className="text-[11px] font-medium text-slate-400">AI-enhanced &bull; ATS-optimized &bull; Zero-hallucination</p>
                </div>
                {updatedAtsScore > 0 && (
                  <div className="ml-2 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/60 shadow-sm">
                    <span className="text-[11px] font-bold text-emerald-700">ATS {updatedAtsScore}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Download PDF */}
                <Button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownloadPdf}
                  className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-[12px] tracking-tight shadow-[0_4px_14px_rgba(99,102,241,0.4)] hover:from-indigo-500 hover:to-purple-500 hover:shadow-[0_6px_20px_rgba(99,102,241,0.5)] transition-all duration-300 border-none gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Download PDF
                </Button>
                {/* Download DOCX */}
                {/* <Button
                  type="button"
                  disabled={isDownloading}
                  onClick={handleDownloadDocx}
                  className="h-10 px-5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-[12px] tracking-tight shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all duration-300 gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Download Word
                </Button> */}

                {/* Close Button */}
                <Button
                  type="button"
                  onClick={onClose}
                  variant="ghost"
                  className="w-10 h-10 rounded-xl hover:bg-slate-100 p-0"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </Button>
              </div>
            </div>

            {/* ===== Resume Preview Body ===== */}
            <div className="p-4 md:p-8 bg-gradient-to-b from-slate-50/50 to-white/30">
              {/* Resume Paper */}
              <div ref={previewPaperRef} className="mx-auto max-w-[780px] bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">

                {/* ===== Resume Header — Premium Gradient ===== */}
                <div className="relative overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 px-8 py-7 relative">
                    {/* Radial sheen overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)] pointer-events-none" />
                    {/* Subtle mesh dot pattern */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />

                    <div className="relative z-10">
                      <h1 className="text-[28px] md:text-[32px] font-bold tracking-tight text-white leading-tight">
                        {displayName}
                      </h1>
                      {displayHeadline && (
                        <p className="text-[14px] font-medium text-indigo-200/90 mt-1.5">{displayHeadline}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 mt-4 text-[11px] text-slate-300 font-medium">
                        {[
                          displayEmail && (<span key="email" className="flex items-center gap-1.5 bg-white/[0.07] px-2.5 py-1 rounded-full"><Mail className="w-3 h-3 text-indigo-300" /> {displayEmail}</span>),
                          displayPhone && (<span key="phone" className="flex items-center gap-1.5 bg-white/[0.07] px-2.5 py-1 rounded-full"><Phone className="w-3 h-3 text-indigo-300" /> {displayPhone}</span>),
                          displayLocation && (<span key="loc" className="flex items-center gap-1.5 bg-white/[0.07] px-2.5 py-1 rounded-full"><MapPin className="w-3 h-3 text-indigo-300" /> {displayLocation}</span>),
                          displayLinkedin && (<span key="li" className="flex items-center gap-1.5 bg-white/[0.07] px-2.5 py-1 rounded-full"><Linkedin className="w-3 h-3 text-indigo-300" /> {displayLinkedin}</span>),
                          displayGithub && (<span key="gh" className="flex items-center gap-1.5 bg-white/[0.07] px-2.5 py-1 rounded-full"><Github className="w-3 h-3 text-indigo-300" /> {displayGithub}</span>),
                          contact.website && (<span key="web" className="flex items-center gap-1.5 bg-white/[0.07] px-2.5 py-1 rounded-full">{contact.website}</span>),
                        ].filter(Boolean).reduce((acc, el, idx) => {
                          if (idx > 0) acc.push(<span key={`sep-${idx}`} className="text-indigo-400/40 mx-0.5">|</span>);
                          acc.push(el);
                          return acc;
                        }, [])}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== Two-Column Body ===== */}
                <div className="grid grid-cols-1 md:grid-cols-[30%_1fr] min-h-[600px]">
                  {/* ----- Left Sidebar — Premium ---- */}
                  <div className="bg-gradient-to-b from-slate-50 via-white to-slate-50/80 border-r border-slate-200/70 px-5 py-6 space-y-1">

                    {/* Core Skills - Merge existing skills with completed skill gaps by category */}
                    {((sections.coreSkills && sections.coreSkills.length > 0) || skillsAdded.length > 0) && (
                      <ResumeSection icon={Layers} title="Core Skills" gradient="from-indigo-500 to-blue-500">
                        {sections.skillCategories && typeof sections.skillCategories === "object" ? (
                          <>
                            {Object.entries(sections.skillCategories).map(([cat, skills]) => {
                              // Find completed skills that match this category
                              const categoryKey = cat.toLowerCase().replace(/\s+/g, '');
                              const matchingCompleted = (skillsAdded || []).filter(skill => {
                                if (typeof skill === 'string') return false;
                                const skillCategory = (skill.category || '').toLowerCase().replace(/\s+/g, '');
                                // Match "Technical" -> "technical", "Soft" -> "softskill", "Domain" -> "domain", etc.
                                return categoryKey.includes(skillCategory) || skillCategory.includes(categoryKey);
                              });
                              
                              const allSkillsForCategory = [
                                ...(Array.isArray(skills) ? skills : [skills]),
                                ...matchingCompleted.map(s => s.title)
                              ];
                              
                              if (allSkillsForCategory.length === 0) return null;
                              
                              return (
                                <div key={cat} className="mb-3">
                                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-500/70 mb-1.5">{cat}</p>
                                  <div className="flex flex-wrap">
                                    {allSkillsForCategory.map((s, i) => (
                                      <SkillBadge key={i} text={s} tint="indigo" />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {/* Create new category sections for unmatched completed skills */}
                            {(() => {
                              const existingCategoryKeys = Object.keys(sections.skillCategories).map(cat => 
                                cat.toLowerCase().replace(/\s+/g, '')
                              );
                              
                              // Group uncategorized skills by their category
                              const newCategories = {};
                              (skillsAdded || []).forEach(skill => {
                                if (typeof skill === 'string') {
                                  // Old format - add to "Other Skills"
                                  if (!newCategories['Other Skills']) {
                                    newCategories['Other Skills'] = [];
                                  }
                                  newCategories['Other Skills'].push(skill);
                                } else {
                                  const skillCategory = (skill.category || '').toLowerCase().replace(/\s+/g, '');
                                  const isMatched = existingCategoryKeys.some(cat => 
                                    cat.includes(skillCategory) || skillCategory.includes(cat)
                                  );
                                  
                                  if (!isMatched) {
                                    // Create new category section using the skill's category name
                                    const categoryName = skill.category || 'Other';
                                    if (!newCategories[categoryName]) {
                                      newCategories[categoryName] = [];
                                    }
                                    newCategories[categoryName].push(skill.title);
                                  }
                                }
                              });
                              
                              return Object.entries(newCategories).map(([categoryName, skills]) => (
                                <div key={categoryName} className="mb-3">
                                  <p className="text-[9.5px] font-bold uppercase tracking-wider text-indigo-500/70 mb-1.5">{categoryName}</p>
                                  <div className="flex flex-wrap">
                                    {skills.map((skill, i) => (
                                      <SkillBadge key={`${categoryName}-${i}`} text={skill} tint="indigo" />
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </>
                        ) : (
                          <div className="flex flex-wrap">
                            {/* Existing core skills */}
                            {sections.coreSkills && sections.coreSkills.map((skill, i) => (
                              <SkillBadge key={i} text={skill} tint="indigo" />
                            ))}
                            {/* Add completed skills */}
                            {skillsAdded.map((skill, i) => (
                              <SkillBadge key={`completed-${i}`} text={typeof skill === 'string' ? skill : skill.title} tint="indigo" />
                            ))}
                          </div>
                        )}
                      </ResumeSection>
                    )}

                    {/* Tools & Technologies */}
                    {((sections.toolCategories && typeof sections.toolCategories === "object") || (sections.tools && sections.tools.length > 0)) && (
                      <ResumeSection icon={Wrench} title="Tools & Technologies" gradient="from-cyan-500 to-teal-500">
                        {sections.toolCategories && typeof sections.toolCategories === "object" ? (
                          Object.entries(sections.toolCategories).map(([cat, tools]) => (
                            <div key={cat} className="mb-3">
                              <p className="text-[9.5px] font-bold uppercase tracking-wider text-cyan-500/70 mb-1.5">{cat}</p>
                              <div className="flex flex-wrap">
                                {(Array.isArray(tools) ? tools : [tools]).map((t, i) => (
                                  <SkillBadge key={i} text={t} tint="cyan" />
                                ))}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-wrap">
                            {sections.tools.map((tool, i) => (
                              <SkillBadge key={i} text={tool} tint="cyan" />
                            ))}
                          </div>
                        )}
                      </ResumeSection>
                    )}

                    {/* Certifications - Merge existing with completed certifications */}
                    {((sections.certifications && sections.certifications.length > 0) || certificationsAdded.length > 0) && (
                      <ResumeSection icon={Award} title="Certifications" gradient="from-amber-500 to-orange-500">
                        {/* Existing certifications */}
                        {sections.certifications && sections.certifications.map((cert, i) => (
                          <div key={i} className="flex items-start gap-2 mb-2">
                            <Award className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10.5px] leading-[1.55] text-slate-700 font-medium">{cert}</p>
                          </div>
                        ))}
                        {/* Completed certifications */}
                        {certificationsAdded.map((cert, i) => (
                          <div key={`completed-cert-${i}`} className="flex items-start gap-2 mb-2">
                            <Award className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-[10.5px] leading-[1.55] text-slate-700 font-medium">{cert}</p>
                          </div>
                        ))}
                      </ResumeSection>
                    )}

                    {/* Competencies - Merge existing with completed competencies */}
                    {((sections.competencies && sections.competencies.length > 0) || competenciesAdded.length > 0) && (
                      <ResumeSection icon={Star} title="Competencies" gradient="from-violet-500 to-purple-500">
                        {/* Existing competencies */}
                        {sections.competencies && sections.competencies.map((comp, i) => (
                          <div key={i} className="flex items-start gap-2 mb-2">
                            <div className="mt-[5px] w-1.5 h-1.5 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 shrink-0" />
                            <p className="text-[10.5px] leading-[1.55] text-slate-700 font-medium">{comp}</p>
                          </div>
                        ))}
                        {/* Completed competencies */}
                        {competenciesAdded.map((comp, i) => (
                          <div key={`completed-comp-${i}`} className="flex items-start gap-2 mb-2">
                            <div className="mt-[5px] w-1.5 h-1.5 rounded-full bg-gradient-to-br from-violet-400 to-purple-400 shrink-0" />
                            <p className="text-[10.5px] leading-[1.55] text-slate-700 font-medium">{comp}</p>
                          </div>
                        ))}
                      </ResumeSection>
                    )}

                    {/* AI Skills - Merge existing with completed AI skills */}
                    {((sections.aiSkills && sections.aiSkills.length > 0) || aiSkillsAdded.length > 0) && (
                      <ResumeSection icon={Sparkles} title="AI Skills" gradient="from-emerald-500 to-teal-500">
                        <div className="flex flex-wrap">
                          {/* Existing AI skills */}
                          {sections.aiSkills && sections.aiSkills.map((skill, i) => (
                            <SkillBadge key={i} text={skill} tint="cyan" />
                          ))}
                          {/* Completed AI skills */}
                          {aiSkillsAdded.map((skill, i) => (
                            <SkillBadge key={`completed-ai-${i}`} text={skill} tint="cyan" />
                          ))}
                        </div>
                      </ResumeSection>
                    )}
                  </div>

                  {/* ----- Right Main Content ----- */}
                  <ResumeMainContent
                    dbData={resumeData?.dbData}
                    sections={sections}
                    fullText={fullText}
                  />
                </div>
              </div>

              {/* AI Enhancement Notice */}
              <div className="flex flex-col items-center gap-2 mt-5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <p className="text-[11px] font-medium text-slate-400">
                    AI-enhanced resume &bull; Verified data only &bull; No fabricated content
                  </p>
                </div>
                {(skillsAdded.length > 0 || competenciesAdded.length > 0 || certificationsAdded.length > 0 || aiSkillsAdded.length > 0) && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {skillsAdded.length > 0 && (
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200/60">
                        +{skillsAdded.length} skills
                      </span>
                    )}
                    {aiSkillsAdded.length > 0 && (
                      <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200/60">
                        +{aiSkillsAdded.length} AI skills
                      </span>
                    )}
                    {competenciesAdded.length > 0 && (
                      <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-200/60">
                        +{competenciesAdded.length} competencies
                      </span>
                    )}
                    {certificationsAdded.length > 0 && (
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60">
                        +{certificationsAdded.length} certifications
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
