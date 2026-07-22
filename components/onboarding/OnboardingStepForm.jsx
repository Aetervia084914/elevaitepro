"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Eye, EyeOff, AlertCircle, ArrowRight, ChevronLeft, Fingerprint, Zap, Loader2, RotateCcw, Clock, CheckCircle2 } from "lucide-react";
import { OnboardingModalShell } from "./OnboardingModalShell.jsx";

const CODE_TTL_SECONDS = 120;

export const OnboardingStepForm = ({
  isLoading = false,
  isReturning = false,
  formData = {},
  onChange,
  onSubmit,
  onBack,
  onProceedToPayment,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailError, setEmailError] = useState("");
  const debounceRef = useRef(null);

  const [forgotStep, setForgotStep] = useState(null);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Verification code state
  const [verifyPhase, setVerifyPhase] = useState("form"); // "form" | "code" | "verified"
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(CODE_TTL_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);
  const timerRef = useRef(null);

  async function checkEmail(email) {
    if (!email || email.length < 4 || !email.includes("@")) return;
    setCheckingEmail(true);
    setEmailStatus(null);
    setEmailError("");
    try {
      const res = await fetch("/api/validateemail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = res.ok ? await res.json() : { exists: false };
      if (isReturning) {
        if (data.exists) {
          setEmailStatus("exists");
          setEmailError("");
        } else {
          setEmailStatus("not-exist");
          setEmailError("Account not found. Please sign up.");
        }
      } else {
        if (data.exists) {
          setEmailStatus("exists");
          setEmailError("Account already exists. Please sign in.");
        } else {
          setEmailStatus("not-exist");
          setEmailError("");
        }
      }
    } catch {
      setEmailStatus("not-exist");
      setEmailError("");
    } finally {
      setCheckingEmail(false);
    }
  }

  useEffect(() => {
    if (formData.email && formData.email.length > 4) {
      checkEmail(formData.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEmailChange = (e) => {
    const value = e.target.value;
    onChange("email", value);
    setEmailStatus(null);
    setEmailError("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value || value.length < 4 || !value.includes("@")) return;
    debounceRef.current = setTimeout(() => checkEmail(value), 600);
  };

  const isPasswordDisabled =
    checkingEmail || (isReturning ? emailStatus === "not-exist" : emailStatus === "exists");
  const isSubmitDisabled =
    checkingEmail ||
    (isReturning
      ? emailStatus === "not-exist"
      : emailStatus === "exists" || !formData.consent);

  // Timer management
  const startTimer = useCallback(() => {
    setSecondsLeft(CODE_TTL_SECONDS);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Send verification code
  const handleSendCode = async () => {
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/fastapi/verification/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          name: formData.name?.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.detail || "Failed to send verification code.");
        return;
      }
      setSessionToken(data.session_token);
      setVerifyPhase("code");
      setVerifyCode("");
      startTimer();
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Verify the entered code
  const handleVerifyCode = async () => {
    if (!verifyCode.trim()) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/fastapi/verification/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          code: verifyCode.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSessionToken(data.session_token || sessionToken);
        setVerifyPhase("verified");
        setVerifyError("");
      } else {
        setVerifyError(data.message || "Invalid verification code.");
      }
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setVerifyLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    setResending(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/fastapi/verification/resend-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          name: formData.name?.trim() || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.detail || "Failed to resend code.");
        return;
      }
      setSessionToken(data.session_token);
      setVerifyCode("");
      startTimer();
    } catch {
      setVerifyError("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleForgotOpen = () => {
    setResetEmail(formData.email || "");
    setResetError("");
    setForgotStep("entry");
  };

  const handleForgotCancel = () => {
    setForgotStep(null);
    setResetError("");
  };

  const handleSendReset = async () => {
    if (!resetEmail) return;
    setResetLoading(true);
    setResetError("");
    try {
      const res = await fetch("/api/fastapi/forget_password/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResetError(data.detail || "Something went wrong. Please try again.");
      } else {
        setForgotStep("sent");
      }
    } catch {
      setResetError("Network error. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isReturning) {
      if (onSubmit) onSubmit(e);
      return;
    }

    // New user flow — send verification code instead of proceeding
    if (verifyPhase === "form") {
      handleSendCode();
    } else if (verifyPhase === "code") {
      handleVerifyCode();
    } else if (verifyPhase === "verified") {
      if (onProceedToPayment) {
        onProceedToPayment(sessionToken);
      }
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const buttonLabel = isReturning
    ? "Access Dashboard"
    : verifyPhase === "verified"
    ? "Proceed For Payment"
    : verifyPhase === "code"
    ? "Submit Code"
    : "Verify Your Email";

  const footerItems = [
    isReturning ? "Secure Access" : "Create Profile",
    verifyPhase === "verified" ? "Proceed For Payment" : "Verify Your Email",
    "return to previous step",
  ];

  return (
    <OnboardingModalShell
      onClose={onBack}
      leftIcon={isReturning ? Fingerprint : Zap}
      leftEyebrow="Live Intelligence"
      leftTitle="elevAIte pro"
      leftSubtitle="Intelligence suite activation"
      leftFooterItems={footerItems}
      className="md:min-h-[510px]"
    >
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[360px]">
        <div className="mb-1 font-[var(--font-bricolage-grotesque)] text-[18px] font-extrabold tracking-[-0.025em] text-[var(--m05-indigo-900)]">
          {isReturning ? "Secure Access" : "Create Profile"}
        </div>
        <div className="mb-4 text-[12px] leading-[1.4] text-[var(--m05-muted)]">
          Intelligence suite activation
        </div>

        {error && (
          <div className="mb-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Email */}
        <div className="mb-2">
          <input
            required
            type="email"
            value={formData.email || ""}
            onChange={handleEmailChange}
            placeholder="Email Address"
            className="m05-input"
            disabled={verifyPhase !== "form"}
          />
          {checkingEmail && (
            <div className="pt-0.5 text-xs tracking-tight text-[var(--m05-cyan-700)] animate-pulse">
              verifying...
            </div>
          )}
          {!checkingEmail && emailError && (
            <div className="pt-0.5 text-xs tracking-tight text-rose-500">
              {emailError}
            </div>
          )}
        </div>

        {/* New-user fields */}
        {!isReturning && (
          <div className="mb-2">
            <input
              required
              value={formData.name || ""}
              onChange={(e) => onChange("name", e.target.value)}
              placeholder="Full Name"
              className="m05-input disabled:opacity-50"
              disabled={emailStatus === "exists" || verifyPhase !== "form"}
            />
          </div>
        )}

        {!isReturning && (
          <div className="mb-2">
            <input
              required
              type="tel"
              value={formData.phone || ""}
              onChange={(e) => onChange("phone", e.target.value)}
              placeholder="Phone Number"
              className="m05-input disabled:opacity-50"
              disabled={emailStatus === "exists" || verifyPhase !== "form"}
            />
          </div>
        )}

        {/* Password / forgot-password flow */}
        {isReturning && forgotStep === "entry" ? (
          <div className="mb-2">
            <div className="mb-2 text-[12px] leading-[1.4] text-[var(--m05-muted)]">
              We'll send a reset link to your email: <strong>{resetEmail}</strong>
            </div>
            {resetError && (
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {resetError}
              </div>
            )}
          </div>
        ) : isReturning && forgotStep === "sent" ? (
          <div className="mb-2 text-[12px] leading-[1.4] text-[var(--m05-muted)]">
            Check your inbox — a reset link has been sent to{" "}
            <strong>{resetEmail}</strong>. It expires in 15 minutes.
          </div>
        ) : (
          <div className="relative mb-2">
            <input
              required
              type={showPassword ? "text" : "password"}
              value={formData.password || ""}
              onChange={(e) => onChange("password", e.target.value)}
              placeholder="Password"
              disabled={isPasswordDisabled || (!isReturning && verifyPhase !== "form")}
              className="m05-input pr-11 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-[13px] top-1/2 -translate-y-1/2 text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
            >
              {showPassword ? (
                <EyeOff className="h-[14px] w-[14px]" />
              ) : (
                <Eye className="h-[14px] w-[14px]" />
              )}
            </button>
          </div>
        )}

        {/* Forgot password trigger */}
        {isReturning && !forgotStep && (
          <button
            type="button"
            onClick={handleForgotOpen}
            className="mb-2 flex w-full items-center justify-center gap-1 text-[11px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
          >
            Forgot password?
          </button>
        )}

        {/* Consent checkbox — new users only, form phase only */}
        {!isReturning && verifyPhase === "form" && (
          <label className="mb-3 mt-1 flex items-start gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!formData.consent}
              onChange={(e) => onChange("consent", e.target.checked)}
              className="mt-0.5 h-[14px] w-[14px] flex-shrink-0 rounded border-[var(--m05-border)] accent-[var(--m05-indigo-700)]"
            />
            <span className="text-[10.5px] leading-[1.5] text-[var(--m05-muted)]">
              I consent to elevAIte pro storing my name, email and phone number to create my profile,
              and understand my CV analysis is generated from the CV I upload &mdash; results depend
              on the version I provide, and re-analysing a different or updated CV requires a new payment.
            </span>
          </label>
        )}

        {/* Verification Code Section — shown in "code" phase */}
        {!isReturning && verifyPhase === "code" && (
          <div className="mb-3">
            <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
              <p className="text-[12px] font-semibold text-indigo-800 mb-1">
                Verification code sent to:
              </p>
              <p className="text-[13px] font-bold text-indigo-900 break-all mb-2">
                {formData.email}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-indigo-600">
                <Clock className="h-3 w-3" />
                {secondsLeft > 0 ? (
                  <span>Code expires in: <strong>{formatTime(secondsLeft)}</strong></span>
                ) : (
                  <span className="text-rose-500 font-semibold">Code expired</span>
                )}
              </div>
            </div>

            <label className="block mb-1 text-[12px] font-semibold text-[var(--m05-indigo-900)]">
              Verification Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                setVerifyCode(val);
                setVerifyError("");
              }}
              placeholder="Enter 6-digit code"
              className="m05-input text-center text-[18px] font-bold tracking-[6px]"
              autoFocus
            />

            {verifyError && (
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {verifyError}
              </div>
            )}

            {/* Resend button — disabled until timer runs out */}
            <button
              type="button"
              disabled={!canResend || resending}
              onClick={handleResendCode}
              className="mt-2 flex w-full items-center justify-center gap-[5px] text-[11px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-[var(--m05-muted-light)] hover:text-[var(--m05-indigo-700)]"
            >
              {resending ? (
                <Loader2 className="h-[12px] w-[12px] animate-spin" />
              ) : (
                <RotateCcw className="h-[12px] w-[12px]" />
              )}
              {canResend ? "Resend Verification Code" : `Resend available in ${formatTime(secondsLeft)}`}
            </button>
          </div>
        )}

        {/* Verified success banner */}
        {!isReturning && verifyPhase === "verified" && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Email verified successfully. You may now proceed to payment.</span>
          </div>
        )}

        {/* Send reset link — forgot entry step only */}
        {isReturning && forgotStep === "entry" && (
          <button
            type="button"
            onClick={handleSendReset}
            disabled={resetLoading}
            className="m05-primary-btn mt-1.5"
          >
            <span>{resetLoading ? "Sending…" : "Send Reset Link"}</span>
            <ArrowRight className="h-[14px] w-[14px]" />
          </button>
        )}

        {/* Main submit — hidden while in forgot flow */}
        {(!isReturning || !forgotStep) && (
          <button
            type="submit"
            disabled={
              isSubmitDisabled ||
              isLoading ||
              verifyLoading ||
              (!isReturning && verifyPhase === "code" && (!verifyCode.trim() || verifyCode.length < 6))
            }
            className="m05-primary-btn mt-1.5"
          >
            {verifyLoading ? (
              <>
                <Loader2 className="h-[14px] w-[14px] animate-spin" />
                <span>{verifyPhase === "code" ? "Verifying…" : "Sending…"}</span>
              </>
            ) : (
              <>
                <span>{buttonLabel}</span>
                <ArrowRight className="h-[14px] w-[14px]" />
              </>
            )}
          </button>
        )}

        {/* Cancel / back-to-sign-in — inside forgot flow */}
        {isReturning && (forgotStep === "entry" || forgotStep === "sent") && (
          <button
            type="button"
            onClick={handleForgotCancel}
            className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
          >
            <ChevronLeft className="h-[12px] w-[12px]" />
            {forgotStep === "sent" ? "Back to Sign In" : "Cancel"}
          </button>
        )}

        {/* Back to previous step — hidden while in forgot flow */}
        {onBack && !forgotStep && (
          <button
            type="button"
            onClick={() => {
              if (verifyPhase === "code") {
                if (timerRef.current) clearInterval(timerRef.current);
                setVerifyPhase("form");
                setVerifyCode("");
                setVerifyError("");
                return;
              }
              onBack();
            }}
            className="mt-2 flex w-full items-center justify-center gap-1 text-[11px] text-[var(--m05-muted-light)] transition-colors hover:text-[var(--m05-indigo-700)]"
          >
            <ChevronLeft className="h-[12px] w-[12px]" />
            return to previous step
          </button>
        )}
      </form>
    </OnboardingModalShell>
  );
};
