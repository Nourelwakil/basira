/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import Button from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  index?: number;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  children,
  index = 0,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="flex flex-col items-center justify-center p-12 text-center border border-basira-border-default bg-white rounded-xl shadow-card min-h-[300px]"
    >
      <div className="max-w-md flex flex-col items-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-basira-bg-surface border border-basira-border-subtle flex items-center justify-center text-basira-text-muted">
          <Icon className="w-8 h-8" strokeWidth={1.2} />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-sans text-[16px] font-medium text-basira-text-heading">
            {title}
          </h3>
          <p className="font-sans text-[14px] text-basira-text-muted leading-relaxed font-light">
            {description}
          </p>
        </div>

        {actionLabel && onAction && (
          <div className="pt-2">
            <Button variant="primary" size="md" onClick={onAction}>
              {actionLabel}
            </Button>
          </div>
        )}

        {children}
      </div>
    </motion.div>
  );
}
