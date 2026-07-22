import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog.jsx';

export function FutureRolesLoadingModal({ open }) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[520px] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(244,247,255,0.94)_38%,_rgba(236,242,255,0.94)_100%)] p-0 shadow-[0_32px_90px_rgba(79,70,229,0.22)] backdrop-blur-2xl [&>button]:hidden">
        <div className="relative overflow-hidden rounded-lg">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(99,102,241,0.12),rgba(168,85,247,0.08)_45%,rgba(236,72,153,0.08))]" />
          <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))]" />
          <div className="absolute -left-12 top-8 h-32 w-32 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute -right-10 bottom-6 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative flex flex-col items-center gap-6 px-8 py-10 text-center">
            <div className="relative flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 opacity-90 shadow-[0_18px_50px_rgba(99,102,241,0.35)]" />
              <div className="absolute inset-[1px] rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.10))]" />
              <div className="absolute inset-0 rounded-[28px] border border-white/40" />
              <div className="absolute -inset-4 rounded-[36px] bg-indigo-400/20 blur-2xl" />
              <Loader2 className="relative z-10 h-10 w-10 animate-spin text-white" />
              <Sparkles className="absolute -right-1 -top-1 z-10 h-5 w-5 text-white/90" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-[24px] font-semibold tracking-tight text-slate-900">
                Populating all possible future desired roles
              </DialogTitle>
              <DialogDescription className="mx-auto max-w-md text-[14px] leading-6 text-slate-600">
                Please wait while we use your profile details to get all future roles and prefill the desired role dropdown.
              </DialogDescription>
            </div>
            <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[12px] font-semibold tracking-wide text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500/70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-indigo-600" />
              </span>
              Getting all future roles...
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
