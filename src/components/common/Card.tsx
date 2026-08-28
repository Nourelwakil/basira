/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";
import { motion } from "motion/react";
import { ANIMATION_PRESETS } from "../../utils/constants";

interface CardProps {
  children: ReactNode;
  index?: number;
  hoverable?: boolean;
  className?: string;
}

export default function Card({
  children,
  index = 0,
  hoverable = true,
  className = "",
}: CardProps) {
  const defaultAnim = ANIMATION_PRESETS.card(index);

  return (
    <motion.div
      initial={defaultAnim.initial}
      animate={defaultAnim.animate}
      transition={defaultAnim.transition}
      whileHover={hoverable ? { y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" } : undefined}
      className={`bg-white border border-basira-border-default rounded-xl shadow-card p-6 overflow-hidden transition-colors ${className}`}
    >
      {children}
    </motion.div>
  );
}
