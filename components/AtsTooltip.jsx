"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

function Section({ title, children }) {
  return (
    <div className="space-y-1">
      {title && <h4 className="text-[12px] font-bold text-slate-800 tracking-tight">{title}</h4>}
      <div className="text-[11px] leading-[1.6] text-slate-600">{children}</div>
    </div>
  );
}

function BulletList({ items }) {
  return (
    <ul className="space-y-0.5 pl-3 text-[11px] leading-[1.6] text-slate-600">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-1.5">
          <span className="text-indigo-400 mt-[3px] shrink-0">•</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function TooltipContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100">
        <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
        </span>
        <h3 className="text-[13px] font-extrabold tracking-tight text-slate-900">
          What is ATS?
        </h3>
      </div>

      <Section>
        <strong>ATS</strong> stands for <strong>Applicant Tracking System</strong>.
        It is software used by companies and HR teams to manage job applications
        and screen resumes automatically.
        <br /><br />
        When you apply for a job online, your resume is often first reviewed by
        an ATS before it reaches a human recruiter.
      </Section>

      <Section title="Why Companies Use ATS">
        Companies receive hundreds or thousands of applications for a single
        position. ATS helps them:
      </Section>
      <BulletList
        items={[
          "Organize resumes efficiently",
          "Search for relevant skills",
          "Filter candidates based on job requirements",
          "Save time for recruiters",
        ]}
      />

      <Section title="Why ATS Matters for Your Resume">
        If your resume is not optimized for ATS, it may be filtered out before
        a recruiter ever sees it. ATS systems look for:
      </Section>
      <BulletList
        items={[
          "Relevant skills and keywords",
          "Matching job titles",
          "Keywords from the job description",
          "Clear, parseable formatting",
        ]}
      />

      <div className="rounded-lg bg-indigo-50/60 border border-indigo-100 p-2.5 text-[11px] leading-[1.6] text-slate-600">
        <span className="font-bold text-indigo-600">Your ATS Match Score</span>{" "}
        shows how well your resume can pass these automated screenings.
        Think of ATS as a smart filter — it quickly scans thousands
        of resumes and selects the ones that match the job requirements best.
      </div>
    </div>
  );
}

export default function AtsTooltip() {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;
    // Keep within viewport
    if (left < 8) left = 8;
    if (left + tooltipWidth > window.innerWidth - 8) left = window.innerWidth - tooltipWidth - 8;
    setPos({
      top: rect.bottom + 8,
      left,
    });
  }, []);

  const handleEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    updatePosition();
    setOpen(true);
  }, [updatePosition]);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  }, []);

  const handleTooltipEnter = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setOpen(false), 120);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      updatePosition();
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
  }, [updatePosition]);

  // Close on outside scroll / resize (but not scroll inside tooltip)
  useEffect(() => {
    if (!open) return;
    const handleScroll = (e) => {
      if (tooltipRef.current && tooltipRef.current.contains(e.target)) return;
      setOpen(false);
    };
    const handleResize = () => setOpen(false);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Learn about ATS (Applicant Tracking System)"
        aria-expanded={open}
        aria-haspopup="dialog"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onFocus={handleEnter}
        onBlur={handleLeave}
        onKeyDown={handleKeyDown}
        onClick={(e) => { e.stopPropagation(); handleEnter(); }}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-1 transition-colors cursor-help relative z-20"
      >
        <Info className="w-3.5 h-3.5" />
      </button>

      {mounted && open && createPortal(
        <div
          ref={tooltipRef}
          role="tooltip"
          aria-label="ATS explanation"
          onMouseEnter={handleTooltipEnter}
          onMouseLeave={handleTooltipLeave}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
          }}
          className="w-[320px] max-h-[420px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-[0_16px_48px_rgba(0,0,0,0.12)] animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200"
        >
          <TooltipContent />
        </div>,
        document.body
      )}
    </>
  );
}
