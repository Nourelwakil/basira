/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import { motion } from "motion/react";
import { BarChart3, Layers, Calendar, CheckCircle2 } from "lucide-react";
import { CHART_COLORS } from "../../utils/constants";
import {
  aggregateTimeSeriesData,
  isDateColumn,
  TimeGranularity,
} from "../../utils/timeSeriesUtils";

interface AnimatedBarChartProps {
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
      <div className="bg-slate-900/95 backdrop-blur-xs border border-slate-700/80 text-white p-3 rounded-xl shadow-xl font-sans text-xs select-none space-y-1.5 min-w-[160px] z-50">
        <div className="border-b border-slate-700/60 pb-1 flex items-center justify-between gap-2">
          <span className="font-semibold text-white truncate">{label}</span>
        </div>
        <div className="space-y-1 pt-0.5">
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.fill || item.color }} />
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

export default function AnimatedBarChart({
  data,
  xAxisKey,
  seriesKeys,
  height = 360,
}: AnimatedBarChartProps) {
  const hasDateAxis = useMemo(() => isDateColumn(data, xAxisKey), [data, xAxisKey]);

  // If date axis, default to monthly with full periods
  const [granularity, setGranularity] = useState<TimeGranularity>("monthly");
  const [fillCompletePeriods, setFillCompletePeriods] = useState<boolean>(true);

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

  const isSingleSeries = seriesKeys.length === 1;
  const primaryMetric = seriesKeys.join(", ");
  const rowCount = chartData ? chartData.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-3.5"
    >
      {/* Context Comparison Banner */}
      <div className="flex flex-col gap-2.5 p-3.5 bg-blue-50/70 border border-blue-100/90 rounded-xl text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200/80 shadow-2xs">
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-slate-600 font-medium">Comparing:</span>
              <span className="font-semibold text-blue-700">{primaryMetric}</span>
              <span className="text-slate-400 text-[11px]">across</span>
              <span className="font-semibold text-slate-900">{xAxisKey}</span>
            </div>
          </div>

          {/* Granularity controls if temporal */}
          {hasDateAxis && (
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-blue-200 shadow-2xs">
              <span className="text-[10px] text-slate-400 font-medium uppercase px-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-500" /> Timeline:
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
                          ? "bg-blue-600 text-white shadow-2xs font-semibold"
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
                  title="Toggle between full 12-month / 4-quarter cycle and active months only"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors border cursor-pointer ml-1 ${
                    fillCompletePeriods
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>{fillCompletePeriods ? "Full Annual Cycle" : "Active Months Only"}</span>
                </button>
              )}
            </div>
          )}

          {!hasDateAxis && (
            <div className="flex items-center gap-2 text-blue-900 font-mono text-[11px] font-medium">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              <span>{rowCount} categories</span>
            </div>
          )}
        </div>

        {hasDateAxis && (
          <div className="flex items-center gap-2 text-blue-900 font-mono text-[11px] font-medium pt-1 border-t border-blue-100">
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            <span>
              {rowCount} {granularity === "monthly" ? "monthly periods (full cycle)" : `${granularity} periods`}
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart Canvas */}
      <div style={{ height: Math.max(height - 48, 280) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 25, bottom: 35 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey={xAxisKey}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              dy={8}
              interval={rowCount > 24 ? Math.ceil(rowCount / 12) : 0}
              tickFormatter={(value) =>
                value && String(value).length > 16
                  ? `${String(value).substring(0, 14)}...`
                  : String(value ?? "")
              }
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
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#F8FAFC" }} />
            {!isSingleSeries && (
              <Legend
                verticalAlign="top"
                height={36}
                iconSize={8}
                iconType="circle"
                wrapperStyle={{ fontSize: 11, fontFamily: "Inter, sans-serif" }}
              />
            )}

            {seriesKeys.map((key, sIdx) => (
              <Bar
                key={key}
                dataKey={key}
                radius={[4, 4, 0, 0]}
                maxBarSize={45}
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={sIdx * 150}
                fill={CHART_COLORS[sIdx % CHART_COLORS.length]}
              >
                {isSingleSeries &&
                  chartData.map((_, entryIdx) => (
                    <Cell
                      key={`cell-${entryIdx}`}
                      fill={CHART_COLORS[entryIdx % CHART_COLORS.length]}
                      className="transition-all duration-300 hover:opacity-85"
                    />
                  ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
