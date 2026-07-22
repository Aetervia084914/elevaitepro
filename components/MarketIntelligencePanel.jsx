"use client";

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Globe, ShieldAlert, 
  Building2, Briefcase, Zap, Sparkles, Loader2, 
  MapPin, Info, X, AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
// import { getMarketIntelligence } from '../lib/gemini.service';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { motion } from 'framer-motion';

export default function MarketIntelligencePanel({ role: initialRole = "Software Engineer", onClose, marketIntelligence }) {
  const [loading, setLoading] = useState(true);
  const [role] = useState(initialRole);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const ensureArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      return value
        .split(/\s*(?:\n|\r|\u2022|;|\|)\s*/)
        .flatMap((s) => s.split(/,\s+/))
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  };

  useEffect(() => {
    // Use provided marketIntelligence prop from OpenAI response if available
    if (marketIntelligence) {
      // Normalize to prevent runtime errors when backend sends strings instead of arrays.
      setData({
        ...marketIntelligence,
        hiringSignals: ensureArray(marketIntelligence.hiringSignals),
        industryMomentum: ensureArray(marketIntelligence.industryMomentum),
        topCompanies: ensureArray(marketIntelligence.topCompanies),
        topCities: ensureArray(marketIntelligence.topCities),
        topRemoteHiringRegions: ensureArray(marketIntelligence.topRemoteHiringRegions),
        globalOpportunities: ensureArray(marketIntelligence.globalOpportunities),
      });
      setLoading(false);
      return;
    }
    // Fallback to mock data only if no prop provided
    async function fetchMockMarketIntelligence() {
      try {
        const { mockAnalysisData } = await import("../lib/testdata.js");
        const mi = mockAnalysisData.marketIntelligence;
        setData({
          ...mi,
          hiringSignals: ensureArray(mi.hiringSignals),
          industryMomentum: ensureArray(mi.industryMomentum),
          topCompanies: ensureArray(mi.topCompanies),
          topCities: ensureArray(mi.topCities),
          topRemoteHiringRegions: ensureArray(mi.topRemoteHiringRegions),
          globalOpportunities: ensureArray(mi.globalOpportunities),
        });
      } catch (err) {
        setError("Failed to load market intelligence data.");
      } finally {
        setLoading(false);
      }
    }
    fetchMockMarketIntelligence();
  }, [marketIntelligence]);

  // Theme tokens for accent colors — single source of truth so cards stay visually consistent.
  const ACCENTS = {
    indigo:  { dot: "bg-indigo-500",  text: "text-indigo-600",  ring: "ring-indigo-100",  bar: "bg-gradient-to-r from-indigo-500 to-blue-500",       soft: "bg-indigo-50",   border: "border-indigo-100",   chipBg: "bg-indigo-50/70", chipText: "text-indigo-700" },
    emerald: { dot: "bg-emerald-500", text: "text-emerald-600", ring: "ring-emerald-100", bar: "bg-gradient-to-r from-emerald-500 to-teal-500",      soft: "bg-emerald-50",  border: "border-emerald-100",  chipBg: "bg-emerald-50/70", chipText: "text-emerald-700" },
    amber:   { dot: "bg-amber-500",   text: "text-amber-600",   ring: "ring-amber-100",   bar: "bg-gradient-to-r from-amber-500 to-orange-500",      soft: "bg-amber-50",    border: "border-amber-100",    chipBg: "bg-amber-50/70", chipText: "text-amber-700" },
    violet:  { dot: "bg-violet-500",  text: "text-violet-600",  ring: "ring-violet-100",  bar: "bg-gradient-to-r from-violet-500 to-fuchsia-500",    soft: "bg-violet-50",   border: "border-violet-100",   chipBg: "bg-violet-50/70", chipText: "text-violet-700" },
    rose:    { dot: "bg-rose-500",    text: "text-rose-600",    ring: "ring-rose-100",    bar: "bg-gradient-to-r from-rose-500 to-pink-500",         soft: "bg-rose-50",     border: "border-rose-100",     chipBg: "bg-rose-50/70", chipText: "text-rose-700" },
    slate:   { dot: "bg-slate-500",   text: "text-slate-600",   ring: "ring-slate-100",   bar: "bg-gradient-to-r from-slate-500 to-slate-600",       soft: "bg-slate-50",    border: "border-slate-100",    chipBg: "bg-slate-50",    chipText: "text-slate-700" },
  };

  return (
    <div
      className="flex flex-col h-full w-full overflow-y-auto bg-gradient-to-b from-slate-50/80 via-white to-white selection:bg-indigo-500 selection:text-white antialiased"
      style={{ fontFamily: "var(--font-dmsans), 'DM Sans', ui-sans-serif, system-ui, sans-serif" }}
    >
      {/* Ambient background glows — soft, not distracting */}
      <div className="fixed top-[-10%] left-[-10%] w-[55%] h-[55%] bg-indigo-500/5 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-violet-500/5 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="fixed top-[30%] right-[-5%] w-[30%] h-[30%] bg-emerald-500/4 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* ─────────── HEADER ─────────── */}
      <header className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(99,102,241,0.55)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
              <Sparkles className="text-white w-5 h-5 relative z-10" strokeWidth={2.25} />
            </div>
            <div className="flex flex-col">
              <h1
                className="text-[22px] leading-none font-semibold tracking-[-0.025em] text-slate-900"
                style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', ui-sans-serif, system-ui, sans-serif", fontWeight: 600 }}
              >
                Market Intelligence
              </h1>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
                <p
                  className="text-[10px] font-medium text-slate-500 uppercase tracking-[0.18em]"
                  style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
                >
                  Live Labour Signals · {role}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {loading && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span
                  className="text-[10px] font-semibold text-indigo-700 uppercase tracking-[0.18em]"
                  style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
                >
                  Synthesising
                </span>
              </div>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                aria-label="Close panel"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─────────── BODY ─────────── */}
      <main className="flex-1 px-5 lg:px-8 py-8 max-w-7xl mx-auto w-full space-y-7 relative z-10">
        {error && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
            <p
              className="text-lg font-semibold text-slate-900 max-w-md tracking-tight"
              style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif" }}
            >
              {error}
            </p>
          </div>
        )}

        {!data && loading && !error && (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
            <div className="relative">
              <div className="w-14 h-14 rounded-full border-[3px] border-slate-100 border-t-indigo-500 animate-spin" />
              <Zap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-500 w-5 h-5 animate-pulse" />
            </div>
            <div className="text-center">
              <p
                className="text-lg font-semibold text-slate-900 tracking-tight"
                style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif" }}
              >
                Scanning the labour market
              </p>
              <p
                className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.3em] mt-2"
                style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
              >
                Retrieving live signals
              </p>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* ─────────── EXECUTIVE INSIGHT ─────────── */}
            <section className="relative">
              <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_24px_60px_-30px_rgba(15,23,42,0.20)]">
                {/* Top accent rail */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
                {/* Subtle radial gloss */}
                <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-gradient-to-br from-indigo-100/40 to-violet-100/20 blur-3xl pointer-events-none" />

                <div className="relative p-7 lg:p-9 flex flex-col md:flex-row items-start gap-6">
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center shadow-sm">
                    <Info className="w-5 h-5 text-indigo-600" strokeWidth={2.25} />
                  </div>

                  <div className="space-y-4 max-w-4xl flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-px w-6 bg-indigo-300" />
                      <span
                        className="text-[10px] font-semibold text-indigo-600 uppercase tracking-[0.28em]"
                        style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
                      >
                        Executive Insight
                      </span>
                    </div>

                    <p
                      className="text-[22px] md:text-[26px] leading-[1.25] font-semibold text-slate-900 tracking-[-0.02em]"
                      style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 600 }}
                    >
                      {data.marketInsight}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {data.demandGrowth && (
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-[11px] font-semibold tracking-tight rounded-full shadow-none hover:bg-emerald-100">
                          <TrendingUp className="w-3 h-3 mr-1.5" />
                          {data.demandGrowth} growth
                        </Badge>
                      )}
                      {data.remoteDemand && (
                        <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 text-[11px] font-semibold tracking-tight rounded-full shadow-none hover:bg-indigo-100">
                          <Globe className="w-3 h-3 mr-1.5" />
                          {data.remoteDemand} remote
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ─────────── KEY METRICS ─────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard label="Median Salary"     value={data.medianSalary}    subValue={data.salaryRange}        icon={DollarSign}  accent={ACCENTS.emerald} />
              <MetricCard label="Contract Rate"     value={data.contractRates}                                       icon={Briefcase}   accent={ACCENTS.indigo}  />
              <MetricCard label="Demand Drivers"    value={data.demandDrivers}                                       icon={Zap}         accent={ACCENTS.amber}   />
              <MetricCard label="Automation Risk"   value={data.automationRisk}  subValue={data.automationInsight}  icon={ShieldAlert} accent={ACCENTS.violet}  />
            </div>

            {/* ─────────── DETAIL GRID ─────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pb-12">

              {/* Card 1 — Hiring Signals + Industry Momentum */}
              <Panel accent={ACCENTS.amber}>
                <SectionHeader icon={Zap} title="Hiring Signals" accent={ACCENTS.amber} />
                <div className="space-y-2.5 mt-4">
                  {(data.hiringSignals || []).map((signal, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100/80">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      <p className="text-[12.5px] leading-[1.55] font-medium text-slate-700 tracking-tight">{signal}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <SectionHeader icon={TrendingUp} title="Industry Momentum" accent={ACCENTS.rose} />
                <div className="flex flex-col gap-1.5 mt-4">
                  {(data.industryMomentum || []).map((item, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-1">
                      <span className="mt-[7px] h-1 w-1 rounded-full bg-rose-500 shrink-0" />
                      <span className="text-[12.5px] leading-[1.55] font-medium text-slate-700 tracking-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Card 2 — Top Companies + Top Cities */}
              <Panel accent={ACCENTS.indigo}>
                <SectionHeader icon={Building2} title="Top Hiring Companies" accent={ACCENTS.indigo} />
                <div className="flex flex-wrap gap-1.5 mt-4">
                  {(data.topCompanies || []).map((company, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="bg-indigo-50/70 border border-indigo-200/80 text-indigo-700 px-2.5 py-1 text-[11px] font-semibold tracking-tight rounded-lg shadow-none hover:bg-indigo-100 transition-colors cursor-default"
                    >
                      {company}
                    </Badge>
                  ))}
                </div>

                <Separator />

                <SectionHeader icon={MapPin} title="Talent Hubs" accent={ACCENTS.emerald} />
                <div className="grid grid-cols-2 gap-1.5 mt-4">
                  {(data.topCities || []).map((city, i) => (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" strokeWidth={2.25} />
                      <span className="text-[11.5px] font-semibold text-slate-700 tracking-tight truncate">{city}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Card 3 — Future Outlook + Global Opportunities */}
              <Panel accent={ACCENTS.violet}>
                <SectionHeader icon={Sparkles} title="Future Outlook" accent={ACCENTS.violet} />
                <div className="relative overflow-hidden rounded-2xl mt-4 p-5 bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 text-white shadow-[0_18px_40px_-18px_rgba(99,102,241,0.55)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                  <div className="absolute -top-12 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <p
                    className="relative text-[13.5px] leading-[1.55] font-medium tracking-tight"
                    style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif", fontWeight: 500 }}
                  >
                    {data.futureOutlook}
                  </p>
                </div>

                <Separator />

                <SectionHeader icon={Globe} title="Global Opportunities" accent={ACCENTS.indigo} />
                <div className="space-y-2 mt-4">
                  {(data.globalOpportunities || []).slice(0, 4).map((opp, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <p className="text-[12px] leading-[1.5] font-medium text-slate-700 tracking-tight">{opp}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ─────────── SUB-COMPONENTS ─────────── */

function Panel({ accent, children }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.18)] hover:shadow-[0_20px_50px_-22px_rgba(15,23,42,0.22)] transition-shadow duration-300">
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", accent.bar)} />
      <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-slate-50/30 pointer-events-none" />
      <div className="relative p-5 lg:p-6">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, subValue, icon: Icon, accent }) {
  const display = value || "—";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_8px_24px_-16px_rgba(15,23,42,0.16)] hover:shadow-[0_16px_36px_-18px_rgba(15,23,42,0.20)] hover:-translate-y-[1px] transition-all duration-300 group">
      <div className={cn("absolute top-0 left-0 right-0 h-[2px]", accent.bar)} />
      <div className="absolute -top-14 -right-14 w-32 h-32 rounded-full bg-slate-50/80 blur-2xl pointer-events-none" />

      <div className="relative p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", accent.soft, accent.border, "border")}>
            <Icon className={cn("w-4 h-4", accent.text)} strokeWidth={2.25} />
          </div>
          <span className={cn("h-1.5 w-1.5 rounded-full", accent.dot, "shadow-sm")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <p
            className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.16em]"
            style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
          >
            {label}
          </p>
          <p
            className="text-[22px] leading-[1.15] font-semibold text-slate-900 tracking-[-0.02em]"
            style={{
              fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', sans-serif",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {display}
          </p>
          {subValue && (
            <p className="text-[11.5px] font-medium text-slate-500 leading-[1.45] line-clamp-2 tracking-tight">
              {subValue}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, accent }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center border", accent.soft, accent.border)}>
        <Icon className={cn("w-3.5 h-3.5", accent.text)} strokeWidth={2.25} />
      </div>
      <h4
        className="text-[11px] font-bold text-slate-700 uppercase tracking-[0.16em]"
        style={{ fontFamily: "var(--font-space-mono), ui-monospace, monospace" }}
      >
        {title}
      </h4>
      <span className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
    </div>
  );
}

function Separator() {
  return <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />;
}
