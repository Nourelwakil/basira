/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toPng } from "html-to-image";
import { useToast } from "../common/Toast";

/**
 * Renders **bold** markdown-style markers as actual bold text instead of
 * showing the literal asterisks. Gemini's generated insight text uses this
 * syntax to highlight key figures/names, but the app previously displayed
 * it as raw text (e.g. "**The Silent Patient**" instead of a bolded name).
 * Deliberately minimal, only handles bold, not full markdown, since that's
 * the only syntax the model actually uses in this field.
 */
function renderInsightText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

import {
  Lightbulb,
  Info,
  Download,
  FileText,
  FileCode,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  X,
  TrendingUp,
  BarChart3,
  AreaChart,
  PieChart,
  Table2,
  ScatterChart as ScatterIcon,
} from "lucide-react";
import ChartRenderer from "../charts/ChartRenderer";
import { ChartType, GeminiAnalysisResult } from "../../types";

interface QueryResultProps {
  question: string;
  analysis: GeminiAnalysisResult;
  processedData: any[];
}

export default function QueryResult({
  question,
  analysis,
  processedData,
}: QueryResultProps) {
  const { chartType: initialChartType, chartConfig, insight, explanation, confidence } = analysis;

  const [activeChartType, setActiveChartType] = useState<ChartType>(initialChartType);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const { showToast } = useToast();
  // Two separate refs, not one: the normal-view chart and the fullscreen-modal
  // chart can both be mounted in the DOM simultaneously (fullscreen renders a
  // second ChartRenderer instance rather than replacing the first). Exporting
  // via a global querySelector for ".recharts-responsive-container svg" would
  // grab whichever one happens to appear first in the DOM, which is why PNG
  // export previously behaved inconsistently between normal and fullscreen
  // view. Each ref targets its own container explicitly instead.
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const fullscreenChartContainerRef = useRef<HTMLDivElement>(null);

  // Sync state if a new analysis query comes in
  useEffect(() => {
    setActiveChartType(initialChartType);
  }, [initialChartType, question]);

  // Keyboard shortcut to close fullscreen with Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 25, 75));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  const isUnclear = analysis.isUnclear || false;

  const isUnrelated =
    activeChartType === "none" && !isUnclear && (
      insight.toLowerCase().includes("unrelated") ||
      insight.toLowerCase().includes("sorry") ||
      insight.toLowerCase().includes("i’m sorry") ||
      insight.toLowerCase().includes("i'm sorry")
    );

  // Render friendly readable chart types
  const getChartLabel = (type: ChartType) => {
    switch (type) {
      case "bar":
        return "Categorical Bar Graph";
      case "line":
        return "Continuous Line Timeline";
      case "pie":
        return "Percentage Pie Breakdown";
      case "scatter":
        return "Bivariate Scatter Plot";
      case "histogram":
        return "Numerical Histogram Dist";
      case "area":
        return "Cumulative Area Chart";
      case "table":
        return "Reference Data Grid";
      case "metric":
        return "Summary KPI Indicator";
      default:
        return "Tabular Grid View";
    }
  };

  /**
   * Action trigger: Export analytical rows to standard CSV format
   */
  const handleExportCSV = () => {
    if (!processedData || processedData.length === 0) return;

    const headers = Object.keys(processedData[0]);
    const csvRows = [];

    // Header row
    csvRows.push(headers.join(","));

    // Content rows
    processedData.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header];
        const stringified = val === null || val === undefined ? "" : String(val);
        // Escape quotes
        return `"${stringified.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `basira_data_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * Action trigger: Export current query and analysis as formatted JSON file
   */
  const handleExportJSON = () => {
    try {
      const payload = {
        exportedAt: new Date().toISOString(),
        query: {
          question,
          chartType: activeChartType,
          chartConfig,
          transformation: analysis.transformation || null,
          insight,
          explanation,
          confidence,
          resultSummary: {
            totalRows: processedData.length,
          },
          data: processedData,
        },
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sanitizedName = question.slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      link.download = `basira_query_${sanitizedName || "analysis"}_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Error exporting JSON file.");
    }
  };

  /**
   * Action trigger: Export the full chart container (SVG chart + HTML legend,
   * titles, and any other rendered elements) as a PNG.
   *
   * This replaces a previous implementation that serialized only the raw
   * <svg> element found via a page-wide querySelector. That approach had
   * three concrete problems, all reported as bugs: (1) Recharts renders its
   * legend as an HTML <ul>, not inside the SVG, so legends were silently
   * dropped from every export; (2) when the fullscreen modal is open, two
   * ChartRenderer instances exist in the DOM at once (the original plus the
   * modal's), and querySelector always grabbed whichever came first, not
   * necessarily the one the user was actually looking at; (3) there was no
   * onerror handler, so a failed image load produced no output and no
   * feedback at all. Capturing the whole container element by ref, rather
   * than the bare SVG by global selector, fixes all three at once.
   */
  const handleExportPNG = async () => {
    const targetRef = isFullscreen ? fullscreenChartContainerRef : chartContainerRef;
    const node = targetRef.current;

    if (!node) {
      showToast("Could not locate the chart to export. Try again after the chart finishes rendering.", "error");
      return;
    }

    try {
      const dataUrl = await toPng(node, {
        backgroundColor: "#ffffff",
        pixelRatio: 2, // retina-quality output
        cacheBust: true,
      });

      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `basira_analysis_${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast("Chart downloaded successfully.", "success");
    } catch (err) {
      console.error("Chart PNG export failed:", err);
      showToast("Couldn't export the chart as an image. Try Export Data (CSV) instead.", "error");
    }
  };

  const isVisualChart =
    (activeChartType as string) !== "table" &&
    (activeChartType as string) !== "metric" &&
    (activeChartType as string) !== "none";

  // Calculate dynamic responsive height based on zoom level for complete visibility
  // Heights increased from the previous 540/440/400 defaults, and vertical
  // clipping removed below (overflow-y-hidden -> visible). The old fixed
  // heights combined with overflow-y-hidden meant any chart whose legend,
  // rotated axis labels, or title pushed it taller than the estimate was
  // silently cropped rather than shown or scrolled, exactly the "chart not
  // fully visible" issue reported. Charts with heavier label content will
  // now grow into the visible extra space instead of being cut off.
  const baseHeight = activeChartType === "scatter" ? 580 : activeChartType === "pie" ? 480 : 460;
  const currentHeight = Math.round(baseHeight * (zoomLevel / 100));

  if (isUnclear) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 relative group"
      >
        {/* User's Question Bubble */}
        <div className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4 animate-fade-in select-text">
          <div className="w-7 h-7 rounded-full bg-basira-primary-light text-basira-primary flex items-center justify-center font-semibold text-xs shrink-0 uppercase select-none">
            U
          </div>
          <div className="space-y-1.5 overflow-hidden">
            <span className="block font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-semibold">Submitted Inquiry</span>
            <p className="font-sans text-sm text-basira-text-heading font-medium break-words">
              {question}
            </p>
          </div>
        </div>

        {/* Chatbot Unclear Response Bubble */}
        <div className="flex gap-3 bg-indigo-55/35 border border-indigo-100 rounded-xl p-5 animate-fade-in select-text bg-[#EEF2FF]">
          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs shrink-0 select-none">
            AI
          </div>
          <div className="space-y-1.5 overflow-hidden">
            <span className="block font-sans text-[10px] text-indigo-700 uppercase tracking-wider font-semibold">Basira Analyst</span>
            <p className="font-sans text-sm text-indigo-900 font-medium leading-relaxed">
              {analysis.followUpQuestion || "Your request is a bit unclear or vague. To generate accurate aggregates, could you please specify which columns or metrics you are interested in mapping?"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (isUnrelated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6 relative group"
      >
        {/* User's Question Bubble */}
        <div className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4 animate-fade-in select-text">
          <div className="w-7 h-7 rounded-full bg-basira-primary-light text-basira-primary flex items-center justify-center font-semibold text-xs shrink-0 uppercase select-none">
            U
          </div>
          <div className="space-y-1.5 overflow-hidden">
            <span className="block font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-semibold">Submitted Inquiry</span>
            <p className="font-sans text-sm text-basira-text-heading font-medium break-words">
              {question}
            </p>
          </div>
        </div>

        {/* Chatbot Unrelated Response Bubble */}
        <div className="flex gap-3 bg-red-50/40 border border-red-100 rounded-xl p-5 animate-fade-in select-text">
          <div className="w-7 h-7 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-semibold text-xs shrink-0 select-none">
            AI
          </div>
          <div className="space-y-1.5 overflow-hidden">
            <span className="block font-sans text-[10px] text-red-700 uppercase tracking-wider font-semibold">Assistant</span>
            <p className="font-sans text-sm text-red-900 font-normal leading-relaxed">
              I’m sorry, but I can only answer questions related to the uploaded dataset.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-6"
      >
        {/* User's Question Bubble */}
        <div className="flex gap-3 bg-slate-50 border border-slate-100 rounded-xl p-4 animate-fade-in select-text">
          <div className="w-7 h-7 rounded-full bg-basira-primary-light text-basira-primary flex items-center justify-center font-semibold text-xs shrink-0 uppercase select-none">
            U
          </div>
          <div className="space-y-1.5 overflow-hidden">
            <span className="block font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-semibold">Submitted Inquiry</span>
            <p className="font-sans text-sm text-basira-text-heading font-medium break-words">
              {question}
            </p>
          </div>
        </div>

        {/* Header and Badge Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 select-none pb-2 border-b border-basira-border-subtle">
          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase bg-[#E0E7FF] text-[#312E81] border border-[#C7D2FE]">
              {getChartLabel(activeChartType)}
            </span>
            <span className="text-slate-400 font-light text-xs">/</span>
            <span className="text-basira-text-muted font-sans text-xs font-light">
              {processedData.length} records parsed
            </span>
          </div>

          {/* Real action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 border border-basira-border-default hover:bg-[#F8FAFC] rounded-lg font-sans text-xs font-medium text-basira-text-body transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Export query and transformation configuration as JSON"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON</span>
            </button>

            {isVisualChart && (
              <button
                type="button"
                onClick={handleExportPNG}
                className="px-3 py-1.5 border border-basira-border-default hover:bg-[#F8FAFC] rounded-lg font-sans text-xs font-medium text-basira-text-body transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg font-sans text-xs font-medium hover:shadow-card transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export Data</span>
            </button>
          </div>
        </div>

        {/* Main visual display box with interactive Chart Switcher & Zoom Controls */}
        <div className="bg-white border border-basira-border-default rounded-xl p-5 shadow-sm space-y-3">
          {/* Chart Type Selector & Zoom Controls Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            {/* Quick Chart Switcher Pill Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-lg border border-slate-200/80">
              <span className="text-[10px] font-medium uppercase text-slate-400 px-1.5 hidden sm:inline">
                Style:
              </span>
              {[
                { id: "line", label: "Line", icon: TrendingUp },
                { id: "bar", label: "Bar", icon: BarChart3 },
                { id: "area", label: "Area", icon: AreaChart },
                { id: "pie", label: "Pie", icon: PieChart },
                { id: "scatter", label: "Scatter", icon: ScatterIcon },
                { id: "table", label: "Table", icon: Table2 },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = activeChartType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveChartType(item.id as ChartType)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? "bg-white text-indigo-700 shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Zoom & View Controls Toolbar */}
            {isVisualChart && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500 mr-1 hidden sm:inline">Zoom:</span>
                  
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 75}
                    title="Zoom Out"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 transition-colors cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom to 100%"
                    className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 font-mono text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer"
                  >
                    {zoomLevel}%
                  </button>

                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 200}
                    title="Zoom In"
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 transition-colors cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>

                  {zoomLevel !== 100 && (
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      title="Reset to Default"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Fullscreen Expand Button */}
                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-medium transition-all hover:shadow-xs cursor-pointer active:scale-95"
                  title="Expand chart to Fullscreen view"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </button>
              </div>
            )}
          </div>

          {/* Chart Rendering Container with Zoom Scrolling support */}
          <div
            className="w-full relative overflow-x-auto overflow-y-visible transition-all duration-200"
            style={{ minHeight: `${currentHeight}px` }}
          >
            <div
              ref={chartContainerRef}
              style={{
                minWidth: zoomLevel > 100 ? `${zoomLevel}%` : "100%",
                height: `${currentHeight}px`,
              }}
              className="w-full"
            >
              <ChartRenderer
                chartType={activeChartType}
                data={processedData}
                xAxisKey={chartConfig?.xAxisKey}
                seriesKeys={chartConfig?.seriesKeys}
                yAxisKey={chartConfig?.yAxisKey}
                valueKey={chartConfig?.valueKey}
                categoryKey={chartConfig?.categoryKey}
                height={currentHeight}
              />
            </div>
          </div>
        </div>

        {/* Grid containing Insights and explainability modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Insight Card */}
          <div className="bg-[#FFFDF5] border border-[#FEF3C7] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#D97706] select-none">
              <Lightbulb className="w-4 h-4" strokeWidth={2.5} />
              <h4 className="font-sans text-[11px] font-medium uppercase tracking-wider">
                Autonomous Discovery
              </h4>
            </div>
            <p className="font-sans text-xs text-amber-900 font-light leading-relaxed whitespace-pre-line select-text">
              {renderInsightText(insight)}
            </p>
          </div>

          {/* Explainability Card */}
          <div className="bg-[#F8FAFC] border border-basira-border-default rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-slate-500 select-none">
              <Info className="w-4 h-4" strokeWidth={2.5} />
              <h4 className="font-sans text-[11px] font-medium uppercase tracking-wider">
                Explainability / Why this chart?
              </h4>
            </div>
            <p className="font-sans text-xs text-slate-700 font-light leading-relaxed select-text">
              {explanation}
            </p>
          </div>
        </div>

        {/* Model confidence progress rating */}
        <div className="bg-[#F8FAFC] border border-basira-border-default rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
            <span className="font-sans text-xs text-basira-text-heading font-medium">
              AI Synthesis Rating
            </span>
          </div>

          <div className="flex items-center gap-3.5 w-full md:max-w-xs mt-1 md:mt-0">
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="bg-emerald-500 h-full rounded-full"
              />
            </div>
            <span className="font-mono text-xs text-emerald-600 font-medium tracking-tight">
              {confidence}%
            </span>
          </div>
        </div>
      </motion.div>

      {/* Fullscreen High-Definition Expanded Modal */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 md:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/80">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase bg-[#E0E7FF] text-[#312E81] border border-[#C7D2FE] shrink-0">
                    {getChartLabel(activeChartType)}
                  </span>
                  <p className="font-medium text-slate-800 text-sm truncate">
                    {question}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Zoom controls inside modal */}
                  {isVisualChart && (
                    <div className="flex items-center gap-1 mr-2">
                      <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 75}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="px-2 font-mono text-xs font-semibold text-slate-700">
                        {zoomLevel}%
                      </span>
                      <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 200}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-40 text-slate-700 transition-colors cursor-pointer"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isVisualChart && (
                    <button
                      type="button"
                      onClick={handleExportPNG}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-700 transition-colors cursor-pointer"
                      title="Download PNG"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-700 transition-colors cursor-pointer"
                    title="Export CSV"
                  >
                    <FileText className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsFullscreen(false)}
                    className="p-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors cursor-pointer ml-1"
                    title="Close (Esc)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Oversized Chart Canvas with Zoom */}
              <div className="p-6 overflow-auto flex-1 bg-white">
                <div
                  ref={fullscreenChartContainerRef}
                  style={{
                    minWidth: zoomLevel > 100 ? `${zoomLevel}%` : "100%",
                    height: `${Math.max(520, Math.round(520 * (zoomLevel / 100)))}px`,
                  }}
                  className="w-full flex items-center justify-center bg-white"
                >
                  <ChartRenderer
                    chartType={activeChartType}
                    data={processedData}
                    xAxisKey={chartConfig?.xAxisKey}
                    seriesKeys={chartConfig?.seriesKeys}
                    yAxisKey={chartConfig?.yAxisKey}
                    valueKey={chartConfig?.valueKey}
                    categoryKey={chartConfig?.categoryKey}
                    height={Math.max(520, Math.round(520 * (zoomLevel / 100)))}
                  />
                </div>
              </div>

              {/* Modal Footer - Insight & Explanation summary */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row gap-4 text-xs text-slate-600">
                <div className="flex-1">
                  <span className="font-semibold text-slate-700 block mb-0.5">Key Insight:</span>
                  <p className="line-clamp-2 text-slate-600">{renderInsightText(insight)}</p>
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-slate-700 block mb-0.5">Selection Reasoning:</span>
                  <p className="line-clamp-2 text-slate-600">{explanation}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
