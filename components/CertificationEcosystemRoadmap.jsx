"use client";

import React from "react";
import { Card } from "./ui/card.jsx";
import { Badge } from "./ui/badge.jsx";
import { 
  Award, 
  ArrowRight, 
  Sparkles, 
  TrendingUp,
  Shield,
  Star,
  Zap,
  Crown,
  Target
} from "lucide-react";

const CERT_LEVEL_STYLES = {
  foundation: {
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
    bg: "bg-gradient-to-br from-emerald-50/90 via-teal-50/70 to-cyan-50/50",
    border: "border-emerald-200/60",
    text: "text-emerald-700",
    shadow: "shadow-[0_8px_24px_rgba(16,185,129,0.15)]",
    icon: Shield,
    iconColor: "text-emerald-600",
    ring: "ring-emerald-200/50",
    glow: "from-emerald-400/20 to-teal-400/10"
  },
  associate: {
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
    bg: "bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-violet-50/50",
    border: "border-blue-200/60",
    text: "text-blue-700",
    shadow: "shadow-[0_8px_24px_rgba(59,130,246,0.15)]",
    icon: Star,
    iconColor: "text-blue-600",
    ring: "ring-blue-200/50",
    glow: "from-blue-400/20 to-indigo-400/10"
  },
  professional: {
    gradient: "from-purple-500 via-fuchsia-500 to-pink-500",
    bg: "bg-gradient-to-br from-purple-50/90 via-fuchsia-50/70 to-pink-50/50",
    border: "border-purple-200/60",
    text: "text-purple-700",
    shadow: "shadow-[0_8px_24px_rgba(168,85,247,0.15)]",
    icon: Award,
    iconColor: "text-purple-600",
    ring: "ring-purple-200/50",
    glow: "from-purple-400/20 to-fuchsia-400/10"
  },
  specialty: {
    gradient: "from-amber-500 via-orange-500 to-rose-500",
    bg: "bg-gradient-to-br from-amber-50/90 via-orange-50/70 to-rose-50/50",
    border: "border-amber-200/60",
    text: "text-amber-700",
    shadow: "shadow-[0_8px_24px_rgba(245,158,11,0.15)]",
    icon: Zap,
    iconColor: "text-amber-600",
    ring: "ring-amber-200/50",
    glow: "from-amber-400/20 to-orange-400/10"
  },
  expert: {
    gradient: "from-rose-500 via-red-500 to-pink-600",
    bg: "bg-gradient-to-br from-rose-50/90 via-red-50/70 to-pink-50/50",
    border: "border-rose-200/60",
    text: "text-rose-700",
    shadow: "shadow-[0_8px_24px_rgba(244,63,94,0.15)]",
    icon: Crown,
    iconColor: "text-rose-600",
    ring: "ring-rose-200/50",
    glow: "from-rose-400/20 to-pink-400/10"
  },
  advanced: {
    gradient: "from-violet-500 via-purple-600 to-indigo-600",
    bg: "bg-gradient-to-br from-violet-50/90 via-purple-50/70 to-indigo-50/50",
    border: "border-violet-200/60",
    text: "text-violet-700",
    shadow: "shadow-[0_8px_24px_rgba(139,92,246,0.15)]",
    icon: Target,
    iconColor: "text-violet-600",
    ring: "ring-violet-200/50",
    glow: "from-violet-400/20 to-purple-400/10"
  },
  default: {
    gradient: "from-slate-500 via-gray-500 to-zinc-500",
    bg: "bg-gradient-to-br from-slate-50/90 via-gray-50/70 to-zinc-50/50",
    border: "border-slate-200/60",
    text: "text-slate-700",
    shadow: "shadow-[0_8px_24px_rgba(100,116,139,0.15)]",
    icon: Award,
    iconColor: "text-slate-600",
    ring: "ring-slate-200/50",
    glow: "from-slate-400/20 to-gray-400/10"
  }
};

function parseCertificationRoadmap(flowDiagram) {
  if (!flowDiagram || typeof flowDiagram !== 'string') return [];
  
  const lines = flowDiagram.split('\n').filter(line => line.trim());
  const certifications = [];
  
  lines.forEach(line => {
    const trimmed = line.trim();
    
    if (trimmed.includes('→') || trimmed.includes('->') || trimmed.includes('↓')) {
      const parts = trimmed.split(/→|->|↓/).map(p => p.trim());
      parts.forEach(part => {
        const cleaned = part
          .replace(/[\[\](){}]/g, '')
          .replace(/^[•\-\*\+]\s*/, '')
          .trim();
        
        if (cleaned && cleaned.length > 3 && !cleaned.match(/^(or|and|then)$/i)) {
          certifications.push(cleaned);
        }
      });
    } else if (trimmed.match(/^[•\-\*\+\d\.]/)) {
      const cleaned = trimmed
        .replace(/^[•\-\*\+\d\.]+\s*/, '')
        .replace(/[\[\](){}]/g, '')
        .trim();
      
      if (cleaned && cleaned.length > 3 && !cleaned.match(/^(or|and|then)$/i)) {
        certifications.push(cleaned);
      }
    }
  });
  
  return [...new Set(certifications)];
}

