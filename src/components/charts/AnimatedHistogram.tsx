/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { motion } from "motion/react";
import { Activity, BarChart2, Info } from "lucide-react";

interface AnimatedHistogramProps {
  data: any[]; // Can be pre-bucketed [{ bin: string, count: number }] or raw data list
  valueKey?: string; // If raw data, key specifying which numeric property to bucket
  height?: number;
}

const formatNumber = (val: number): string => {
  if (isNaN(val)) return "0";
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 1_000).toFixed(1)}k`;
  if (Math.abs(val) < 1 && val !== 0) return val.toFixed(2);
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataObj = payload[0].payload;
    return (
      <div className="bg-slate-900/95 backdrop-blur-xs border border-slate-700/80 text-white p-3 rounded-xl shadow-xl font-sans text-xs select-none space-y-1.5 min-w-[150px]">
        <div className="border-b border-slate-700/60 pb-1 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Bin Interval
          </span>
          <span className="text-white font-mono font-medium">
            {dataObj.bin}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 pt-0.5">
          <span className="text-slate-300 font-normal">Record Count:</span>
          <span className="font-mono font-bold text-amber-400">
            {dataObj.count.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Safe helper to extract numeric value
function extractNum(row: any, targetCol?: string): number {
  if (!row || typeof row !== "object") return NaN;
  if (targetCol && row[targetCol] !== undefined && row[targetCol] !== null && row[targetCol] !== "") {
    const val = row[targetCol];
    if (typeof val === "number") return isNaN(val) ? NaN : val;
    const num = Number(String(val).trim().replace(/[$,%]/g, ""));
    return isNaN(num) ? NaN : num;
  }
  // If targetCol not found or not passed, look for first numeric value
  for (const key of Object.keys(row)) {
    const val = row[key];
    if (typeof val === "number" && !isNaN(val)) return val;
    if (typeof val === "string") {
      const num = Number(val.trim().replace(/[$,%]/g, ""));
      if (!isNaN(num)) return num;
    }
  }
  return NaN;
}

export default function AnimatedHistogram({
  data,
  valueKey,
  height = 340,
}: AnimatedHistogramProps) {
  // Resolve numeric column and compute buckets
  const { bucketedData, stats, resolvedKey } = useMemo(() => {
    if (!data || data.length === 0) {
      return { bucketedData: [], stats: null, resolvedKey: valueKey || "" };
    }

    // Check if pre-bucketed
    if (data[0] && (data[0].bin !== undefined || data[0].range !== undefined)) {
      const bucketed = data.map((item) => ({
        bin: String(item.bin || item.range || ""),
        count: Number(item.count || item.frequency || 0),
      }));
      return { bucketedData: bucketed, stats: null, resolvedKey: valueKey || "Frequency" };
    }

    // Find valid key
    const sampleRow = data[0] || {};
    let activeKey = valueKey;
    if (!activeKey || sampleRow[activeKey] === undefined) {
      const numericKey = Object.keys(sampleRow).find((k) => !isNaN(extractNum(sampleRow, k)));
      activeKey = numericKey || activeKey || "Value";
    }

    // Extract all numeric values
    const rawValues: number[] = [];
    data.forEach((item) => {
      const val = extractNum(item, activeKey);
      if (!isNaN(val)) rawValues.push(val);
    });

    if (rawValues.length === 0) {
      return { bucketedData: [], stats: null, resolvedKey: activeKey };
    }

    // Calculate Summary Statistics
    rawValues.sort((a, b) => a - b);
    const n = rawValues.length;
    const sum = rawValues.reduce((acc, v) => acc + v, 0);
    const mean = sum / n;
    const median = n % 2 === 0 ? (rawValues[n / 2 - 1] + rawValues[n / 2]) / 2 : rawValues[Math.floor(n / 2)];
    const variance = rawValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const min = rawValues[0];
    const max = rawValues[n - 1];
    const range = max - min;

    // Use Sturges' rule / Scott's rule for clean bins (between 6 and 12)
    const binCount = Math.max(6, Math.min(12, Math.ceil(1 + 3.322 * Math.log10(n))));
    const binWidth = range === 0 ? 1 : range / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * binWidth;
      const end = start + binWidth;
      const binLabel = `${formatNumber(start)} - ${formatNumber(end)}`;
      return {
        start,
        end,
        bin: binLabel,
        count: 0,
      };
    });

    // Populate bins
    rawValues.forEach((v) => {
      let allocatedIdx = Math.floor((v - min) / binWidth);
      if (allocatedIdx >= binCount) {
        allocatedIdx = binCount - 1;
      }
      if (bins[allocatedIdx]) {
        bins[allocatedIdx].count += 1;
      }
    });

    return {
      bucketedData: bins,
      stats: {
        n,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        min,
        max,
      },
      resolvedKey: activeKey,
    };
  }, [data, valueKey]);

  if (bucketedData.length === 0) {
    return (
      <div
        className="w-full flex items-center justify-center border border-dashed border-basira-border-default rounded-xl font-sans text-xs text-basira-text-muted select-none"
        style={{ height }}
      >
        No numerical distribution data available to render.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-3"
    >
      {/* Statistical Summary Bar */}
      {stats && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 bg-amber-50/60 border border-amber-200/70 rounded-xl text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 shadow-xs">
              <BarChart2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-slate-600 font-medium">Variable:</span>
              <span className="font-semibold text-slate-900">{resolvedKey}</span>
            </div>

            <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white border border-amber-200 shadow-xs font-mono text-[11px]">
              <span className="text-slate-500">Mean:</span>
              <span className="font-bold text-slate-800">{formatNumber(stats.mean)}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Median:</span>
              <span className="font-bold text-slate-800">{formatNumber(stats.median)}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">Std Dev (σ):</span>
              <span className="font-bold text-slate-800">{formatNumber(stats.stdDev)}</span>
            </div>
          </div>

          <span className="text-amber-800 font-mono text-[11px] font-medium">
            N = {stats.n.toLocaleString()} observations
          </span>
        </div>
      )}

      {/* Histogram Chart Canvas */}
      <div style={{ height: height - 40 }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bucketedData}
            margin={{ top: 15, right: 20, left: 20, bottom: 35 }}
            barCategoryGap={2}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="bin"
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              dy={8}
              label={{
                value: `${resolvedKey} (Bin Interval)`,
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
              tickFormatter={(value) => (typeof value === "number" ? value.toLocaleString() : value)}
              label={{
                value: "Frequency (Records)",
                angle: -90,
                position: "insideLeft",
                offset: -10,
                fill: "#334155",
                fontSize: 12,
                fontWeight: 600,
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#FEF3C7", opacity: 0.4 }} />
            <Bar
              dataKey="count"
              radius={[3, 3, 0, 0]}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            >
              {bucketedData.map((_, index) => (
                <Cell
                  key={`hist-cell-${index}`}
                  fill="#D97706"
                  fillOpacity={0.85}
                  stroke="#B45309"
                  strokeWidth={1}
                  className="transition-all duration-200 hover:opacity-100 hover:brightness-110 cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Scientific Footnote */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 px-1">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span>
          Histogram uses Sturges' rule to compute uniform bin intervals across the distribution.
        </span>
      </div>
    </motion.div>
  );
}

