/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ShieldCheck,
  AlertCircle,
  Lock,
  Cloud,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../common/Toast";
import { ANIMATION_PRESETS } from "../../utils/constants";

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    loginWithGoogle,
  } = useAuth();
  const { showToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleGoogleAuth = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await loginWithGoogle();
      showToast("Signed in with Google successfully!", "success");
      closeAuthModal();
    } catch (err: any) {
      if (err.code !== "auth/popup-closed-by-user") {
        setErrorMessage(err.message || "Failed to sign in with Google. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={ANIMATION_PRESETS.modal.backdrop.initial}
          animate={ANIMATION_PRESETS.modal.backdrop.animate}
          exit={ANIMATION_PRESETS.modal.backdrop.exit}
          transition={{ duration: 0.2 }}
          onClick={closeAuthModal}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={ANIMATION_PRESETS.modal.content.initial}
          animate={ANIMATION_PRESETS.modal.content.animate}
          exit={ANIMATION_PRESETS.modal.content.exit}
          transition={ANIMATION_PRESETS.modal.content.transition}
          className="relative bg-white border border-basira-border-default rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header Bar */}
          <div className="p-5 border-b border-basira-border-subtle flex items-center justify-between bg-slate-50/50 select-none shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-basira-primary/10 flex items-center justify-center text-basira-primary">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-sans text-sm font-semibold text-basira-text-heading">
                  Sign In with Google
                </h2>
                <p className="font-sans text-[11px] text-basira-text-muted">
                  Connect your Google account to sync your private datasets
                </p>
              </div>
            </div>

            <button
              onClick={closeAuthModal}
              id="auth-modal-close-btn"
              className="text-basira-text-muted hover:text-basira-text-heading p-1.5 hover:bg-white rounded-lg border border-transparent hover:border-basira-border-default transition-all cursor-pointer"
              aria-label="Close authentication modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-5 font-sans text-xs">
            {/* Account Isolation Info */}
            <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5 text-slate-700">
                <Lock className="w-4 h-4 text-basira-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800 text-[11px]">Private Database Slice</p>
                  <p className="text-[11px] text-basira-text-muted font-light leading-relaxed">
                    Each user account is strictly isolated. Only you can view, query, and manage your uploaded files.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* 1-Click Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isSubmitting}
              id="auth-modal-google-btn"
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-slate-50 border border-basira-border-default text-slate-700 font-semibold rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 text-xs"
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
              <span>{isSubmitting ? "Connecting..." : "Continue with Google"}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
