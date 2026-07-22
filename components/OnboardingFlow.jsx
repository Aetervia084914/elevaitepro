
import React, { useState, useEffect } from 'react';
import { CandidateCategory } from '../app/types.js';
import { mapRoleAnalysisToMappedData } from '../services/services.js';

// Sub-components
import { OnboardingStepChoice } from './onboarding/OnboardingStepChoice.jsx';
import { OnboardingStepForm } from './onboarding/OnboardingStepForm.jsx';
import { OnboardingStepPaymentSummary } from './onboarding/OnboardingStepPaymentSummary.jsx';
import { Hero } from './Hero.jsx';
import Dashboard from './Dashboard.jsx';

export const OnboardingFlow = ({
  onComplete,
  onBack,
  initialStep = null,
  initialEmail = null,
  paymentError = null,
}) => {

  const [step, setStep] = useState(initialStep ?? 1);
  const [isReturning, setIsReturning] = useState(false);
  const [error, setError] = useState(paymentError || null);
  const [pendingEmail, setPendingEmail] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [preloadedAnalysis, setPreloadedAnalysis] = useState(null);
  const [verificationSessionToken, setVerificationSessionToken] = useState(null);

  const [formData, setFormData] = useState({
    id: null,
    userId: null,
    name: '',
    email: initialEmail || '',
    password: '',
    location: 'Remote',
    qualification: 'N/A',
    careerAspirations: '',
    candidateCategory: CandidateCategory.ASPIRING,
    selectedTier: 'Starter',
    region: 'UK',
    targetIndustry: null,
    educationLevel: null,
    cvAttemptsUsed: 0,
    lastPaymentDate: 0,
    currentStage: 0,
    creditsRemaining: 1,
    userJourney: null,
    totalCpdHours: 0,
    lastAnalysis: null,
  });

  // When initialEmail is provided (same-tab redirect),
  // update formData so OnboardingStepPaymentSummary has the correct context.
  useEffect(() => {
    if (!initialEmail) return;
    setFormData(prev => ({ ...prev, email: initialEmail }));
    setPendingEmail(initialEmail);
  }, [initialEmail]);

  // Handle payment failure - ensure no account is created
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paymentCanceled = urlParams.get('payment_canceled');

    if (!paymentCanceled || paymentCanceled !== 'true') return;

    console.warn('[PaymentCanceled] User canceled payment - no account created');
    setError('Payment was cancelled. Please try again if you wish to continue.');
    setStep(1); // Return to onboarding choice

    // Clear URL params
    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(null);
    if (field === 'email' && value) {
      checkEmailExists(value);
    }
  };

  const handleActionSelect = (returning) => {
    setIsReturning(returning);
    setStep(3);
  };

  const checkEmailExists = async (email) => {
    setCheckingEmail(true);
    setEmailExists(false);
    try {
      const res = await fetch(`/api/validateemail`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
        cache: 'no-store'
      });
      const data = await res.json();
      setEmailExists(!!data.exists);
    } catch {
      setError('Error checking email.');
    }
    setCheckingEmail(false);
  };

  const fetchUserJourney = async (userId) => {
    if (!userId) return null;
    try {
      const res = await fetch(`/api/fastapi/userjourney?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      return data.userJourney || null;
    } catch {
      return null;
    }
  };

  const fetchLatestAnalysis = async (candidateId) => {
    if (!candidateId) return null;
    try {
      const res = await fetch(`/api/fastapi/get-latest-analysis?candidateId=${encodeURIComponent(candidateId)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({}));
      if (!data.success) return null;
      if (!data.analysis) return { targetRole: data.targetRole, region: data.region, analysis: null };
      try {
        const mapped = data.analysis.tabs
          ? data.analysis
          : mapRoleAnalysisToMappedData(data.analysis, data.region, data.targetRole);
        return { targetRole: data.targetRole, region: data.region, analysis: mapped };
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();

    if (isReturning) {
      // ── Login flow ────────────────────────────────────────────────────────────
      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/fastapi/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            role: 'candidate'
          })
        });
        const data = await res.json();
        if (res.status === 200) {
          if (data.sessionId && typeof window !== 'undefined') {
            window.localStorage.setItem('sessionId', data.sessionId);
          }
          const userJourney = await fetchUserJourney(data.user?.id);
          const loginStage = (
            userJourney?.currentStage ||
            userJourney?.current_stage ||
            data.user.current_stage ||
            ''
          ).toUpperCase();

          const updatePayload = {
            id: data.user.id,
            userId: data.user.user_id,
            name: data.user.name,
            email: data.user.email,
            location: data.user.location,
            qualification: data.user.qualification,
            careerAspirations: data.user.career_aspirations,
            candidateCategory: data.user.candidate_category,
            selectedTier: data.user.selected_tier,
            region: data.user.region,
            cvAttemptsUsed: data.user.cv_attempts_used,
            lastPaymentDate: data.user.last_payment_date,
            currentStage: loginStage || userJourney?.currentStage || 'UPLOAD_CV',
            creditsRemaining: userJourney?.creditsRemaining ?? 1,
            userJourney,
            totalCpdHours: data.user.total_cpd_hours,
            createdAt: data.user.created_at,
            updatedAt: data.user.updated_at,
            password: ''
          };

          setFormData(prev => ({ ...prev, ...updatePayload }));

          if (loginStage === 'ANALYSIS' || loginStage === 'RESULTS') {
            const preloaded = await fetchLatestAnalysis(data.user.id);
            setFormData(prev => ({ ...prev, ...updatePayload }));
            onComplete && onComplete(updatePayload, preloaded);
          } else {
            setPreloadedAnalysis(null);
            setStep(5); // Hero inside onboarding modal
          }
        } else if (res.status === 403) {
          setError(data.detail || 'Email not verified. Please check your inbox and verify your email before logging in.');
        } else {
          setError(data.error || data.detail || 'Account not found or password incorrect.');
        }
      } catch {
        setError('Server error. Please try again.');
      }
      setCheckingEmail(false);
    }
    // New user form submission is handled by the form component's
    // verification flow. The form calls onProceedToPayment after
    // successful email verification.
  };

  // Called by OnboardingStepForm when email is verified and user clicks "Proceed For Payment"
  const handleProceedToPayment = (sessionToken) => {
    setPendingEmail(formData.email.trim().toLowerCase());
    setVerificationSessionToken(sessionToken);
    setStep(4);
  };

  return (
    <div className="min-h-screen flex flex-col items-stretch">
      <div className="w-full flex-1">
        {(step === 1 || step === 3 || step === 4) && (
          <>
            {step === 1 && (
              <div className="w-full min-h-screen flex flex-col">
                {/* Payment-failed error banner */}
                {error && (
                  <div className="w-full bg-rose-50 border-b border-rose-200 px-6 py-3 text-center text-[13px] font-semibold text-rose-700">
                    {error}
                  </div>
                )}
                <OnboardingStepChoice onSelectAction={handleActionSelect} onBack={onBack} />
              </div>
            )}
            {step !== 1 && (
              <div className="max-w-4xl mx-auto">
                {step === 3 && (
                  <OnboardingStepForm
                    isReturning={isReturning}
                    formData={formData}
                    onChange={handleChange}
                    onSubmit={handleProfileSubmit}
                    onProceedToPayment={handleProceedToPayment}
                    error={error}
                    checkingEmail={checkingEmail}
                    emailExists={emailExists}
                    isLoading={checkingEmail}
                    onBack={() => setStep(1)}
                  />
                )}
                {step === 4 && !isReturning && (
                  <OnboardingStepPaymentSummary
                    formData={formData}
                    onBack={() => setStep(3)}
                    onClose={() => setStep(1)}
                  />
                )}
              </div>
            )}
          </>
        )}
        {step === 5 && (
          <Hero
            userData={formData}
            targetRole={formData.careerAspirations}
            selectedPlan={formData.selectedTier}
            onContinue={() => setStep(6)}
            onLogout={() => setStep(1)}
            preloadedAnalysis={preloadedAnalysis}
          />
        )}
        {step === 6 && (
          <Dashboard
            selectedTier={formData.selectedTier}
            onLogout={() => {
              setFormData({
                id: null,
                userId: null,
                name: '',
                email: '',
                password: '',
                location: 'Remote',
                qualification: 'N/A',
                careerAspirations: '',
                candidateCategory: CandidateCategory.ASPIRING,
                selectedTier: 'Starter',
                region: 'UK',
                targetIndustry: null,
                educationLevel: null,
                cvAttemptsUsed: 0,
                lastPaymentDate: 0,
                currentStage: 0,
                creditsRemaining: 1,
                userJourney: null,
                totalCpdHours: 0,
                lastAnalysis: null,
              });
              setStep(1);
            }}
          />
        )}
      </div>
    </div>
  );
};
