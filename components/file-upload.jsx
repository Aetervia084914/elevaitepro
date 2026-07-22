'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Target, ArrowRight, ChevronLeft, Sparkles, Activity, Loader2 } from 'lucide-react';
import { Button } from './ui/button.jsx';
import { Card } from './ui/card.jsx';
import { Input } from './ui/input.jsx';
import { Textarea } from './ui/textarea.jsx';
import { Label } from './ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select.jsx';
import { getFullAnalysis } from '../services/services.js';
import { setFlag } from '../lib/storageClient.js';

const REGIONS = ["Global", "UK", "Ireland", "North America", "Europe", "Asia Pacific"];

export function FileUpload({ onAnalysisComplete, onBack }) {
  const [cvText, setCvText] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [region, setRegion] = useState("Global");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = async (e) => {
    e.preventDefault();
    if (!cvText || !careerGoal) return;

    setIsAnalyzing(true);
    try {
      const result = await getFullAnalysis(cvText, careerGoal, [], region);
      await setFlag('lastAnalysisDate', new Date().toISOString());
      await setFlag('profileCompleted', true);
      onAnalysisComplete(result);
    } catch (error) {
      console.error("Analysis failed:", error);
      // In a real app, we would show a toast error here
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-t-4 border-vibrant-azure border-r-4 border-transparent mb-8"
        />
        <div className="relative">
          <Sparkles className="w-8 h-8 text-vibrant-purple animate-pulse mb-4 mx-auto" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter italic text-slate-900 mb-2">
          Neural <span className="text-vibrant-azure">Processing</span>
        </h2>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
          Synthesizing Skill Intelligence Matrix...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-vibrant-azure/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >
        <button 
          onClick={onBack}
          className="mb-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-vibrant-azure transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Nexus
        </button>

        <Card className="glass-glossy border-white shadow-midnight-glow rounded-[2.5rem] p-8 md:p-12 overflow-hidden relative border">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-vibrant-azure via-vibrant-purple to-vibrant-coral" />
          
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none mb-2">
              Inject <span className="text-vibrant-azure">Assets</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visionary Input Terminal</p>
          </div>

          <form onSubmit={handleRunAnalysis} className="space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">1. Professional Record (CV Text)</Label>
              <Textarea 
                placeholder="Paste your CV content here for deep analysis..."
                className="min-h-[200px] rounded-2xl bg-slate-50 border-slate-100 focus:ring-vibrant-azure focus:border-vibrant-azure transition-all text-sm leading-relaxed"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">2. Career Objective</Label>
                <Input 
                  placeholder="e.g. Solutions Architect"
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:ring-vibrant-azure focus:border-vibrant-azure"
                  value={careerGoal}
                  onChange={(e) => setCareerGoal(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">3. Target Matrix (Region)</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-slate-100">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {REGIONS.map(r => (
                      <SelectItem key={r} value={r} className="rounded-lg">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              type="submit"
              disabled={!cvText || !careerGoal}
              className="w-full h-16 rounded-2xl bg-vibrant-azure text-white font-black uppercase tracking-[0.3em] text-[11px] shadow-azure-glow hover:scale-[1.02] transition-all border-none relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              Run Neural Analysis
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
