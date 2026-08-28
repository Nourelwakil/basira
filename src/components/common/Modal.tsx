/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { ANIMATION_PRESETS } from "../../utils/constants";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={ANIMATION_PRESETS.modal.backdrop.initial}
            animate={ANIMATION_PRESETS.modal.backdrop.animate}
            exit={ANIMATION_PRESETS.modal.backdrop.exit}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={ANIMATION_PRESETS.modal.content.initial}
            animate={ANIMATION_PRESETS.modal.content.animate}
            exit={ANIMATION_PRESETS.modal.content.exit}
            transition={ANIMATION_PRESETS.modal.content.transition}
            className="relative bg-white border border-basira-border-default rounded-xl w-full max-w-md shadow-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="h-14 border-b border-basira-border-subtle px-5 flex items-center justify-between select-none shrink-0">
              <h2 className="font-sans text-sm font-medium text-basira-text-heading">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="text-basira-text-muted hover:text-basira-text-body p-1 hover:bg-basira-bg-surface rounded-lg transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable Contents */}
            <div className="p-6 overflow-y-auto flex-1 font-sans text-xs text-basira-text-body font-light leading-relaxed">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
