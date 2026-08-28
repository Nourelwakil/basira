/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, ErrorInfo, ReactNode } from "react";
import AnimatedBarChart from "./AnimatedBarChart";
import AnimatedLineChart from "./AnimatedLineChart";
import AnimatedPieChart from "./AnimatedPieChart";
import AnimatedScatterPlot from "./AnimatedScatterPlot";
import AnimatedHistogram from "./AnimatedHistogram";
import AnimatedAreaChart from "./AnimatedAreaChart";
import DataTable from "./DataTable";
import MetricCard from "./MetricCard";
import { AlertCircle, RefreshCw } from "lucide-react";

// Robust Class-Based Error Boundary supporting runtime charting crashes
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ChartErrorBoundary caught a rendering crash:", error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-dashed border-red-200 bg-red-50/50 rounded-xl text-center select-none space-y-3.5">
          <div className="w-10 h-10 rounded-full bg-red-100/80 text-red-650 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-red-500" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h4 className="font-sans text-[13px] font-medium text-red-800">
              Visualization Render Exception
            </h4>
            <p className="font-sans text-[11px] text-red-600 font-light max-w-md mx-auto leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred compiling Recharts nodes."}{" "}
              Please verify your dataset dimensions or choose a different visualization style.
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-250 text-red-700 hover:bg-red-50 font-sans text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Retry Rendering</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface ChartRendererProps {
  chartType: "bar" | "line" | "pie" | "scatter" | "histogram" | "area" | "table" | "metric" | "none";
  data: any[];
  xAxisKey?: string;
  seriesKeys?: string[];
  yAxisKey?: string;
  valueKey?: string;
  categoryKey?: string;
  label?: string; // For metric mode
  height?: number;
}

export default function ChartRenderer({
  chartType,
  data,
  xAxisKey,
  seriesKeys,
  yAxisKey,
  valueKey,
  categoryKey,
  label = "Summary Metric",
  height = 380,
}: ChartRendererProps) {
  // Graceful fallback for empty dataset
  if (!data || data.length === 0) {
    return (
      <div
        className="w-full border border-dashed border-basira-border-default rounded-xl flex flex-col items-center justify-center text-center p-8 text-basira-text-muted select-none h-60"
      >
        <span className="font-sans text-xs font-light">No parsed data records available for rendering.</span>
      </div>
    );
  }

  // Auto-detect keys if not explicitly supplied to provide dynamic zero-config rendering
  const autoDetectKeys = () => {
    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== "object") return { detectedX: "", detectedSeries: [] as string[] };

    const keys = Object.keys(firstRow);
    
    // Find numeric and string/date keys
    const numericKeys: string[] = [];
    const textOrDateKeys: string[] = [];

    keys.forEach((k) => {
      // Check first row value to classify
      const val = firstRow[k];
      const num = Number(val);
      if (!isNaN(num) && val !== "" && val !== null && val !== undefined) {
        numericKeys.push(k);
      } else {
        textOrDateKeys.push(k);
      }
    });

    const detectedX = textOrDateKeys.length > 0 ? textOrDateKeys[0] : keys[0] || "";
    // If we have numeric columns, use them for series. Otherwise fallback to anything but X
    const detectedSeries = numericKeys.length > 0 ? numericKeys : keys.filter((k) => k !== detectedX);

    return { detectedX, detectedSeries };
  };

  const { detectedX, detectedSeries } = autoDetectKeys();
  
  // Prioritize pivoted series metadata if available, then explicit props, then detected
  const pivotedSeriesKeys = (data as any)?._seriesKeys;
  const pivotedXKey = (data as any)?._xAxisKey;

  const finalXKey = pivotedXKey || xAxisKey || categoryKey || detectedX;
  const finalSeriesKeys =
    pivotedSeriesKeys && pivotedSeriesKeys.length > 0
      ? pivotedSeriesKeys
      : seriesKeys && seriesKeys.length > 0
      ? seriesKeys
      : detectedSeries.slice(0, 5);

  const finalYKey = yAxisKey || (finalSeriesKeys[0] || "");
  const finalValKey = valueKey || (finalSeriesKeys[0] || "");
  const finalCategoryKey = categoryKey || xAxisKey || detectedX;

  const renderComponent = () => {
    switch (chartType) {
      case "bar":
        return (
          <AnimatedBarChart
            data={data}
            xAxisKey={finalXKey}
            seriesKeys={finalSeriesKeys}
            height={height}
          />
        );
      case "line":
        return (
          <AnimatedLineChart
            data={data}
            xAxisKey={finalXKey}
            seriesKeys={finalSeriesKeys}
            height={height}
          />
        );
      case "pie":
        return (
          <AnimatedPieChart
            data={data}
            nameKey={finalCategoryKey}
            valueKey={finalValKey}
            height={height}
          />
        );
      case "scatter":
        return (
          <AnimatedScatterPlot
            data={data}
            xAxisKey={finalXKey}
            yAxisKey={finalYKey}
            categoryKey={categoryKey}
            height={height}
          />
        );
      case "histogram":
        return (
          <AnimatedHistogram
            data={data}
            valueKey={finalValKey}
            height={height}
          />
        );
      case "area":
        return (
          <AnimatedAreaChart
            data={data}
            xAxisKey={finalXKey}
            seriesKeys={finalSeriesKeys}
            height={height}
          />
        );
      case "table":
        return (
          <DataTable
            data={data}
            columns={Object.keys(data[0] || {})}
            maxHeight={`${height + 100}px`}
          />
        );
      case "metric": {
        // For Metric Card, intelligently extract the computed metric value
        let metricKey = finalValKey;
        let sumValue = 0;
        let foundValidNum = false;

        data.forEach((row) => {
          if (!row || typeof row !== "object") return;
          let val = row[metricKey];
          if (val === undefined || val === null || isNaN(Number(val))) {
            const firstNumKey = Object.keys(row).find((k) => {
              const cleaned = String(row[k]).replace(/[$,%]/g, "").trim();
              return !isNaN(Number(cleaned)) && cleaned !== "";
            });
            if (firstNumKey) {
              metricKey = firstNumKey;
              val = row[firstNumKey];
            }
          }
          const num = Number(String(val ?? "").replace(/[$,%]/g, "").trim());
          if (!isNaN(num)) {
            sumValue += num;
            foundValidNum = true;
          }
        });

        const displayLabel = label && label !== "Summary Metric" ? label : metricKey || "Total";

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <MetricCard
              label={displayLabel}
              value={sumValue}
              description={`Computed value from ${data.length} registered ${data.length === 1 ? "summary record" : "entries"}.`}
              trend="neutral"
              trendValue="Verified"
            />
          </div>
        );
      }
      case "none":
      default:
        // Render detailed data grid overview as standard clean fallback
        return (
          <DataTable
            data={data}
            columns={Object.keys(data[0] || {})}
            maxHeight={`${height + 80}px`}
          />
        );
    }
  };

  return (
    <ChartErrorBoundary>
      <div className="w-full">
        {renderComponent()}
      </div>
    </ChartErrorBoundary>
  );
}
