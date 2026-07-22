"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="relative w-full bg-zinc-950 pt-16 pb-12 overflow-hidden">
      {/* Decorative accent for the top of footer */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      
      <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
        {/* Logo/Brand in Footer */}
        <div className="flex items-center gap-2 mb-6 opacity-80 hover:opacity-100 transition-opacity">
          <div className="p-1.5 bg-[#3B6FF5]/20 rounded-lg border border-[#3B6FF5]/30">
            <Sparkles className="h-4 w-4 text-[#3B6FF5]" />
          </div>
          <span className="text-xl font-black text-white tracking-tighter italic">
            elev<span className="text-[#3B6FF5]">AIte</span> pro
          </span>
        </div>

        {/* The requested copyright line */}
        <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[0.2em] text-center mb-4">
          © 2025 <span className="text-zinc-300">elevAIte pro</span>. 
          <span className="mx-2 text-zinc-700">|</span> 
          Simply better careers.
        </p>

        {/* Links / Sub-footer */}
        <div className="flex gap-8 mt-4">
          {[
            { label: 'Privacy', view: 'support' },
            { label: 'Terms', view: 'terms' },
            { label: 'Security', view: 'support' }
          ].map((link) => (
            <button 
              key={link.label} 
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.hash = '';
                  // Dispatch custom event to notify parent
                  window.dispatchEvent(new CustomEvent('navigateTo', { detail: { view: link.view } }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="text-[9px] font-bold text-zinc-600 hover:text-[#3B6FF5] uppercase tracking-widest transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>
        
        {/* Subtle glow at the very bottom */}
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-[#3B6FF5]/5 blur-[100px] rounded-full pointer-events-none" />
      </div>
    </footer>
  );
};
