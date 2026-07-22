'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppState, getTierPrices } from '../datastore.js';

// Production functional components
import { RecruiterPortal } from '../components/RecruiterPortal.jsx';
import { OnboardingFlow } from '../components/OnboardingFlow.jsx';
import { Hero } from '../components/Hero.jsx';
import { PricingComparisonModal } from '../components/PricingComparisonModal.jsx';
import { OnboardingStepPaymentSummary } from '../components/onboarding/OnboardingStepPaymentSummary.jsx';

// Frontend visual components
import FrontendNavbar from '../components/FrontendNavbar.jsx';
import FrontendHero from '../components/FrontendHero.jsx';
import StatsBar from '../components/StatsBar.jsx';
import FrontendFeatures from '../components/FrontendFeatures.jsx';
import UserJourney from '../components/UserJourney.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import FrontendPricing from '../components/FrontendPricing.jsx';
import WhyDifferent from '../components/WhyDifferent.jsx';
import FrontendFooter from '../components/FrontendFooter.jsx';
import Support from '../components/Support.jsx';
import Terms from '../components/Terms.jsx';

const Home = () => {
  const [appState, setAppState] = useState(AppState.LANDING);
  const [userProfile, setUserProfile] = useState(null);

  const [activeView, setActiveView] = useState('home');
  const [showRecruiter, setShowRecruiter] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [onboardingInitialStep, setOnboardingInitialStep] = useState(null);
  const [onboardingInitialEmail, setOnboardingInitialEmail] = useState(null);
  const [onboardingPaymentError, setOnboardingPaymentError] = useState(null);
  const [showTopupPayment, setShowTopupPayment] = useState(false);
  const [topupError, setTopupError] = useState(null);
  
  const canvasRef = useRef(null);
  const beamsRef = useRef(null);

  useEffect(() => {
    setUserProfile(null);
    setAppState(AppState.LANDING);
  }, []);

  const handleLogout = () => {
    setUserProfile(null);
    setAppState(AppState.LANDING);
  };

  const prices = getTierPrices('UK');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H;
    let animId;
    const particles = [];

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const COLORS = [
      [99, 120, 230],
      [0, 188, 212],
      [124, 77, 255],
      [41, 182, 246],
      [255, 255, 255],
    ];

    for (let i = 0; i < 80; i++) {
      const c = COLORS[Math.floor(Math.random() * COLORS.length)];
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 2.5 + 0.5,
        a: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.3 + 0.05,
        drift: (Math.random() - 0.5) * 0.008,
        opacity: Math.random() * 0.5 + 0.1,
        color: c,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.a += p.drift;
        p.x += Math.cos(p.a) * p.speed;
        p.y += Math.sin(p.a) * p.speed * 0.4;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  useEffect(() => {
    const container = beamsRef.current;
    if (!container) return;
    const timeouts = [];

    function spawnBeam() {
      const beam = document.createElement('div');
      beam.className = 'beam';
      const h = 150 + Math.random() * 250;
      beam.style.cssText = `height:${h}px;left:${Math.random() * 100}%;top:0;animation-duration:${6 + Math.random() * 8}s;animation-delay:${Math.random() * 4}s;opacity:0;`;
      container.appendChild(beam);
      const t = setTimeout(() => beam.remove(), 16000);
      timeouts.push(t);
    }

    for (let i = 0; i < 8; i++) spawnBeam();
    const interval = setInterval(spawnBeam, 2000);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    function animateCounters() {
      document.querySelectorAll('.stat-num').forEach(el => {
        const text = el.textContent;
        const num = parseFloat(text.replace(/[^0-9.]/g, ''));
        const suffix = text.replace(/[0-9.]/g, '');
        let start = 0;
        const step = num / 60;
        const timer = setInterval(() => {
          start = Math.min(start + step, num);
          el.textContent = (Number.isInteger(num) ? Math.floor(start) : start.toFixed(1)) + suffix;
          if (start >= num) clearInterval(timer);
        }, 20);
      });
    }
    const t = setTimeout(animateCounters, 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#onboarding') setShowOnboarding(true);
    };
    window.addEventListener('hashchange', handleHash);
    if (window.location.hash === '#onboarding') setShowOnboarding(true);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Handle URL query params set by the payment and verification flows
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    // Credit top-up redirect — verify payment and update credits for existing user
    const topupSessionId = params.get('topup_session_id');
    if (topupSessionId) {
      window.history.replaceState({}, '', '/');
      const raw = window.localStorage.getItem('elevaite_topup_pending');
      if (!raw) {
        setTopupError('Top-up session data not found. Please contact support.');
        return;
      }
      let topupData;
      try {
        topupData = JSON.parse(raw);
      } catch {
        window.localStorage.removeItem('elevaite_topup_pending');
        setTopupError('Invalid top-up session data. Please contact support.');
        return;
      }

      fetch(`/api/fastapi/payment/topup-credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: topupSessionId,
          candidate_id: topupData.candidateId,
        }),
      })
        .then(res => {
          if (!res.ok) return res.json().then(err => { throw new Error(err.detail || 'Credit top-up failed.'); });
          return res.json();
        })
        .then(data => {
          window.localStorage.removeItem('elevaite_topup_pending');
          setUserProfile(prev => ({
            ...prev,
            creditsRemaining: data.creditsRemaining || 1,
            currentStage: data.currentStage || 'UPLOAD_CV',
          }));
          setActiveView('dashboard');
        })
        .catch(err => {
          window.localStorage.removeItem('elevaite_topup_pending');
          setTopupError(err.message || 'Top-up verification failed.');
        });
      return;
    }

    // Credit top-up cancelled
    if (params.get('topup_canceled') === 'true') {
      window.history.replaceState({}, '', '/');
      window.localStorage.removeItem('elevaite_topup_pending');
      setTopupError('Payment was cancelled. Please try again if you wish to continue.');
      return;
    }

    // Stripe Checkout redirect — verify payment and create user via FastAPI
    const stripeSessionId = params.get('payment_session_id');
    if (stripeSessionId) {
      window.history.replaceState({}, '', '/');

      const raw = window.localStorage.getItem('elevaite_pending_payment');
      if (!raw) {
        setOnboardingPaymentError('Payment session data not found. Please contact support or try again.');
        setShowOnboarding(true);
        return;
      }

      let pending;
      try {
        pending = JSON.parse(raw);
      } catch {
        window.localStorage.removeItem('elevaite_pending_payment');
        setOnboardingPaymentError('Invalid payment session data. Please contact support.');
        setShowOnboarding(true);
        return;
      }

      fetch(`/api/fastapi/payment/complete-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: stripeSessionId,
          name: pending.name || '',
          email: (pending.email || '').toLowerCase().trim(),
          password: pending.password || '',
          target_job_title: pending.targetJobTitle || '',
          career_aspirations: pending.careerAspirations || '',
          selected_tier: pending.selectedTier || 'Starter',
        }),
      })
        .then(res => {
          if (!res.ok) return res.json().then(err => { throw new Error(err.detail || 'Account creation failed.'); });
          return res.json();
        })
        .then(data => {
          window.localStorage.removeItem('elevaite_pending_payment');
          if (data.sessionId) {
            window.localStorage.setItem('sessionId', data.sessionId);
          }
          setUserProfile({
            id: data.candidateId,
            name: pending.name,
            email: pending.email,
            selectedTier: pending.selectedTier || 'Starter',
            careerAspirations: pending.careerAspirations || pending.targetJobTitle || '',
          });
          setActiveView('dashboard');
        })
        .catch(err => {
          window.localStorage.removeItem('elevaite_pending_payment');
          setOnboardingPaymentError(err.message || 'Payment verification failed. Please contact support.');
          setShowOnboarding(true);
        });
      return;
    }

    // Stripe cancelled — open onboarding at step 1 with error message
    if (params.get('payment_canceled') === 'true' || params.get('payment_failed') === 'true') {
      window.history.replaceState({}, '', '/');
      window.localStorage.removeItem('elevaite_pending_payment');
      setOnboardingPaymentError('Payment was cancelled. Please try again if you wish to continue.');
      setShowOnboarding(true);
      return;
    }

    // Stripe succeeded — validate session and show Hero
    if (params.get('paid') === 'true') {
      window.history.replaceState({}, '', '/');
      const sid = window.localStorage.getItem('sessionId');
      fetch('/api/fastapi/auth-me', {
        headers: sid ? { 'x-session-id': sid } : {},
      })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.user) {
            setUserProfile(data.user);
            setActiveView('dashboard');
          } else {
            setShowOnboarding(true);
          }
        })
        .catch(() => setShowOnboarding(true));
      return;
    }

    // Verify-email page redirect — resume onboarding at payment step
    if (params.get('onboarding') === 'true') {
      const step = parseInt(params.get('step'), 10) || null;
      const email = params.get('email') || null;
      const name = params.get('name') || null;
      window.history.replaceState({}, '', '/');
      if (email) setOnboardingInitialEmail(email);
      if (step) setOnboardingInitialStep(step);
      setShowOnboarding(true);
      return;
    }

    // Redis TTL expired after payment — show a recoverable message
    if (params.get('payment_session_expired') === 'true') {
      window.history.replaceState({}, '', '/');
      setOnboardingPaymentError(
        'Your payment was processed but the session expired. Please contact support or sign in if your account was created.'
      );
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    const handleNavigate = (e) => {
      if (e.detail && e.detail.view) {
        setActiveView(e.detail.view);
      }
    };
    window.addEventListener('navigateTo', handleNavigate);
    return () => window.removeEventListener('navigateTo', handleNavigate);
  }, []);

  return (
    <>
      <div className="bg-mesh"></div>
      <canvas id="grain" ref={canvasRef}></canvas>
      <div className="beams" ref={beamsRef}></div>

      {showRecruiter && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto">
          <RecruiterPortal onLogout={() => setShowRecruiter(false)} currentUserContact={null} />
        </div>
      )}
      {showOnboarding && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto overflow-x-hidden no-scrollbar">
          <OnboardingFlow
            onComplete={(userData, preloadedAnalysis) => {
              if (userData) {
                setUserProfile(prev => ({
                  ...prev,
                  ...userData,
                  preloadedAnalysis,
                  creditsRemaining: userData.creditsRemaining ?? userData.userJourney?.creditsRemaining ?? 1
                }));
                setActiveView('dashboard');
              }
              setShowOnboarding(false);
              setOnboardingInitialStep(null);
              setOnboardingInitialEmail(null);
              setOnboardingPaymentError(null);
              window.location.hash = '';
            }}
            onBack={() => {
              setShowOnboarding(false);
              setOnboardingInitialStep(null);
              setOnboardingInitialEmail(null);
              setOnboardingPaymentError(null);
              window.location.hash = '';
            }}
            initialStep={onboardingInitialStep}
            initialEmail={onboardingInitialEmail}
            paymentError={onboardingPaymentError}
          />
        </div>
      )}
      {userProfile && activeView === 'dashboard' && (
        <div className="fixed inset-0 z-[180] bg-white overflow-y-auto overflow-x-hidden no-scrollbar">
          <Hero
            userData={userProfile}
            targetRole={userProfile?.careerAspirations}
            selectedPlan={userProfile?.selectedTier}
            onLogout={() => { 
              setUserProfile(null);
              setActiveView('home');
            }}
            onOpenPayment={() => {
              setTopupError(null);
              setShowTopupPayment(true);
            }}
            topupError={topupError}
            onClearTopupError={() => setTopupError(null)}
            preloadedAnalysis={userProfile?.preloadedAnalysis}
          />
        </div>
      )}
      {showTopupPayment && userProfile && (
        <div className="fixed inset-0 z-[200] bg-white overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className="max-w-4xl mx-auto">
            <OnboardingStepPaymentSummary
              formData={{ email: userProfile.email }}
              isTopup={true}
              candidateId={userProfile.id}
              onBack={() => setShowTopupPayment(false)}
              onClose={() => setShowTopupPayment(false)}
            />
          </div>
        </div>
      )}

      <PricingComparisonModal
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        onSelectTier={() => {
          setShowComparison(false);
          window.location.hash = '#onboarding';
        }}
        prices={prices}
      />

      <div className="page">
        <FrontendNavbar
          activeView={activeView}
          onViewChange={setActiveView}
          onRecruiterClick={() => setShowRecruiter(true)}
          onGetStarted={() => setShowOnboarding(true)}
        />

        {activeView === 'home' && (
          <>
            <FrontendHero
              onStartJourney={() => { window.location.hash = '#onboarding'; }}
              onViewPlans={() => setActiveView('pricing')}
              prices={prices}
            />

            <StatsBar text="Our Promises" />

            <FrontendFeatures />

            <StatsBar text="Your Journey" />
            <UserJourney />
            <FrontendFooter onViewChange={setActiveView} />
          </>
        )}

        {activeView === 'features' && (
          <>
            <WhyDifferent />
            <FrontendFooter onViewChange={setActiveView} />
          </>
        )}

        {activeView === 'how-it-works' && (
          <>
            <HowItWorks />
            <FrontendFooter onViewChange={setActiveView} />
          </>
        )}

        {activeView === 'pricing' && (
          <>
            <FrontendPricing
              prices={prices}
              onSelectTier={() => { window.location.hash = '#onboarding'; }}
            />
            <FrontendFooter onViewChange={setActiveView} />
          </>
        )}

        {activeView === 'support' && (
          <>
            <Support />
            <FrontendFooter onViewChange={setActiveView} />
          </>
        )}

        {activeView === 'terms' && (
          <>
            <Terms />
            <FrontendFooter onViewChange={setActiveView} />
          </>
        )}
      </div>
    </>
  );
};

export default Home;