function detectCertLevel(certName) {
  const lower = certName.toLowerCase();
  
  if (lower.includes('foundation') || lower.includes('fundamentals') || lower.includes('essentials') || lower.includes('cloud practitioner')) {
    return 'foundation';
  }
  if (lower.includes('associate')) {
    return 'associate';
  }
  if (lower.includes('professional')) {
    return 'professional';
  }
  if (lower.includes('specialty') || lower.includes('specialist')) {
    return 'specialty';
  }
  if (lower.includes('expert') || lower.includes('master') || lower.includes('architect')) {
    return 'expert';
  }
  if (lower.includes('advanced')) {
    return 'advanced';
  }
  
  return 'default';
}

export default function CertificationEcosystemRoadmap({ flowDiagram }) {
  if (!flowDiagram) return null;
  
  const certifications = parseCertificationRoadmap(flowDiagram);
  
  // Check if the flow diagram contains ASCII box-drawing characters
  const hasBoxDrawing = /[┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║▼▲►◄]/.test(flowDiagram);
  
  // If it has box-drawing characters OR parsed less than 3 items, show raw ASCII
  if (hasBoxDrawing || certifications.length < 3) {
    return (
      <div className="relative rounded-2xl border border-slate-200/60 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/40 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <h3 
              className="text-[15px] font-semibold tracking-[-0.02em] text-slate-800"
              style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', system-ui", fontWeight: 600 }}
            >
              Certification Preparation Path
            </h3>
          </div>
          <div className="rounded-xl bg-slate-900/95 border border-slate-700/50 p-4 shadow-inner backdrop-blur-sm overflow-x-auto">
            <pre 
              className="whitespace-pre font-mono text-[11px] leading-[1.6] text-emerald-400 selection:bg-emerald-500/30 selection:text-white"
              style={{ 
                fontFamily: "'Courier New', 'Consolas', monospace",
                textShadow: "0 0 1px rgba(16, 185, 129, 0.5)"
              }}
            >
{flowDiagram}
            </pre>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative rounded-2xl border border-slate-200/60 bg-gradient-to-br from-white via-slate-50/30 to-indigo-50/20 p-6 overflow-hidden backdrop-blur-sm">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br from-indigo-100/30 to-purple-100/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-tr from-teal-100/30 to-emerald-100/20 rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg ring-2 ring-teal-200/50">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 
                className="text-[16px] font-semibold tracking-[-0.025em] text-slate-900 leading-tight"
                style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', system-ui", fontWeight: 600 }}
              >
                Certification Ecosystem Roadmap
              </h3>
              <p 
                className="text-[11px] font-medium text-slate-500 tracking-tight mt-0.5"
                style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui", fontWeight: 500 }}
              >
                Your progressive learning pathway
              </p>
            </div>
          </div>
          <Badge className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 text-[10px] font-bold tracking-wide shadow-lg">
            <TrendingUp className="w-3 h-3 mr-1" />
            {certifications.length} Certifications
          </Badge>
        </div>
        
        {/* Certification pathway */}
        <div className="space-y-4">
          {certifications.map((cert, index) => {
            const level = detectCertLevel(cert);
            const style = CERT_LEVEL_STYLES[level];
            const Icon = style.icon;
            const isLast = index === certifications.length - 1;
            
            return (
              <div key={index} className="relative">
                {/* Certification card */}
                <Card 
                  className={`
                    relative overflow-hidden border-2 ${style.border} ${style.bg} ${style.shadow}
                    backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1
                    group cursor-pointer ring-2 ${style.ring}
                  `}
                >
                  {/* Top gradient accent */}
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${style.gradient}`} />
                  
                  {/* Ambient glow */}
                  <div className={`absolute -top-20 -right-20 w-48 h-48 bg-gradient-to-br ${style.glow} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
                  
                  {/* Glossy overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-white/10 to-transparent pointer-events-none" />
                  
                  <div className="relative z-10 p-5">
                    <div className="flex items-start gap-4">
                      {/* Icon badge */}
                      <div className={`
                        shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${style.gradient} 
                        flex items-center justify-center shadow-xl ring-4 ring-white/50
                        group-hover:scale-110 transition-transform duration-300
                      `}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h4 
                            className={`text-[14px] font-semibold ${style.text} tracking-tight leading-snug`}
                            style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui", fontWeight: 600 }}
                          >
                            {cert}
                          </h4>
                          <Badge 
                            className={`
                              shrink-0 px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase
                              bg-gradient-to-r ${style.gradient} text-white border-0 shadow-md
                            `}
                          >
                            {level.replace('_', ' ')}
                          </Badge>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden backdrop-blur-sm border border-white/40">
                            <div 
                              className={`h-full bg-gradient-to-r ${style.gradient} rounded-full transition-all duration-1000 shadow-sm`}
                              style={{ width: '0%' }}
                            />
                          </div>
                          <span 
                            className={`text-[10px] font-bold ${style.text} tracking-tight`}
                            style={{ fontFamily: "var(--font-space-mono), 'Space Mono', monospace", fontWeight: 700 }}
                          >
                            Step {index + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                
                {/* Connector arrow */}
                {!isLast && (
                  <div className="flex justify-center py-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-md">
                      <ArrowRight className="w-4 h-4 text-slate-500 rotate-90" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Footer note */}
        <div className="mt-6 pt-5 border-t border-slate-200/60">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-indigo-600" />
            </div>
            <span style={{ fontFamily: "var(--font-dm-sans), 'DM Sans', system-ui", fontWeight: 500 }}>
              Follow this pathway to build comprehensive expertise in your domain
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
