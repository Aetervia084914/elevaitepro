"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [tokenStatus, setTokenStatus] = useState("loading"); // loading | valid | invalid
  const [email, setEmail] = useState("");
  const [tokenError, setTokenError] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("idle"); // idle | loading | success | error
  const [submitError, setSubmitError] = useState("");

  // Request new reset link states
  const [requestEmail, setRequestEmail] = useState("");
  const [requestStatus, setRequestStatus] = useState("idle"); // idle | loading | success | error
  const [requestMessage, setRequestMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setTokenStatus("invalid");
      setTokenError("No reset token provided. Please check your email link.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/fastapi/forget_password/verify-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (res.ok && data.valid) {
          setEmail(data.email);
          setTokenStatus("valid");
        } else {
          setTokenStatus("invalid");
          setTokenError(data.detail || "This reset link is invalid or expired.");
        }
      } catch {
        setTokenStatus("invalid");
        setTokenError("Network error. Please try again.");
      }
    }

    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSubmitError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setSubmitError("Password must be at least 6 characters.");
      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      const res = await fetch("/api/fastapi/forget_password/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitStatus("success");
      } else {
        setSubmitStatus("error");
        setSubmitError(data.detail || "Something went wrong. Please try again.");
      }
    } catch {
      setSubmitStatus("error");
      setSubmitError("Network error. Please try again.");
    }
  };

  const handleRequestNewLink = async (e) => {
    e.preventDefault();
    if (!requestEmail.trim()) {
      setRequestMessage("Please enter your email address.");
      setRequestStatus("error");
      return;
    }

    setRequestStatus("loading");
    setRequestMessage("");

    try {
      const res = await fetch("/api/fastapi/forget_password/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: requestEmail.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestStatus("success");
        setRequestMessage(data.message || "If this email is registered, a reset link has been sent.");
      } else {
        setRequestStatus("error");
        setRequestMessage(data.detail || "Something went wrong. Please try again.");
      }
    } catch {
      setRequestStatus("error");
      setRequestMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/50 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-8 py-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">elevAIte pro</h1>
            <p className="text-indigo-200 text-sm mt-1">Password Reset</p>
          </div>

          <div className="px-8 py-10">
            {tokenStatus === "loading" && (
              <div className="text-center space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                <p className="text-slate-600 font-medium">Verifying reset link…</p>
              </div>
            )}

            {tokenStatus === "invalid" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <XCircle className="w-9 h-9 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Link Invalid or Expired</h2>
                <p className="text-slate-600 text-sm leading-relaxed">{tokenError}</p>

                {requestStatus !== "success" ? (
                  <form onSubmit={handleRequestNewLink} className="mt-6 space-y-4">
                    <div>
                      <input
                        type="email"
                        required
                        placeholder="Enter your email"
                        value={requestEmail}
                        onChange={(e) => setRequestEmail(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {requestMessage && (
                      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                        requestStatus === "error" 
                          ? "border-rose-200 bg-rose-50 text-rose-600" 
                          : "border-blue-200 bg-blue-50 text-blue-600"
                      }`}>
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {requestMessage}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={requestStatus === "loading"}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                    >
                      {requestStatus === "loading" ? "Sending..." : "Send New Reset Link"}
                    </button>

                    <a
                      href="/#onboarding"
                      className="block text-center text-xs text-slate-400 hover:text-indigo-600 transition-colors mt-2"
                    >
                      Back to Sign In
                    </a>
                  </form>
                ) : (
                  <div className="mt-6 space-y-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <p className="text-slate-600 text-sm">{requestMessage}</p>
                    <p className="text-slate-500 text-xs">Please check your email for the reset link.</p>
                    <a
                      href="/#onboarding"
                      className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all"
                    >
                      Back to Sign In
                    </a>
                  </div>
                )}
              </div>
            )}

            {tokenStatus === "valid" && submitStatus !== "success" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Set a new password</h2>
                  {email && (
                    <p className="text-slate-500 text-sm">for {email}</p>
                  )}
                </div>

                {(submitStatus === "error" || submitError) && (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {submitError}
                  </div>
                )}

                <div className="relative">
                  <input
                    required
                    type={showNew ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    required
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitStatus === "loading"}
                  className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
                >
                  {submitStatus === "loading" ? "Updating…" : "Update Password"}
                </button>

                <a
                  href="/#onboarding"
                  className="block text-center text-xs text-slate-400 hover:text-indigo-600 transition-colors mt-2"
                >
                  Back to Sign In
                </a>
              </form>
            )}

            {submitStatus === "success" && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Password Updated!</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Your password has been changed successfully. You can now sign in with your new password.
                </p>
                <a
                  href="/#onboarding"
                  className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Back to Sign In
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
