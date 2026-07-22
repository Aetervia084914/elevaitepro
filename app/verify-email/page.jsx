"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | already_verified | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  // After verification succeeds, redirect to the onboarding payment step.
  useEffect(() => {
    if (status !== "success" && status !== "already_verified") return;

    const timer = setTimeout(() => {
      const emailParam = encodeURIComponent(email || "");
      window.location.href = emailParam
        ? `/?onboarding=true&step=4&email=${emailParam}`
        : "/";
    }, 1800);

    return () => clearTimeout(timer);
  }, [status, email]);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided. Please check your email link.");
      return;
    }

    async function verifyEmail() {
      try {
        const res = await fetch("/api/fastapi/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setEmail(data.email || "");
          if (data.message?.includes("already verified")) {
            setStatus("already_verified");
          } else {
            setStatus("success");
          }
          setMessage(data.message);
        } else {
          setStatus("error");
          setMessage(data.detail || data.message || "Verification failed. The link may have expired.");
        }
      } catch {
        setStatus("error");
        setMessage("Network error. Please try again.");
      }
    }

    verifyEmail();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] border border-white/50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-8 py-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">elevAIte pro</h1>
            <p className="text-indigo-200 text-sm mt-1">Email Verification</p>
          </div>

          {/* Content */}
          <div className="px-8 py-10 text-center">
            {status === "loading" && (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" />
                <p className="text-slate-600 font-medium">Verifying your email...</p>
              </div>
            )}

            {(status === "success" || status === "already_verified") && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {status === "already_verified" ? "Already Verified" : "Email Verified!"}
                </h2>
                <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
                {email && (
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3" /> {email}
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Redirecting you to complete payment…
                </p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-4">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <XCircle className="w-9 h-9 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Verification Failed</h2>
                <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
                <a
                  href="/"
                  className="inline-block mt-4 px-6 py-3 bg-gradient-to-r from-slate-600 to-slate-700 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Back to Home
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
