'use client';

import React, { useState, useEffect } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Progress } from './ui/progress.jsx';
import { FileText, Sparkles, Brain, Database, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils.js';

const DEFAULT_UPLOAD_STEPS = [
  { label: 'Reading your CV...', icon: FileText },
  { label: 'Extracting text content...', icon: FileText },
  { label: 'Analyzing skills & competencies...', icon: Brain },
  { label: 'Detecting tools & technologies...', icon: Database },
  { label: 'Processing certifications...', icon: Sparkles },
  { label: 'Identifying future career roles...', icon: Sparkles },
  { label: 'Building your career profile...', icon: Brain },
  { label: 'Finalizing results...', icon: Loader2 },
];

const ANALYSIS_STEPS = [
  { label: 'Preparing your career data...', icon: FileText },
  { label: 'Evaluating skill gaps for target role...', icon: Brain },
  { label: 'Analyzing competency alignment...', icon: Database },
  { label: 'Generating certification roadmap...', icon: Sparkles },
  { label: 'Computing ATS compatibility score...', icon: Brain },
  { label: 'Gathering market intelligence...', icon: Database },
  { label: 'Building AI skills assessment...', icon: Sparkles },
  { label: 'Compiling your career report...', icon: Loader2 },
];

export { ANALYSIS_STEPS };

export default function Waiting({
  isOpen,
  title = 'Analyzing Your CV',
  subtitle = 'Please wait while we extract and process your information...',
  steps: customSteps,
  footerMessage = 'This may take a few minutes ...',
}) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = customSteps || DEFAULT_UPLOAD_STEPS;

  useEffect(() => {
    if (isOpen) {
      setProgress(0);
      setCurrentStep(0);

      // Simulate progress through steps
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 8 + 2;
          if (newProgress >= 100) {
            clearInterval(interval);
            return 100;
          }
          return newProgress;
        });
      }, 400);

      // Cycle through steps
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => (prev + 1) % steps.length);
      }, 1500);

      return () => {
        clearInterval(interval);
        clearInterval(stepInterval);
      };
    }
  }, [isOpen]);

  const CurrentIcon = steps[currentStep].icon;

  if (!isOpen) return null;

  return (
    <DialogPrimitive.Root open={isOpen} modal={true}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[9999] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-[10000] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg">
              <CurrentIcon className="w-8 h-8 text-white animate-pulse" />
            </div>
            <span className="text-xl font-bold text-center">
              {title}
            </span>
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-center text-muted-foreground text-sm">
            {subtitle}
          </DialogPrimitive.Description>

          <div className="space-y-4 py-4">
            {/* Progress bar */}
            <Progress value={progress} className="h-2" />

            {/* Current step */}
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{steps[currentStep].label}</span>
            </div>

            {/* Step indicators */}
            <div className="flex justify-center gap-1.5 pt-2">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    index === currentStep
                      ? "bg-primary w-4"
                      : index < currentStep
                      ? "bg-primary/60 w-2"
                      : "bg-muted w-2"
                  )}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {footerMessage}
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
