/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { motion } from "motion/react";
import { PieChart as PieIcon, Layers, Award } from "lucide-react";
import { CHART_COLORS } from "../../utils/constants";

interface AnimatedPieChartProps {
  data: any[];
  nameKey: string;
  valueKey: string;
  height?: number;
}

const formatNumber = (val: number): string => {
  if (isNaN(val)) return "0";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 1_000).toFixed(2)}k`;
  if (Math.abs(val) < 1 && val !== 0) return val.toFixed(3);
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(2);
};

// Super precise percentage formatting without aggressive rounding up
export const formatExactPercentage = (val: number, total: number, maxDecimals: number = 3): string => {
  if (!total || isNaN(val) || isNaN(total) || total <= 0) return "0.00%";
  const rawPct = (val / total) * 100;
  
  // Format with high decimal precision (2 to 4 decimal places)
  const formatted = rawPct.toFixed(maxDecimals);
  // Strip unnecessary trailing zeroes after decimal point if cleanly matching
  const trimmed = formatted.includes(".") ? formatted.replace(/0+$/, "").replace(/\.$/, "") : formatted;
  // If it became a single integer or single decimal, ensure at least 2 decimal places for precision display
  if (!trimmed.includes(".")) {
    return `${trimmed}.00%`;
  }
  const parts = trimmed.split(".");
  if (parts[1].length < 2) {
    return `${parts[0]}.${parts[1]}0%`;
  }
  return `${trimmed}%`;
};

// Custom rendered label on pie slices showing exact high-precision percentage
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  // Show slice label for all meaningful slices (>= 2% of total)
  if (percent < 0.02) return null;

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const precisePct = formatExactPercentage(percent * 100, 100, 2);

  return (
    <g>
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono font-bold text-[10.5px] select-none pointer-events-none drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.85)]"
      >
        {precisePct}
      </text>
    </g>
  );
};

const CustomTooltip = ({ active, payload, totalSum, metricLabel }: any) => {
  if (active && payload && payload.length) {
    const dataObj = payload[0].payload;
    const value = typeof payload[0].value === "number" ? payload[0].value : 0;
    const precisePercentage = formatExactPercentage(value, totalSum, 4);

    return (
      <div className="bg-slate-900/95 backdrop-blur-xs border border-slate-700/80 text-white p-3.5 rounded-xl shadow-2xl font-sans text-xs select-none space-y-2 min-w-[190px]">
        <div className="border-b border-slate-700/60 pb-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 truncate">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: payload[0].fill || payload[0].color }}
            />
            <span className="font-semibold text-white truncate max-w-[150px]">
              {dataObj.name}
            </span>
          </div>
        </div>

        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-normal">
              {metricLabel || "Value"}:
            </span>
            <span className="font-mono font-bold text-white">
              {typeof value === "number" ? value.toLocaleString() : value}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400 font-normal">Precise Share:</span>
            <span className="font-mono font-extrabold text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded-md border border-indigo-800/60">
              {precisePercentage}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function AnimatedPieChart({
  data,
  nameKey,
  valueKey,
  height = 380,
}: AnimatedPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Clean data & compute proportions and metrics
  const { cleanedData, totalSum, topSegment, resolvedNameKey, resolvedValKey } = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        cleanedData: [],
        totalSum: 0,
        topSegment: null,
        resolvedNameKey: nameKey || "Category",
        resolvedValKey: valueKey || "Total",
      };
    }

    let activeNameKey = nameKey;
    let activeValKey = valueKey;

    const sample = data[0] || {};
    if (!activeNameKey || sample[activeNameKey] === undefined) {
      const textKey = Object.keys(sample).find((k) => typeof sample[k] === "string" && isNaN(Number(sample[k])));
      activeNameKey = textKey || Object.keys(sample)[0] || "Category";
    }

    if (!activeValKey || sample[activeValKey] === undefined) {
      const numKey = Object.keys(sample).find((k) => {
        const val = sample[k];
        if (typeof val === "number" && !isNaN(val)) return true;
        const num = Number(String(val).replace(/[$,%]/g, "").trim());
        return !isNaN(num) && String(val).trim() !== "";
      });
      activeValKey = numKey || "Value";
    }

    const cleaned = data
      .map((item) => {
        let name = item[activeNameKey];
        if (name === undefined || name === null || String(name).trim() === "") {
          name = "Other";
        }

        let val = item[activeValKey];
        let num = typeof val === "number" ? val : Number(String(val ?? "").replace(/[$,%]/g, "").trim());
        if (isNaN(num)) num = 0;

        return {
          name: String(name).trim(),
          value: Math.abs(num),
        };
      })
      .filter((item) => !isNaN(item.value) && item.value > 0);

    // Sort segments descending for clean hierarchy
    cleaned.sort((a, b) => b.value - a.value);

    const sum = cleaned.reduce((acc, curr) => acc + curr.value, 0);
    const top = cleaned.length > 0 ? cleaned[0] : null;

    return {
      cleanedData: cleaned,
      totalSum: sum,
      topSegment: top,
      resolvedNameKey: activeNameKey,
      resolvedValKey: activeValKey,
    };
  }, [data, nameKey, valueKey]);

  if (cleanedData.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center border border-dashed border-basira-border-default rounded-xl font-sans text-xs text-basira-text-muted select-none"
        style={{ height }}
      >
        No proportion metrics available to render
      </div>
    );
  }

  // Active or highlighted segment with super precise calculation
  const activeSegment = activeIndex !== null && cleanedData[activeIndex] ? cleanedData[activeIndex] : null;
  const activePct = activeSegment && totalSum > 0 ? formatExactPercentage(activeSegment.value, totalSum, 3) : null;
  const topPct = topSegment && totalSum > 0 ? formatExactPercentage(topSegment.value, totalSum, 3) : "0.00%";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-4"
    >
      {/* Informative Composition Header with exact percentage */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-indigo-50/70 border border-indigo-100/90 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200/80 shadow-xs">
            <PieIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-slate-600 font-medium">Breakdown:</span>
            <span className="font-semibold text-slate-900">{resolvedNameKey}</span>
            <span className="text-slate-400 text-[11px]">by</span>
            <span className="font-semibold text-indigo-700">{resolvedValKey}</span>
          </div>

          {topSegment && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200/80 shadow-xs">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-slate-600">Leading:</span>
              <span className="font-bold text-slate-900">{topSegment.name}</span>
              <span className="font-mono font-bold text-indigo-600">({topPct})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-indigo-900 font-mono text-[11px] font-medium">
          <Layers className="w-3.5 h-3.5 text-indigo-500" />
          <span>Total: {formatNumber(totalSum)}</span>
          <span className="text-indigo-300">|</span>
          <span>{cleanedData.length} categories</span>
        </div>
      </div>

      {/* Donut Chart with Dynamic Centered Context & Precise Decimals */}
      <div className="relative w-full flex items-center justify-center min-h-[300px]" style={{ height: Math.max(height - 60, 300) }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={cleanedData}
              cx="50%"
              cy="50%"
              innerRadius="56%"
              outerRadius="82%"
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              labelLine={false}
              label={renderCustomizedLabel}
              isAnimationActive={true}
              animationDuration={850}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {cleanedData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="transition-all duration-200 hover:opacity-90 cursor-pointer outline-none"
                  style={{
                    filter: activeIndex === index ? "drop-shadow(0px 4px 10px rgba(0,0,0,0.18))" : undefined,
                    transform: activeIndex === index ? "scale(1.025)" : "scale(1)",
                    transformOrigin: "center center",
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={
                <CustomTooltip
                  totalSum={totalSum}
                  metricLabel={resolvedValKey}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center Context Overlay Box inside Donut */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center px-2 py-1 max-w-[180px]">
            {activeSegment ? (
              <motion.div
                key={`active-${activeSegment.name}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-0.5"
              >
                <span className="block text-[10px] uppercase font-bold tracking-wider text-indigo-600 truncate">
                  {activeSegment.name}
                </span>
                <span className="block font-mono text-xl font-extrabold text-slate-900 tracking-tight">
                  {activePct}
                </span>
                <span className="block text-[11px] text-slate-500 font-mono">
                  {formatNumber(activeSegment.value)}
                </span>
              </motion.div>
            ) : (
              <div className="space-y-0.5">
                <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                  {resolvedValKey}
                </span>
                <span className="block font-mono text-lg font-bold text-slate-800">
                  {formatNumber(totalSum)}
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  100.00% Share
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Legend Grid Below Pie with Super Precise Percentages */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 border-t border-slate-100">
        {cleanedData.map((item, idx) => {
          const preciseShare = formatExactPercentage(item.value, totalSum, 2);
          const isSelected = activeIndex === idx;

          return (
            <button
              key={`legend-${idx}`}
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onMouseLeave={() => setActiveIndex(null)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                isSelected
                  ? "bg-indigo-50/90 font-semibold text-indigo-900 shadow-xs border border-indigo-200/80"
                  : "text-slate-600 hover:bg-slate-50 border border-transparent"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className="truncate max-w-[130px] font-medium">{item.name}</span>
              <span className="font-mono font-semibold text-indigo-600 text-[11px]">
                ({preciseShare})
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

