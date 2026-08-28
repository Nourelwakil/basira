/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { motion } from "motion/react";

interface QueryInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function QueryInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  isLoading = false,
}: QueryInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !disabled && !isLoading && value.trim()) {
      onSubmit();
    }
  };

  const isButtonDisabled = disabled || isLoading || !value.trim();

  return (
    <div className="relative flex items-center w-full">
      {/* Container with shadow and rounded styling */}
      <motion.div
        animate={isLoading ? { scale: [1, 1.01, 1] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="w-full flex items-center bg-white border border-basira-border-default hover:border-basira-border-subtle focus-within:border-basira-primary focus-within:ring-2 focus-within:ring-blue-105/10 rounded-xl shadow-card p-0.5 transition-all duration-200"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={disabled ? "Please upload or select an active dataset to start querying..." : "Ask anything about your data..."}
          className="w-full h-11 bg-transparent px-4 py-2.5 text-sm text-basira-text-heading font-light placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed select-text"
        />

        <motion.button
          whileTap={{ scale: isButtonDisabled ? 1 : 0.95 }}
          onClick={onSubmit}
          disabled={isButtonDisabled}
          className={`shrink-0 w-9 h-9 mr-1 rounded-lg flex items-center justify-center transition-all ${
            isButtonDisabled
              ? "bg-[#F1F5F9] text-[#94A3B8] cursor-not-allowed"
              : "bg-[#2563EB] text-white hover:bg-blue-700 hover:shadow-sm"
          }`}
        >
          <ArrowUp className={`w-4 h-4 ${isLoading ? "animate-bounce" : ""}`} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </div>
  );
}
