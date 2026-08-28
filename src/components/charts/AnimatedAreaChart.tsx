/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { motion } from "motion/react";
import {
  AreaChart as AreaIcon,
  Layers,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle2,
} from "lucide-react";
import { CHART_COLORS } from "../../utils/constants";
import {
  aggregateTimeSeriesData,
  calculateTimeSeriesMetrics,
  isDateColumn,
  TimeGranularity,
} from "../../utils/timeSeriesUtils";

interface AnimatedAreaChartProps {
  data: any[];
  xAxisKey: string;
  seriesKeys: string[];
  height?: number;
}

const formatNumber = (val: number): string => {
  if (isNaN(val) || val === null || val === undefined) return "0";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 1_000).toFixed(1)}k`;
  if (Math.abs(val) < 1 && val !== 0) return val.toFixed(2);
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1);
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-xs border border-slate-700/80 text-white p-3 rounded-xl shadow-xl font-sans text-xs select-none space-y-1.5 min-w-[180px] z-50">
        <div className="border-b border-slate-700/60 pb-1 flex items-center justify-between gap-2">
          <span className="font-semibold text-white truncate">{label}</span>
          <span className="text-[10px] text-slate-400 font-mono">Period</span>
        </div>
        <div className="space-y-1 pt-0.5">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.stroke || item.color }}
                />
                <span className="text-slate-300 font-light truncate">{item.name}:</span>
              </div>
              <span className="font-medium text-white font-mono shrink-0">
                {typeof item.value === "number" ? formatNumber(item.value) : item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export default function AnimatedAreaChart({
  data,
  xAxisKey,
  seriesKeys,
  height = 360,
}: AnimatedAreaChartProps) {
  const hasDateAxis = useMemo(() => isDateColumn(data, xAxisKey), [data, xAxisKey]);

  // Default to 'auto' granularity and exact dataset points (fillCompletePeriods = false)
  const [granularity, setGranularity] = useState<TimeGranularity>("auto");
  const [fillCompletePeriods, setFillCompletePeriods] = useState<boolean>(false);

  // Process and aggregate dataset based on selected granularity
  const { chartData } = useMemo(() => {
    if (!hasDateAxis) {
      return {
        chartData: data || [],
        effectiveGranularity: "raw" as TimeGranularity,
      };
    }

    const { aggregatedData, effectiveGranularity: effGran } = aggregateTimeSeriesData(
      data,
      xAxisKey,
      seriesKeys,
      granularity,
      fillCompletePeriods
    );

    return {
      chartData: aggregatedData,
      effectiveGranularity: effGran,
    };
  }, [data, xAxisKey, seriesKeys, granularity, fillCompletePeriods, hasDateAxis]);

  const primaryMetric = seriesKeys[0] || "Value";
  const isMultiSeries = seriesKeys.length > 1;

  // Calculate metrics
  const metrics = useMemo(() => {
    return calculateTimeSeriesMetrics(chartData, xAxisKey, primaryMetric);
  }, [chartData, xAxisKey, primaryMetric]);

  const pointCount = chartData ? chartData.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-3.5"
    >
      {/* Context Area Banner & Controls Toolbar */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-purple-50/70 border border-purple-100/90 rounded-xl text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-purple-200/80 shadow-2xs">
              <AreaIcon className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-slate-500 font-medium">Cumulative Volume:</span>
              <span className="font-semibold text-purple-700">{seriesKeys.join(", ")}</span>
              <span className="text-slate-400 text-[11px]">across</span>
              <span className="font-semibold text-slate-900">{xAxisKey}</span>
            </div>

            {/* Growth Rate / Trend indicator */}
            {metrics.growthPct !== null && (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium text-[11px] shadow-2xs border ${
                  metrics.direction === "up"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : metrics.direction === "down"
                    ? "bg-rose-50 text-rose-700 border-rose-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {metrics.direction === "up" ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : metrics.direction === "down" ? (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <Minus className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>
                  {metrics.growthPct > 0 ? `+${metrics.growthPct}%` : `${metrics.growthPct}%`} Trend
                </span>
              </div>
            )}
          </div>

          {/* Granularity & Full Period Controls */}
          {hasDateAxis && (
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-purple-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-medium uppercase px-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-purple-500" /> Timeline:
              </span>

              {(["monthly", "quarterly", "yearly", "weekly", "daily", "raw"] as TimeGranularity[]).map(
                (gran) => {
                  const isActive = granularity === gran;
                  const labelMap: Record<TimeGranularity, string> = {
                    monthly: "Full Months (Jan–Dec)",
                    quarterly: "Quarters (Q1–Q4)",
                    yearly: "Yearly",
                    weekly: "Weekly",
                    daily: "Daily",
                    raw: "Raw Dates",
                    auto: "Auto",
                  };

                  return (
                    <button
                      key={gran}
                      type="button"
                      onClick={() => setGranularity(gran)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        isActive
                          ? "bg-purple-600 text-white shadow-2xs font-semibold"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {labelMap[gran]}
                    </button>
                  );
                }
              )}

              {(granularity === "monthly" || granularity === "quarterly") && (
                <button
                  type="button"
                  onClick={() => setFillCompletePeriods(!fillCompletePeriods)}
                  title="Toggle between full annual cycle and active months only"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border cursor-pointer ml-1 ${
                    fillCompletePeriods
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-purple-600" />
                  <span>{fillCompletePeriods ? "Full Annual Cycle" : "Active Months Only"}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Secondary metric row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-purple-200/60 text-[11px] text-slate-600">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              <span>
                <strong className="text-slate-800 font-semibold">{pointCount}</strong>{" "}
                {hasDateAxis && granularity !== "raw"
                  ? `${granularity === "monthly" ? "monthly intervals (full cycle)" : `${granularity} intervals`}`
                  : "data points"}
              </span>
            </div>

            {metrics.total > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Cumulative Total:</span>
                <span className="font-semibold text-purple-900">{formatNumber(metrics.total)}</span>
              </div>
            )}

            {metrics.maxLabel && (
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-500">Peak:</span>
                <span className="font-semibold text-slate-800">
                  {metrics.maxLabel} ({formatNumber(metrics.maxVal)})
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Area Chart Canvas */}
      <div style={{ height: Math.max(height - 48, 280) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 25, bottom: 35 }}
          >
            <defs>
              {seriesKeys.map((key, index) => {
                const baseColor = CHART_COLORS[index % CHART_COLORS.length];
                const safeId = "grad-" + key.replace(/[^a-zA-Z0-9-_]/g, "");
                return (
                  <linearGradient key={safeId} id={safeId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={baseColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={baseColor} stopOpacity={0.02} />
                  </linearGradient>
                );
              })}
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              dy={8}
              interval={pointCount > 24 ? Math.ceil(pointCount / 12) : 0}
              tickFormatter={(value) => {
                if (!value) return "";
                const str = String(value);
                return str.length > 18 ? `${str.substring(0, 16)}...` : str;
              }}
              label={{
                value: hasDateAxis && granularity !== "raw" ? `${xAxisKey} (${granularity.charAt(0).toUpperCase() + granularity.slice(1)})` : xAxisKey,
                position: "insideBottom",
                offset: -20,
                fill: "#334155",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              width={75}
              dx={-8}
              tickFormatter={(value) => (typeof value === "number" ? formatNumber(value) : value)}
              label={{
                value: primaryMetric,
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fill: "#334155",
                fontSize: 12,
                fontWeight: 600,
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            {isMultiSeries && (
              <Legend
                verticalAlign="top"
                height={36}
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontFamily: "Inter, sans-serif" }}
              />
            )}

            {seriesKeys.map((key, sIdx) => {
              const color = CHART_COLORS[sIdx % CHART_COLORS.length];
              const safeGradId = "grad-" + key.replace(/[^a-zA-Z0-9-_]/g, "");
              return (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#${safeGradId})`}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                  animationBegin={sIdx * 150}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
