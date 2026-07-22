
"use client";

import React from "react";
import { Brain, Target, Heart } from "lucide-react";
import Card1 from "./Card1.jsx";

export const PlatformSection = () => {
  const features = [
    {
      title: "SMART AI",
      icon: Brain,
      variant: "azure",
      description: "Advanced coaching designed specifically for your goals."
    },
    {
      title: "FIX SKILL GAPS",
      icon: Target,
      variant: "blue",
      description: "Find exactly what is holding you back and fix it fast."
    },
    {
      title: "YOUR CAREER PARTNER",
      icon: Heart,
      variant: "ocean",
      description: "We stay by your side until you reach the top."
    }
  ];

  return (
    <section className="relative w-full py-24 bg-white overflow-hidden">
      {/* Soft Background Accents for Light Theme */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#3B6FF5]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-slate-100 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {/* Section Header */}
        <div className="mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3B6FF5] mb-4 block animate-in fade-in slide-in-from-bottom-2 duration-700">
            Our promise
          </span>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase italic mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            MORE THAN JUST <span className="text-[#3B6FF5]">A CV.</span>
          </h2>
          
          {/* Decorative Divider - Subtler for Light Theme */}
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-slate-300 to-transparent mx-auto mb-8" />

          <p className="max-w-2xl mx-auto text-slate-600 font-medium text-base md:text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
            Everyone deserves a great career. <br className="hidden md:block" />
            We make career coaching simple, smart, and personal to you.
          </p>
        </div>

        {/* Feature Cards Grid using Card1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card1 
              key={index}
              title={feature.title}
              icon={feature.icon}
              variant={feature.variant}
              className="animate-in fade-in slide-in-from-bottom-8 duration-700"
              style={{ animationDelay: `${300 + index * 100}ms` }}
            >
              <p className="text-sm md:text-base leading-relaxed">
                {feature.description}
              </p>
            </Card1>
          ))}
        </div>
      </div>
    </section>
  );
};
