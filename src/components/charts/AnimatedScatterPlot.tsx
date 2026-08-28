/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface AnimatedScatterPlotProps {
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  categoryKey?: string;
  height?: number;
}

// Format numeric values with proper units (currency/percentage/large scale)
const formatValue = (val: any): string => {
  if (typeof val !== "number" || isNaN(val)) {
    const num = Number(val);
    if (isNaN(num)) return String(val ?? "");
    val = num;
  }
  if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 10_000) return `${(val / 1_000).toFixed(1)}k`;
  if (Math.abs(val) < 1 && val !== 0) return val.toFixed(2);
  return Number.isInteger(val) ? val.toLocaleString() : val.toFixed(1);
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0]?.payload || {};
    return (
      <div className="bg-slate-900/95 backdrop-blur-xs border border-slate-700/80 text-white p-3 rounded-xl shadow-xl font-sans text-xs select-none max-w-xs space-y-2">
        <div className="border-b border-slate-700/60 pb-1.5 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
            Bivariate Data Point
          </span>
          {dataPoint._category && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-blue-900/80 text-blue-200 border border-blue-700/50 font-medium truncate max-w-[120px]">
              {String(dataPoint._category)}
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {payload.map((item: any, idx: number) => {
            const label = item.name || item.dataKey || `Metric ${idx + 1}`;
            return (
              <div key={idx} className="flex items-center justify-between gap-4">
                <span className="text-slate-300 font-normal truncate max-w-[130px]">
                  {label}:
                </span>
                <span className="text-white font-mono font-medium shrink-0">
                  {typeof item.value === "number" ? item.value.toLocaleString() : item.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

// Safe helper to extract numeric value with case-insensitive column match
function extractNum(row: any, targetCol: string): number {
  if (!row || typeof row !== "object" || !targetCol) return NaN;
  let val = row[targetCol];
  if (val === undefined || val === null) {
    const lower = targetCol.toLowerCase().replace(/[\s_-]/g, "");
    const matchingKey = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/[\s_-]/g, "") === lower
    );
    if (matchingKey) val = row[matchingKey];
  }
  if (val === undefined || val === null || val === "") return NaN;
  if (typeof val === "number") return isNaN(val) ? NaN : val;
  const cleaned = String(val).trim().replace(/[$,%]/g, "");
  const num = Number(cleaned);
  return isNaN(num) ? NaN : num;
}

export default function AnimatedScatterPlot({
  data,
  xAxisKey,
  yAxisKey,
  categoryKey,
  height = 460,
}: AnimatedScatterPlotProps) {
  const [showTrendline, setShowTrendline] = useState(true);
  const [pointOpacity, setPointOpacity] = useState(0.55);

  if (!data || data.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-64 text-slate-400 font-sans text-xs">
        No records available for scatter plot correlation.
      </div>
    );
  }

  // Detect fallback keys if not explicitly provided
  const sampleRow = data[0] || {};
  const allKeys = Object.keys(sampleRow);
  const numericKeys = allKeys.filter((k) => {
    const num = extractNum(sampleRow, k);
    return !isNaN(num);
  });

  const resolvedXKey =
    xAxisKey && (sampleRow[xAxisKey] !== undefined || extractNum(sampleRow, xAxisKey))
      ? xAxisKey
      : numericKeys[0] || allKeys[0] || "x";

  const resolvedYKey =
    yAxisKey && yAxisKey !== resolvedXKey
      ? yAxisKey
      : numericKeys.find((k) => k !== resolvedXKey) || numericKeys[1] || allKeys[1] || "y";

  // Clean and map numeric values
  const allCleanedData = useMemo(() => {
    return data
      .map((item) => {
        const xVal = extractNum(item, resolvedXKey);
        const yVal = extractNum(item, resolvedYKey);
        return {
          ...item,
          [resolvedXKey]: xVal,
          [resolvedYKey]: yVal,
          _category: categoryKey ? item[categoryKey] : undefined,
        };
      })
      .filter((item) => !isNaN(item[resolvedXKey]) && !isNaN(item[resolvedYKey]));
  }, [data, resolvedXKey, resolvedYKey, categoryKey]);

  // If no points survived, fallback to prevent crash
  if (allCleanedData.length === 0) {
    return (
      <div className="w-full flex items-center justify-center h-64 text-slate-400 font-sans text-xs">
        Could not resolve numeric values for variables "{resolvedXKey}" and "{resolvedYKey}".
      </div>
    );
  }

  // Calculate Scientific Statistics (Pearson r, Slope, Intercept, Sample Size)
  const stats = useMemo(() => {
    const n = allCleanedData.length;
    if (n < 2) return null;

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
      const x = allCleanedData[i][resolvedXKey];
      const y = allCleanedData[i][resolvedYKey];
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    }

    const meanX = sumX / n;
    const meanY = sumY / n;

    const numerator = sumXY - n * meanX * meanY;
    const denominatorX = sumX2 - n * meanX * meanX;
    const denominatorY = sumY2 - n * meanY * meanY;
    const denominator = Math.sqrt(denominatorX * denominatorY);

    const r = denominator !== 0 ? numerator / denominator : 0;
    const slope = denominatorX !== 0 ? numerator / denominatorX : 0;
    const intercept = meanY - slope * meanX;

    let strength = "No Correlation";
    const absR = Math.abs(r);
    if (absR >= 0.7) strength = r > 0 ? "Strong Positive" : "Strong Negative";
    else if (absR >= 0.4) strength = r > 0 ? "Moderate Positive" : "Moderate Negative";
    else if (absR >= 0.15) strength = r > 0 ? "Weak Positive" : "Weak Negative";

    return {
      n,
      r: Number(r.toFixed(4)),
      rawR: r,
      slope,
      intercept,
      strength,
      rSquared: Number((r * r).toFixed(4)),
      varianceExplained: ((r * r) * 100).toFixed(2),
      formattedEquation: `ŷ = ${slope >= 0 ? "" : "-"}${Math.abs(slope).toFixed(3)}x ${intercept >= 0 ? "+" : "-"} ${Math.abs(intercept).toFixed(2)}`,
    };
  }, [allCleanedData, resolvedXKey, resolvedYKey]);

  // For rendering display: downsample if extremely dense (> 600 points) to maintain high performance
  const displayData = useMemo(() => {
    if (allCleanedData.length <= 600) return allCleanedData;
    const step = Math.ceil(allCleanedData.length / 600);
    return allCleanedData.filter((_, idx) => idx % step === 0);
  }, [allCleanedData]);

  // Compute adaptive bounds for accurate scaling
  const xValues = allCleanedData.map((d) => d[resolvedXKey]);
  const yValues = allCleanedData.map((d) => d[resolvedYKey]);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  const calculateDomain = (min: number, max: number): [number, number] => {
    if (!isFinite(min) || !isFinite(max)) return [0, 100];
    if (min === max) {
      return [min > 0 ? min * 0.8 : min - 1, max > 0 ? max * 1.2 : max + 1];
    }
    const range = max - min;
    const padding = range * 0.08; // 8% breathing room
    let calculatedMin = min - padding;
    let calculatedMax = max + padding;

    // If non-negative and close to zero, keep clean zero start
    if (min >= 0 && calculatedMin < 0 && min / (range || 1) < 0.25) {
      calculatedMin = 0;
    }

    return [
      Math.abs(calculatedMin) < 1 && calculatedMin !== 0
        ? Number(calculatedMin.toFixed(3))
        : Number(calculatedMin.toFixed(1)),
      Math.abs(calculatedMax) < 1 && calculatedMax !== 0
        ? Number(calculatedMax.toFixed(3))
        : Number(calculatedMax.toFixed(1)),
    ];
  };

  const xDomain = calculateDomain(minX, maxX);
  const yDomain = calculateDomain(minY, maxY);

  // Compute trendline 2 endpoints for linear fit
  const trendlinePoints = useMemo(() => {
    if (!stats || !showTrendline) return [];
    const x1 = minX;
    const y1 = stats.slope * x1 + stats.intercept;
    const x2 = maxX;
    const y2 = stats.slope * x2 + stats.intercept;

    return [
      { [resolvedXKey]: x1, [resolvedYKey]: y1, _isTrendline: true },
      { [resolvedXKey]: x2, [resolvedYKey]: y2, _isTrendline: true },
    ];
  }, [stats, showTrendline, minX, maxX, resolvedXKey, resolvedYKey]);

  // Zero reference line visibility check
  const hasZeroCross = minY < 0 && maxY > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-4"
    >
      {/* Comprehensive Correlation Analytics Header */}
      {stats && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50/90 border border-slate-200 rounded-xl text-xs shadow-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Pearson Coefficient Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
              <span className="text-slate-500 font-medium">Pearson</span>
              <span className="font-mono font-extrabold text-slate-900 text-sm">
                r = {stats.r > 0 ? `+${stats.r}` : stats.r}
              </span>
            </div>

            {/* Strength Pill */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold border ${
                stats.rawR > 0.15
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : stats.rawR < -0.15
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              {stats.rawR > 0.15 ? (
                <TrendingUp className="w-4 h-4" />
              ) : stats.rawR < -0.15 ? (
                <TrendingDown className="w-4 h-4" />
              ) : (
                <Minus className="w-4 h-4" />
              )}
              <span>{stats.strength}</span>
            </div>

            {/* R-Squared Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs">
              <span className="text-slate-400 font-medium">R² =</span>
              <span className="font-mono font-bold text-slate-900">{stats.rSquared}</span>
              <span className="text-slate-400 text-[11px]">({stats.varianceExplained}% var)</span>
            </div>

            {/* Regression Model Formula */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-50/70 border border-indigo-200/80 text-indigo-900 font-mono text-[11px] font-semibold">
              <span>Model:</span>
              <span className="text-indigo-700">{stats.formattedEquation}</span>
            </div>
          </div>

          {/* Interactive Scatter Action Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTrendline(!showTrendline)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer shadow-xs active:scale-95 ${
                showTrendline
                  ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {showTrendline ? "✓ OLS Trendline" : "+ Show Trendline"}
            </button>

            <button
              type="button"
              onClick={() => setPointOpacity(pointOpacity === 0.55 ? 0.85 : 0.55)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Toggle Point Density Shading"
            >
              {pointOpacity === 0.55 ? "Density: Medium" : "Density: High"}
            </button>
          </div>
        </div>
      )}

      {/* Main Scatter Canvas with Full Spacious View */}
      <div style={{ height: Math.max(height - 40, 420) }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 35, left: 35, bottom: 45 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={true} horizontal={true} />

            {/* Zero Reference Line for Profit/Loss or Negative Crossings */}
            {hasZeroCross && (
              <ReferenceLine
                y={0}
                stroke="#64748B"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: "Zero Baseline (y = 0)",
                  position: "insideTopRight",
                  fill: "#64748B",
                  fontSize: 10,
                }}
              />
            )}

            <XAxis
              type="number"
              dataKey={resolvedXKey}
              name={resolvedXKey}
              domain={xDomain}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              dy={10}
              tickFormatter={formatValue}
              label={{
                value: resolvedXKey,
                position: "insideBottom",
                offset: -25,
                fill: "#1E293B",
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <YAxis
              type="number"
              dataKey={resolvedYKey}
              name={resolvedYKey}
              domain={yDomain}
              stroke="#64748B"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              width={85}
              dx={-10}
              tickFormatter={formatValue}
              label={{
                value: resolvedYKey,
                angle: -90,
                position: "insideLeft",
                offset: -12,
                fill: "#1E293B",
                fontSize: 12,
                fontWeight: 600,
                style: { textAnchor: "middle" },
              }}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3", stroke: "#94A3B8", strokeWidth: 1 }}
            />

            {/* Primary Scatter Points with Alpha Blending for Density */}
            <Scatter
              name={`${resolvedXKey} vs ${resolvedYKey}`}
              data={displayData}
              fill="#2563EB"
              isAnimationActive={true}
              animationDuration={500}
              animationEasing="ease-out"
            >
              {displayData.map((item, index) => {
                const isLoss = hasZeroCross && item[resolvedYKey] < 0;
                return (
                  <Cell
                    key={`scatter-cell-${index}`}
                    fill={isLoss ? "#E11D48" : "#2563EB"}
                    fillOpacity={pointOpacity}
                    stroke={isLoss ? "#9F1239" : "#1D4ED8"}
                    strokeWidth={1}
                    className="transition-all duration-150 hover:scale-150 cursor-pointer"
                  />
                );
              })}
            </Scatter>

            {/* Scientific Best-Fit Linear Regression Trendline */}
            {showTrendline && trendlinePoints.length === 2 && (
              <Scatter
                name="Linear Regression"
                data={trendlinePoints}
                line={{ stroke: "#DC2626", strokeWidth: 2.5, strokeDasharray: "5 5" }}
                shape={() => null}
                legendType="none"
                isAnimationActive={false}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Correlation Interpretation & Diagnostics Card */}
      {stats && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Info className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Correlation Interpretation:</span>
          </div>
          <p className="leading-relaxed text-slate-600">
            There is a <strong className="text-slate-900">{stats.strength.toLowerCase()}</strong> linear relationship (<span className="font-mono font-semibold text-slate-800">r = {stats.r}</span>) across <strong className="font-mono text-slate-800">{stats.n.toLocaleString()}</strong> data points. 
            On average, each 1-unit increase in <strong className="text-slate-800">{resolvedXKey}</strong> is associated with an expected <strong className="text-slate-800">{stats.slope >= 0 ? `+${stats.slope.toFixed(3)}` : stats.slope.toFixed(3)}</strong> change in <strong className="text-slate-800">{resolvedYKey}</strong>.
          </p>
        </div>
      )}
    </motion.div>
  );
}

