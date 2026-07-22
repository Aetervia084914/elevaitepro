"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail, CheckCircle2, AlertCircle, Loader2, ChevronLeft, RotateCcw, Clock } from "lucide-react";
import { OnboardingModalShell } from "./OnboardingModalShell.jsx";

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const POLL_INTERVAL_MS = 3000;      // poll every 3 seconds

export const OnboardingStepEmailVerification = ({
  email = "",
  onVerified,
  onBack,
  onTimeout,
}) => {
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [remainingMs, setRemainingMs] = useState(TIMEOUT_MS);
  const timeoutRef = useRef(null);
  const countdownRef = useRef(null);
  const pollRef = useRef(null);
  const startRef = useRef(Date.now());
  const verifiedRef = useRef(false);

  const callVerified = () => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;
    clearTimeout(timeoutRef.current);
    clearInterval(countdownRef.current);
    clearInterval(pollRef.current);
    onVerified && onVerified();
  };

  const pollVerification = async () => {
    if (!email || verifiedRef.current) return;
    try {
      const res = await fetch("/api/fastapi/check-email-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        callVerified();
      }
    } catch {
      // Network hiccup — will retry on next tick
    }
  };

  // Set up countdown, timeout, and auto-poll on mount
  useEffect(() => {
    if (!email) return;
    startRef.current = Date.now();

    // Countdown display
    countdownRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, TIMEOUT_MS - elapsed);
      setRemainingMs(left);
    }, 1000);

    // 15-minute hard timeout
    timeoutRef.current = setTimeout(() => {
      clearInterval(countdownRef.current);
      clearInterval(pollRef.current);
      if (onTimeout) {
        onTimeout();
      } else if (onBack) {
        onBack("Verification timed out. Please try again.");
      }
    }, TIMEOUT_MS);

    // Auto-poll so the original tab advances the moment the email link is clicked
    pollRef.current = setInterval(pollVerification, POLL_INTERVAL_MS);
    // Also check immediately in case the user verified before mounting
    pollVerification();

    return () => {
      clearTimeout(timeoutRef.current);
      clearInterval(countdownRef.current);
      clearInterval(pollRef.current);
    };
  }, [email]);

  const formatTime = (ms) => {
    const totalSec = Math.ceil(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Manual check — user can also click the button after clicking the email link
  const handleCheckVerification = async () => {
    if (!email) return;
    setChecking(true);
    setError("");
    setResendMsg("");
    try {
      const res = await fetch("/api/fastapi/check-email-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        callVerified();
      } else {
        setError(data.message || data.detail || "Email not verified yet. Please click the link in your inbox.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setChecking(false);
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError("");
    setResendMsg("");
    try {
      const res = await fetch("/api/fastapi/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendMsg("Verification email resent. Please check your inbox.");
      } else {
        setError(data.detail || "Failed to resend. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setResending(false);
  };

  return (
    <OnboardingModalShell
      onClose={onBack}
      leftIcon={Mail}
      leftEyebrow="Live Intelligence"
      leftTitle="elevAIte pro"
      leftSubtitle="Email Verification"
      leftFooterItems={["Check your inbox", "Click the link we sent", "This tab will auto-advance"]}
      className="md:min-h-[510px]"
    >
      <div className="mx-auto w-full max-w-[360px]">
        <div className="mb-[5px] font-[var(--font-bricolage-grotesque)] text-[22px] font-extrabold tracking-[-0.025em] text-[var(--m05-indigo-900)]">
          Verify your email
        </div>
        <div className="mb-6 text-[13px] leading-[1.5] text-[var(--m05-muted)]">
          Intelligence suite activation
        </div>

        {/* Email confirmation box */}
        <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-4 flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100">
            <Mail className="h-4 w-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-indigo-800 mb-0.5">Verification email sent to:</p>
            <p className="text-[13px] font-bold text-indigo-900 break-all">{email}</p>
            <p className="mt-1 text-[11px] text-indigo-600 leading-relaxed">
              Click the link in the email — this tab will automatically advance to payment once verified.
            </p>
            <p className="mt-2 text-[10px] text-indigo-500 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time remaining: <strong>{formatTime(remainingMs)}</strong>
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Resend success */}
        {resendMsg && !error && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{resendMsg}</span>
          </div>
        )}

        {/* Primary CTA — manual check for users who already clicked the link */}
        <button
          type="button"
          disabled={checking}
          onClick={handleCheckVerification}
          className="m05-primary-btn mt-2"
        >
          {checking ? (
            <>
              <Loader2 className="h-[14px] w-[14px] animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-[14px] w-[14px]" />
              <span>I've verified — Continue</span>
            </>
          )}
        </button>

        {/* Resend link */}
        <button
          type="button"
          disabled={resending}
          onClick={handleResend}
          className="mt-3 flex w-full items-center justify-center gap-[5px] text-[12px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
        >
          {resending ? (
            <Loader2 className="h-[12px] w-[12px] animate-spin" />
          ) : (
            <RotateCcw className="h-[12px] w-[12px]" />
          )}
          Resend verification email
        </button>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 flex w-full items-center justify-center gap-[5px] text-[12px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
          >
            <ChevronLeft className="h-[12px] w-[12px]" />
            Return to previous step
          </button>
        )}
      </div>
    </OnboardingModalShell>
  );
};
