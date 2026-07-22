"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ─── Utility helpers ──────────────────────────────────────────────────────────

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function toStr(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  return "";
}

/**
 * Convert a raw date value to a human-readable month-year string.
 * Handles ISO strings ("2023-01-15"), year-only ("2023"), and plain text.
 * Returns the original string if parsing fails.
 */
function formatDate(raw) {
  const s = toStr(raw);
  if (!s) return "";

  // Already clean text like "January 2023" or "March 2020" — return as-is
  if (/^[A-Za-z]/.test(s)) return s;

  // ISO / partial ISO: "2023-01-15", "2023-01", "2023"
  const isoMatch = s.match(/^(\d{4})(?:-(\d{2}))?/);
  if (isoMatch) {
    const year  = parseInt(isoMatch[1], 10);
    const month = isoMatch[2] ? parseInt(isoMatch[2], 10) - 1 : null;

    if (month !== null) {
      try {
        return new Date(year, month, 1).toLocaleDateString("en-GB", {
          month: "long",
          year:  "numeric",
        });
      } catch {
        return s;
      }
    }
    return String(year);
  }

  return s;
}

const AMBIGUOUS_DATES_CAPTION = "To and from date not properly detected from uploaded resume";

/**
 * Build a professional employment date string from a work-experience entry.
 * Priority: pre-formatted `dates` field → structured start/end fields.
 *
 * Returns AMBIGUOUS_DATES_CAPTION when the dates string contains multiple
 * ranges (semicolons or more than one em-dash separator), indicating the
 * source data could not be cleanly parsed from the uploaded resume.
 */
function buildEmploymentDates(entry) {
  const preFormatted = toStr(entry?.dates);

  if (preFormatted) {
    // Multiple ranges: contains a semicolon or more than one – / - separator
    const hasSemicolon   = preFormatted.includes(";");
    const dashCount      = (preFormatted.match(/[–—-]/g) ?? []).length;
    if (hasSemicolon || dashCount > 1) {
      return AMBIGUOUS_DATES_CAPTION;
    }
    return preFormatted;
  }

  const start     = formatDate(entry?.start_date);
  const isCurrent = entry?.is_current === true;
  const end       = isCurrent ? "Present" : formatDate(entry?.end_date);

  if (start && end) return `${start} – ${end}`;
  if (start)        return start;
  return "";
}

/** True when the dates value is the ambiguous-data caption. */
function isAmbiguousDates(datesValue) {
  return datesValue === AMBIGUOUS_DATES_CAPTION;
}

// ─── Shared section heading ───────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <div className="mb-4">
      <h2 className="text-[13px] font-bold tracking-tight text-slate-900 uppercase">{children}</h2>
      <Separator className="mt-1.5" />
    </div>
  );
}

// ─── Professional Summary ─────────────────────────────────────────────────────

function SummarySection({ summary }) {
  const text = toStr(summary);
  if (!text) return null;

  return (
    <Card className="rounded-xl border-0 shadow-none bg-white">
      <CardContent className="p-4">
        <SectionHeading>Professional Summary</SectionHeading>
        <p className="text-[10.5px] leading-[1.6] text-slate-700">{text}</p>
      </CardContent>
    </Card>
  );
}

// ─── Single experience entry ──────────────────────────────────────────────────

