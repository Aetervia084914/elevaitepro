'use client';
import React, { useState,useEffect } from 'react';
import { ArrowRight, Sparkles, Brain, Info } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { Badge } from './ui/badge.jsx';
import { PricingComparisonModal } from './PricingComparisonModal.jsx';
import Image from "next/image";
import ElevaiteBanner from './ElevaiteBanner.jsx';

export const DiscoverySection = ({ prices }) => {
  const [showComparison, setShowComparison] = useState(false);

  const handleStartOnboarding = () => {
    window.location.hash = '#onboarding';
  };
  const [offsetY, setOffsetY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => setOffsetY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
     <section className="relative w-full min-h-[90vh] flex items-center justify-center overflow-hidden pt-36 pb-12">
      {/* Parallax Background Image - Using standard img for ESM compatibility */}
<div
  className="absolute inset-0 -z-0 will-change-transform"
  style={{
    transform: `translateY(${offsetY * 0.25}px) scale(1.08)`,
  }}
>
  <Image
    src="/images/hero.png"
    alt="Hero Background"
    fill
    priority
    className="object-cover"
  />
</div>

      {/* Noise Texture Overlay - TEMPORARILY REMOVED FOR DEBUGGING */}
      {/* Frosted Glass Overlay - TEMPORARILY REMOVED FOR DEBUGGING */}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-3xl">

        <ElevaiteBanner />


        {/* Headline */}
 {/* <h1 className="text-5xl md:text-7xl font-Bold text-white leading-[0.95] tracking-tight uppercase mb-4 animate-in fade-in slide-in-from-bottom-5 duration-1000"> */}
 <div className="py-4 flex flex-rows gap-3">           
  <span className="
text-transparent
bg-clip-text
bg-gradient-to-b
from-white
via-white/70
to-white/30
drop-shadow-[0_2px_8px_rgba(120,160,255,0.35)]
tracking-tight text-4xl md:text-6xl  font-black
">
  CLEAR 
</span>
<span className="
text-transparent
bg-clip-text
bg-gradient-to-b
from-sky-300 via-sky-400 to-blue-600
drop-shadow-[0_2px_10px_rgba(56,189,248,0.45)]
tracking-tight  font-black
text-4xl md:text-6xl
">
  SIMPLE
</span>
          <span className="text-transparent
bg-clip-text
bg-gradient-to-b
from-white
via-white/70
to-white/30 font-black
drop-shadow-[0_2px_8px_rgba(120,160,255,0.35)]
tracking-tight text-4xl md:text-6xl">
             STRONG 
          </span></div>
        {/* </h1> */}

        {/* Top Separator */}
        <div className="w-72 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent mb-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#3B6FF5]/60 to-transparent animate-shimmer-fast" />
        </div>

        {/* Subheading */}
        <p className="text-sm md:text-base text-zinc-300 font-medium max-w-xl mb-8">
          An AI coach that helps you find your strengths, fix skill gaps, and get your dream job.
        </p>

        {/* CTA Container with Crossing Separator Background */}
        <div className="relative w-full flex flex-col sm:flex-row gap-5 items-center justify-center py-8">
          
          {/* Animated Crossing Separator Background - White/Silver focused */}
          <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none overflow-visible">
            
            {/* Main Horizontal Line Beam (Bright White) */}
            <div className="absolute w-[180%] h-[1.5px] bg-gradient-to-r from-transparent via-white/60 to-transparent scale-x-125">
              {/* Intense White Shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer-fast opacity-100" />
            </div>
            
            {/* Secondary Parallel Lines */}
            <div className="absolute w-[180%] h-[0.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent translate-y-4" />
            <div className="absolute w-[180%] h-[0.5px] bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-4" />

            {/* Bright Center Glow (White/Silver) */}
            <div className="absolute w-[350px] h-16 bg-white/20 blur-[70px] rounded-full animate-pulse" />
            
            {/* Crossing Diagonals (White) */}
            <div className="absolute w-full h-[0.5px] bg-white/30 rotate-[-1.2deg] -translate-y-1.5" />
            <div className="absolute w-full h-[0.5px] bg-white/30 rotate-[1.2deg] translate-y-1.5" />
            
            {/* High-frequency shimmer sparks */}
            <div className="absolute inset-0 opacity-40">
                <div className="absolute top-1/2 left-1/4 w-1 h-1 bg-white rounded-full blur-[1px] animate-ping duration-1000" />
                <div className="absolute top-1/2 right-1/4 w-1 h-1 bg-white rounded-full blur-[1px] animate-ping duration-1500" />
            </div>
          </div>

          <Button onClick={handleStartOnboarding} className="h-[52px] px-12 rounded-full bg-gradient-to-br from-[#4f7df3] to-[#3b66e3] text-white font-bold text-sm shadow-[0_12px_35px_rgba(59,102,227,0.5)] hover:brightness-110 relative z-10 transition-all active:scale-95 group">
            Start journey
            <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
          </Button>

          <Button
            className="h-[52px] px-12 rounded-full bg-white/95 backdrop-blur-md border border-white/40 text-slate-900 font-bold text-sm hover:bg-white relative z-10 transition-all active:scale-95"
            onClick={() => setShowComparison(true)}
          >
            <Info className="w-4 h-4 mr-2" />
            View Plans
          </Button>
        </div>
      </div>

      <PricingComparisonModal 
        isOpen={showComparison} 
        onClose={() => setShowComparison(false)} 
        onSelectTier={() => {
          setShowComparison(false);
          handleStartOnboarding();
        }} 
        prices={prices} 
      />
    </section>
  );
};