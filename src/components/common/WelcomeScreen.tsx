/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from "react";
import { motion } from "motion/react";

interface WelcomeScreenProps {
  onFinished: () => void;
  /** Total time the screen is shown before automatically transitioning, in ms. */
  durationMs?: number;
}

/**
 * A short, minimal branded intro shown once before the login screen.
 *
 * Deliberately restrained: a logo fade-in with a slight scale-up, the
 * wordmark fading/sliding in beneath it shortly after, then an automatic
 * fade-out into AuthGate. No bouncing, no large motion, no looping
 * animation, matching the "premium, not playful" direction requested.
 */
export default function WelcomeScreen({ onFinished, durationMs = 2200 }: WelcomeScreenProps) {
  useEffect(() => {
    const timer = setTimeout(onFinished, durationMs);
    return () => clearTimeout(timer);
  }, [onFinished, durationMs]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
      className="min-h-screen bg-slate-900 flex flex-col items-center justify-center select-none"
    >
      <motion.img
        src="/logo-icon.png"
        alt="Basira"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="w-16 h-16 object-contain"
      />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut", delay: 0.5 }}
        className="mt-5 text-white text-lg font-medium tracking-tight font-sans"
      >
        Welcome to Basira
      </motion.p>
    </motion.div>
  );
}