function ExperienceEntry({ entry }) {
  const company         = toStr(entry?.company);
  const rawJobTitle     = toStr(entry?.job_title);
  const employmentDates = buildEmploymentDates(entry);
  const ambiguous       = isAmbiguousDates(employmentDates);
  const responsibilities = Array.isArray(entry?.responsibilities)
    ? entry.responsibilities.filter((r) => toStr(r))
    : [];

  // Capitalize job title
  const displayJobTitle = rawJobTitle
    ? rawJobTitle.charAt(0).toUpperCase() + rawJobTitle.slice(1)
    : null;

  return (
    <div className="space-y-1.5">
      {/* Company — most prominent */}
      {company && (
        <p className="text-[13px] font-semibold text-slate-900 leading-snug">
          {company}
        </p>
      )}

      {/* Job Title — or missing-data placeholder */}
      {displayJobTitle ? (
        <p className="text-[11px] font-medium text-slate-800">{displayJobTitle}</p>
      ) : (
        <p className="text-[11px] font-medium italic text-amber-700">[Please fill job title]</p>
      )}

      {/* Employment Dates */}
      {employmentDates && (
        <p className={`text-[9.5px] font-normal ${ambiguous ? "italic text-amber-700" : "text-slate-500"}`}>
          {employmentDates}
        </p>
      )}

      {/* Responsibilities */}
      {responsibilities.length > 0 && (
        <ul className="mt-2 space-y-1 pl-0.5">
          {responsibilities.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-[7px] w-1 h-1 rounded-full bg-slate-400 shrink-0" />
              <p className="text-[10.5px] leading-[1.55] text-slate-700">{r}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Work Experience section ──────────────────────────────────────────────────

function ExperienceSection({ workExperience }) {
  const entries = workExperience?.entries;
  if (!hasItems(entries)) return null;

  return (
    <Card className="rounded-xl border-0 shadow-none bg-white">
      <CardContent className="p-4">
        <SectionHeading>Experience</SectionHeading>
        <div className="space-y-5">
          {entries.map((entry, idx) => (
            <ExperienceEntry key={idx} entry={entry} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Single education entry ───────────────────────────────────────────────────

function EducationEntry({ entry }) {
  if (typeof entry === "string") {
    const text = entry.trim();
    if (!text) return null;
    return (
      <div className="flex items-start gap-2">
        <span className="mt-[6px] w-1 h-1 rounded-full bg-slate-400 shrink-0" />
        <p className="text-[10.5px] leading-[1.4] text-slate-700">{text}</p>
      </div>
    );
  }

  const institution  = toStr(entry?.institution);
  const degree       = toStr(entry?.degree);
  const fieldOfStudy = toStr(entry?.field_of_study);
  const degreeLabel  = [degree, fieldOfStudy].filter(Boolean).join(", ");
  const dateRange    = buildEmploymentDates(entry);

  if (!institution && !degreeLabel) return null;

  return (
    <div className="space-y-0">
      {institution && (
        <p className="text-[11px] font-semibold text-slate-900 leading-tight">{institution}</p>
      )}
      {degreeLabel && (
        <p className="text-[10.5px] font-medium text-slate-700 leading-tight">{degreeLabel}</p>
      )}
      {dateRange && (
        <p className="text-[9.5px] font-normal text-slate-500 leading-tight">{dateRange}</p>
      )}
    </div>
  );
}

// ─── Education section ────────────────────────────────────────────────────────

function EducationSection({ education }) {
  const entries = education?.entries;
  if (!hasItems(entries)) return null;

  return (
    <Card className="rounded-xl border-0 shadow-none bg-white">
      <CardContent className="p-4">
        <SectionHeading>Education</SectionHeading>
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <EducationEntry key={idx} entry={entry} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Projects section ─────────────────────────────────────────────────────────

function ProjectsSection({ projects }) {
  if (!hasItems(projects)) return null;

  return (
    <Card className="rounded-xl border-0 shadow-none bg-white">
      <CardContent className="p-4">
        <SectionHeading>Projects</SectionHeading>
        <ul className="space-y-1.5">
          {projects.map((item, idx) => {
            const text = typeof item === "string" ? item.trim() : toStr(item);
            if (!text) return null;
            return (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                <p className="text-[10.5px] leading-[1.55] text-slate-700">{text}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Achievements section ─────────────────────────────────────────────────────

function AchievementsSection({ achievements }) {
  if (!hasItems(achievements)) return null;

  return (
    <Card className="rounded-xl border-0 shadow-none bg-white">
      <CardContent className="p-4">
        <SectionHeading>Achievements</SectionHeading>
        <ul className="space-y-1.5">
          {achievements.map((item, idx) => {
            const text = typeof item === "string" ? item.trim() : toStr(item);
            if (!text) return null;
            return (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-[7px] w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                <p className="text-[10.5px] leading-[1.55] text-slate-700">{text}</p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * ResumeMainContent — presentation layer only.
 *
 * Props
 *   dbData   — resumeData.dbData:
 *                { profile_summary, work_experience, education, parsed_output }
 *   sections — resumeData.sections (passed through, not used here)
 *   fullText — resumeData.fullText (passed through, not used here)
 *
 * Data sources:
 *   profile_summary → dbData.profile_summary
 *   work experience → dbData.work_experience.entries  (JSONB)
 *   education       → dbData.education.entries        (JSONB)
 *   projects        → dbData.parsed_output.projects
 *   achievements    → dbData.parsed_output.achievements
 */
export function ResumeMainContent({ dbData }) {
  const parsedOutput = dbData?.parsed_output ?? {};
  const projects     = parsedOutput.projects     ?? [];
  const achievements = parsedOutput.achievements ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-2">
      <SummarySection      summary={dbData?.profile_summary} />
      <ExperienceSection   workExperience={dbData?.work_experience} />
      <EducationSection    education={dbData?.education} />
      <ProjectsSection     projects={projects} />
      <AchievementsSection achievements={achievements} />
    </div>
  );
}
