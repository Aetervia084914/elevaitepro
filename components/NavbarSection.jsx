import React, { useState, useEffect } from 'react';
import { Sparkles, LayoutGrid } from 'lucide-react';
import { Button } from "./ui/button.jsx";
import { RecruiterPortal } from './RecruiterPortal.jsx';
import { OnboardingFlow } from './OnboardingFlow.jsx';

import { storageService } from '../services/storageService.js';
import { JourneyStage, getTierPrices } from '../datastore.js';

export const NavbarSection = () => {
  const [showRecruiter, setShowRecruiter] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const prices = getTierPrices('UK');

  // Listen for hash changes to support "Start Journey" buttons in other sections (like DiscoverySection)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#onboarding') {
        setShowOnboarding(true);
      }
    };
    window.addEventListener('hashchange', handleHash);
    // Initial check
    if (window.location.hash === '#onboarding') setShowOnboarding(true);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const handleOnboardingComplete = (profile) => {
    // No local/session storage logic here
    setShowOnboarding(false);
    window.location.hash = '';
  };

  const handleBack = () => {
    setShowOnboarding(false);
    window.location.hash = '';
  };

  // Helper to get current user contact for the Recruiter Portal logic
  const getContact = () => {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('career_lift_profile') : null;
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed ? parsed.contact : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  };

  if (showRecruiter) {
    return (
      <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
        <RecruiterPortal 
          onLogout={() => setShowRecruiter(false)} 
          currentUserContact={getContact()} 
        />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="fixed inset-0 z-[200] bg-white overflow-y-auto overflow-x-hidden no-scrollbar">
        <OnboardingFlow 
          onComplete={handleOnboardingComplete}
          onBack={handleBack}
          prices={prices}
          initialTier={null}
        />
      </div>
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] w-full px-6 py-6 pointer-events-none">
      <nav className="max-w-7xl mx-auto h-16 px-6 flex items-center justify-between rounded-full border border-white/10 bg-slate-900/60 backdrop-blur-xl shadow-2xl pointer-events-auto">
        
        {/* Logo Section */}
        <div 
          className="flex items-center gap-2 z-10 cursor-pointer group" 
          onClick={() => { window.location.hash = ''; setShowOnboarding(false); setShowRecruiter(false); }}
        >
          <div className="p-2 bg-indigo-600 rounded-lg group-hover:rotate-12 transition-transform duration-300">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tighter">
            elev<span className="text-indigo-500">AIte</span>
          </span>
        </div>
        
 

        {/* Action Buttons */}
        <div className="flex items-center gap-4 z-10">
         
          
          <button 
            onClick={() => setShowRecruiter(true)} 
            className="hidden sm:flex items-center gap-2 text-xs font-bold text-white hover:text-indigo-400 transition-colors px-4 py-2 no-underline bg-transparent border-none cursor-pointer"
          >
            <LayoutGrid size={16} /> 
            <span>Recruiter Portal</span>
          </button>
          <Button 
            onClick={() => setShowOnboarding(true)} 
            className="h-[32px] px-10 rounded-full bg-gradient-to-br from-[#4f7df3] to-[#3b66e3] text-white font-bold text-sm shadow-[0_12px_35px_rgba(59,102,227,0.5)] hover:brightness-110 relative z-10 transition-all active:scale-95 group"
          >
            Get started
          </Button>
        </div>
      </nav>
    </header>
  );
};