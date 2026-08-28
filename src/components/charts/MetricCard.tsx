/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { useAnimatedCounter } from "../../hooks/useAnimatedCounter";

interface MetricCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string; // e.g. "12.4%"
  description?: string;
  delayIndex?: number;
}

export default function MetricCard({
  label,
  value,
  prefix = "",
  suffix = "",
  trend,
  trendValue,
  description,
  delayIndex = 0,
}: MetricCardProps) {
  const animatedValue = useAnimatedCounter(value, 800);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.05 }}
      whileHover={{ y: -2 }}
      className="bg-white border border-basira-border-default hover:border-basira-border-subtle p-6 rounded-xl hover:shadow-card transition-all duration-200 select-none flex flex-col justify-between"
    >
      <div className="space-y-1">
        <span className="font-sans text-[11px] text-[#94A3B8] font-medium uppercase tracking-wider">
          {label}
        </span>
        {description && (
          <p className="font-sans text-[11px] text-basira-text-muted font-light leading-snug">
            {description}
          </p>
        )}
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        {/* Modern 48px / font-light (300 weight equivalent) number display */}
        <span className="font-sans text-[44px] font-light text-basira-text-heading tracking-tight leading-none">
          {prefix}
          {animatedValue.toLocaleString()}
          {suffix}
        </span>

        {/* Dynamic Trend Indicators */}
        {trend && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
              trend === "up"
                ? "bg-emerald-50 text-emerald-600"
                : trend === "down"
                ? "bg-rose-50 text-rose-600"
                : "bg-slate-50 text-slate-500"
            }`}
          >
            {trend === "up" && <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />}
            {trend === "down" && <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.5} />}
            {trend === "neutral" && <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />}
            {trendValue && <span>{trendValue}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
