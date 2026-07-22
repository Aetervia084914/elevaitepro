"use client";

import React, { useState } from 'react';
import {
  CreditCard, ArrowRight, Loader2, Lock, ChevronLeft,
  Fingerprint, AlertCircle,
} from 'lucide-react';
import { OnboardingModalShell } from './OnboardingModalShell.jsx';

const DISPLAY_PRICE = '£19.99';

export const OnboardingStepPaymentSummary = ({
  formData = {},
  onBack,
  onClose,
  isTopup = false,
  candidateId = null,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompletePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const origin = window.location.origin;

      if (isTopup) {
        window.localStorage.setItem(
          'elevaite_topup_pending',
          JSON.stringify({ candidateId })
        );
      } else if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          'elevaite_pending_payment',
          JSON.stringify({
            name: formData.name || '',
            email: (formData.email || '').toLowerCase().trim(),
            password: formData.password || '',
            targetJobTitle: formData.targetJobTitle || '',
            careerAspirations: formData.careerAspirations || '',
            selectedTier: formData.selectedTier || 'Starter',
          })
        );
      }

      const successUrl = isTopup
        ? `${origin}/?topup_session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/?payment_session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = isTopup
        ? `${origin}/?topup_canceled=true`
        : `${origin}/?payment_canceled=true`;

      const res = await fetch(`/api/fastapi/payment/create-direct-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (formData.email || '').toLowerCase().trim(),
          success_url: successUrl,
          cancel_url: cancelUrl,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to initialize payment. Please try again.');
      }

      const { checkout_url } = await res.json();

      if (!checkout_url) {
        throw new Error('No checkout URL returned. Please try again.');
      }

      window.location.href = checkout_url;
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Failed to start payment. Please try again.');
    }
  };

  return (
    <OnboardingModalShell
      onClose={onClose}
      leftIcon={Fingerprint}
      leftEyebrow="Live Intelligence"
      leftTitle="elevAIte pro"
      leftSubtitle="Intelligence suite activation"
      leftFooterItems={['Secure Access', 'Proceed For Payment', 'return to previous step']}
      className="md:min-h-[510px]"
    >
      <div className="mx-auto flex w-full max-w-[360px] flex-col justify-center">
        {/* Header */}
        <div className="mb-[5px] font-[var(--font-bricolage-grotesque)] text-[22px] font-extrabold tracking-[-0.025em] text-[var(--m05-indigo-900)]">
          {isTopup ? 'Top Up Credits' : 'Secure Access'}
        </div>
        <div className="mb-6 text-[13px] leading-[1.5] text-[var(--m05-muted)]">
          {isTopup ? 'Add 1 credit to upload a new CV' : 'Investment Summary'}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-[12px] border border-[var(--m05-red-200)] bg-[var(--m05-red-50)] p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--m05-red-600)]" />
            <div className="text-[12px] text-[var(--m05-red-700)]">{error}</div>
          </div>
        )}

        {/* Price card */}
        <div className="mb-5 rounded-[18px] border border-[var(--m05-border)] bg-white px-5 py-6 text-center shadow-[0_10px_32px_rgba(57,73,171,0.08)]">
          <div className="relative mx-auto mb-4 inline-flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-[var(--m05-border)] bg-[linear-gradient(135deg,rgba(57,73,171,0.08),rgba(0,188,212,0.08))]">
            <CreditCard className="h-6 w-6 text-[var(--m05-indigo-700)]" />
            <div className="absolute -right-1 -top-1 rounded-full bg-white p-1 shadow-sm">
              <Lock className="h-3 w-3 text-[var(--m05-cyan-700)]" />
            </div>
          </div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--m05-muted)]">
            Total Due
          </div>
          <div className="font-[var(--font-unbounded)] text-[34px] font-extrabold tracking-[-0.04em] text-[var(--m05-indigo-900)] tabular-nums">
            {DISPLAY_PRICE}
          </div>
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--m05-muted-light)]">
            One-time payment • All taxes included
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          disabled={loading}
          onClick={handleCompletePayment}
          className={`m05-primary-btn ${loading ? 'cursor-not-allowed opacity-60' : ''}`}
        >
          {loading ? (
            <>
              <Loader2 className="h-[14px] w-[14px] animate-spin" />
              Redirecting to Stripe…
            </>
          ) : (
            <>
              Complete Payment
              <ArrowRight className="h-[14px] w-[14px]" />
            </>
          )}
        </button>

        {/* Back link */}
        {onBack && !loading && (
          <button
            type="button"
            onClick={() => { onBack(); }}
            className="mt-4 flex w-full items-center justify-center gap-[5px] text-[12px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
          >
            <ChevronLeft className="h-[12px] w-[12px]" />
            Return to previous step
          </button>
        )}
      </div>
    </OnboardingModalShell>
  );
};
