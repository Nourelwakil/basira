/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  Cloud,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";

export default function AuthGate() {
  const { loginWithGoogle } = useAuth();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogleAuth = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await loginWithGoogle();
      showToast("Signed in with Google successfully!", "success");
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMessage(
          err.message || "Failed to sign in with Google. Please try again."
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden selection:bg-blue-500 selection:text-white">
      {/* Background Lighting Meshes */}
      <div className="absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] rounded-full bg-indigo-600/10 blur-[130px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-2 select-none">
          <div className="inline-flex items-center justify-center w-14 h-14 mb-2">
            <img src="/logo-icon.png" alt="Basira" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center justify-center gap-2">
            <span>Basira</span>
            <span className="text-xs font-normal text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full bg-blue-500/10">
              NL2Vis AI
            </span>
          </h1>
          <p className="text-xs text-slate-400 font-light max-w-xs mx-auto leading-relaxed">
            Autonomous Natural Language to Visual Analytics System with dedicated per-account isolation.
          </p>
        </div>

        {/* Card Container */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-slate-800/85 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Card Title & Introduction */}
          <div className="space-y-1 text-center select-none">
            <h2 className="text-base font-semibold text-white font-sans">
              Sign In to Your Workspace
            </h2>
            <p className="text-xs text-slate-400 font-light">
              Connect with your Google account to access your private datasets and visualizations.
            </p>
          </div>

          {/* Privacy & Account Isolation Features */}
          <div className="p-3.5 bg-slate-900/70 border border-slate-700/60 rounded-xl space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <Lock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-200 text-[11px]">Strict Account Isolation</p>
                <p className="text-[10px] text-slate-400 font-light">
                  Each Google account operates in its own private sandbox. Other users cannot see or access your uploaded data.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-xs text-slate-300">
              <Cloud className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-200 text-[11px]">Cloud Synced Workspace</p>
                <p className="text-[10px] text-slate-400 font-light">
                  Your uploaded datasets, SQL history, and generated charts synchronize seamlessly across your devices.
                </p>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-red-300 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isSubmitting}
            id="auth-gate-google-signin-btn"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-100 text-slate-800 font-medium rounded-xl transition-all shadow-lg shadow-black/20 cursor-pointer disabled:opacity-50 text-xs font-sans group relative overflow-hidden"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            )}
            <span className="font-semibold text-slate-800">
              {isSubmitting ? "Connecting to Google..." : "Continue with Google"}
            </span>
          </button>
        </motion.div>

        {/* Footer Security Badge */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-[11px] select-none">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
          <span>Secured by Firebase Google OAuth & Rules</span>
        </div>
      </div>
    </div>
  );
}
