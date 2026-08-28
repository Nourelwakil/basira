/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";

type BadgeType = "number" | "text" | "date" | "chart" | "default";

interface BadgeProps {
  children: string | number;
  type?: BadgeType;
  className?: string;
}

export default function Badge({ children, type = "default", className = "" }: BadgeProps) {
  const styles = {
    number: "bg-basira-primary-light text-basira-primary border border-blue-100",
    text: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    date: "bg-amber-50 text-amber-600 border border-amber-100",
    chart: "bg-purple-50 text-purple-600 border border-purple-100",
    default: "bg-basira-bg-surface text-basira-text-body border border-basira-border-default",
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-sans font-medium select-none capitalize ${styles[type]} ${className}`}
    >
      {children}
    </motion.span>
  );
}
