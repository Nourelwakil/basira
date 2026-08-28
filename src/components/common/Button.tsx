/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode, ButtonHTMLAttributes } from "react";
import { motion } from "motion/react";
import { ANIMATION_PRESETS } from "../../utils/constants";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: (e: any) => void;
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-sans font-medium rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-basira-primary focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none select-none";

  const variants = {
    primary: "bg-basira-primary text-white hover:bg-basira-primary-hover",
    outline:
      "border border-basira-border-default bg-white text-basira-text-body hover:bg-basira-bg-surface",
    ghost: "text-basira-text-body hover:bg-basira-bg-surface",
  };

  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={ANIMATION_PRESETS.buttonClick.transition}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}
