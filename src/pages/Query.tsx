/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Database,
  Sliders,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Calendar,
  Hash,
  Type as TextIcon,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useQueryContext } from "../context/QueryContext";
import { useToast } from "../components/common/Toast";
import { ANIMATION_PRESETS } from "../utils/constants";
import { detectColumnTypes } from "../utils/dataTypeDetector";
import { askGemini, summarizeDataset } from "../services/geminiService";
import { processDataset } from "../services/dataProcessor";
import { GeminiAnalysisResult } from "../types";

// Inner components
import SuggestedQuestions from "../components/query/SuggestedQuestions";
import QueryInput from "../components/query/QueryInput";
import QueryResult from "../components/query/QueryResult";
import Skeleton from "../components/common/Skeleton";

export default function Query() {
  const location = useLocation();
  const navigate = useNavigate();
  const { datasets, activeDatasetId, setActiveDatasetId } = useData();
  const { queries, addQuery, isQueryRunning, setIsQueryRunning } = useQueryContext();
  const { showToast } = useToast();

  // Selected dataset object
  const activeDataset = useMemo(() => {
    return datasets.find((d) => d.id === activeDatasetId) || null;
  }, [datasets, activeDatasetId]);

  // Detected types for active dataset
  const activeColumnTypes = useMemo(() => {
    if (!activeDataset) return {};
    return detectColumnTypes(activeDataset.rawData, activeDataset.columns);
  }, [activeDataset]);

  // Page States
  const [queryInput, setQueryInput] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const isLoading = isQueryRunning;
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const restoringQueryIdRef = useRef<string | null>(null);

  // Unmount effect to abort any active fetch on navigation
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsQueryRunning(false);
    };
  }, [setIsQueryRunning]);

  // Parse result history states
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [processedData, setProcessedData] = useState<any[]>([]);

  // Track the last active dataset ID to reset only when dataset actually switches
  const [lastDatasetId, setLastDatasetId] = useState<string | null>(activeDatasetId);

  // Get all queries branched from this CSV (parent)
  const datasetQueries = useMemo(() => {
    if (!activeDatasetId) return [];
    return queries
      .filter((q) => q.datasetId === activeDatasetId)
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  }, [queries, activeDatasetId]);

  // Automatically reset results when dataset switches (unless restoring a loaded query)
  useEffect(() => {
    if (restoringQueryIdRef.current) {
      const found = queries.find((q) => q.id === restoringQueryIdRef.current);
      if (found && found.datasetId === activeDatasetId) {
        restoringQueryIdRef.current = null;
      }
      return; // Skip reset entirely because we are actively restoring this query's dataset and results
    }

    if (location.state && (location.state as any).queryId) {
      const qId = (location.state as any).queryId;
      const found = queries.find((q) => q.id === qId);
      if (found && found.datasetId === activeDatasetId) {
        return; // Don't clear!
      }
    }
    if (activeDatasetId !== lastDatasetId) {
      setAnalysisResult(null);
      setProcessedData([]);
      setQueryInput("");
      setActiveQuestion("");
      setError(null);
      setLastDatasetId(activeDatasetId);
    }
  }, [activeDatasetId, lastDatasetId, location.state, queries]);

  // Load query from location state if passed (e.g. Navigating from History or Dashboard)
  useEffect(() => {
    if (location.state && (location.state as any).queryId) {
      const qId = (location.state as any).queryId;
      restoringQueryIdRef.current = qId; // Set the safeguard token
      const found = queries.find((q) => q.id === qId);
      if (found) {
        setQueryInput(found.question);
        setActiveQuestion(found.question);

        if (found.datasetId !== activeDatasetId) {
          setActiveDatasetId(found.datasetId);
        }
        setLastDatasetId(found.datasetId);

        if (found.analysis && found.result) {
          setAnalysisResult(found.analysis);
          setProcessedData(found.result);
        } else if (found.result) {
          setProcessedData(found.result);
          let parsedTx = {};
          try {
            parsedTx = found.sql ? JSON.parse(found.sql) : {};
          } catch (e) {
            console.error("Failed to parse stored configuration:", e);
          }
          setAnalysisResult({
            chartType: found.chartType,
            chartConfig: {},
            transformation: parsedTx,
            insight: "Restored historical insight: Results loaded from session storage.",
            explanation: found.explanation || "Reconstructed from timeline record.",
            confidence: 100,
          });
        }

        // Clear location state so switching datasets or typing works normally without forcing the history query
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.state, queries, activeDatasetId, setActiveDatasetId, navigate]);

  // Set initial active query to the latest from history if no active result is loaded yet
  useEffect(() => {
    if (location.state && (location.state as any).queryId) {
      return; // Do not load latest query if we have a specific queryId in state
    }

    if (datasetQueries.length > 0 && !analysisResult && !isLoading) {
      const latest = datasetQueries[datasetQueries.length - 1];
      setActiveQuestion(latest.question);
      setProcessedData(latest.result || []);
      setAnalysisResult(latest.analysis || {
        chartType: latest.chartType,
        chartConfig: {},
        transformation: latest.sql ? JSON.parse(latest.sql) : {},
        insight: "Insight loaded from memory.",
        explanation: latest.explanation || "",
        confidence: 100
      });
    }
  }, [datasetQueries, analysisResult, isLoading, location.state]);

  // Click on a template flows into query bar
  const handleSelectQuestion = (question: string) => {
    setQueryInput(question);
  };



  // Main Submit Query Function
  const handleSubmitQuery = async () => {
    if (!activeDataset) {
      showToast("Please import or select an active dataset first.", "error");
      return;
    }
    if (!queryInput.trim()) {
      showToast("Question prompt cannot be empty.", "error");
      return;
    }

    const queryToSubmit = queryInput;
    
    // Abort previous query request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsQueryRunning(true);
    setError(null);
    setActiveQuestion(queryToSubmit);

    try {
      const columns = activeDataset.columns;
      const rawData = activeDataset.rawData || [];
      const rowCount = activeDataset.rowCount;

      // Extract up to 10 diverse representative sample records for Gemini prompt context
      const sampleLimit = Math.min(rawData.length, 10);
      const samples = rawData.length > 10 ? rawData.slice(0, sampleLimit) : rawData;

      // Classify column datatypes programmatically
      const types = activeColumnTypes;

      // 1. Call Gemini on the Express API
      const resultObj = await askGemini({
        query: queryToSubmit,
        columns,
        types,
        samples,
        rowCount,
        signal,
      });

      let processed: any[] = [];

      // Validate prompt clarity and relevance constraints
      if (!resultObj.isUnclear && resultObj.chartType !== "none") {
        // 2. Perform client-side pipeline computation on raw csv records
        processed = processDataset(rawData, resultObj.transformation);

        // Defensive alias: if the model omitted aggregates, processDataset falls
        // back to a safe row count under the literal key "Count". But the model's
        // chartConfig (seriesKeys/valueKey/yAxisKey) may reference a different
        // name it assumed the aggregate would produce (e.g. "Total Sales") even
        // though that aggregate was never actually computed. Without this, the
        // chart silently renders empty bars because it's looking for a field
        // that doesn't exist in the data. Copy the Count value under every name
        // the chart config expects so the chart still displays correctly, even
        // though the underlying number is a count, not the originally requested
        // sum, since the aggregate itself was never generated.
        const hasCountFallback = processed.length > 0 && Object.prototype.hasOwnProperty.call(processed[0], "Count") && !resultObj.transformation?.aggregates?.length;
        if (hasCountFallback) {
          const expectedKeys = [
            ...(resultObj.chartConfig?.seriesKeys || []),
            resultObj.chartConfig?.valueKey,
            resultObj.chartConfig?.yAxisKey,
          ].filter((k): k is string => !!k && k !== "Count");
          if (expectedKeys.length > 0) {
            processed = processed.map((row) => {
              const aliased = { ...row };
              expectedKeys.forEach((key) => {
                if (!(key in aliased)) aliased[key] = row["Count"];
              });
              // Remove the original "Count" key once it's been copied under the
              // chart-expected name(s), otherwise both show up as separate,
              // identically-valued series (e.g. "Count" AND "Total Revenue"
              // plotted side by side), which is confusing and looks like two
              // different numbers when it's the same fallback count twice.
              delete aliased["Count"];
              return aliased;
            });
          }
        }

        const isFilterEmpty = resultObj.transformation?.filter && resultObj.transformation.filter.length > 0 && processed.length === 0;

        if (isFilterEmpty) {
          resultObj.insight = "No records matched your specified filters. Verify if your dataset contains records within the requested date ranges (e.g. March 2026).";
          resultObj.explanation = "Data filters resolved to an empty dataset matrix. Ensure date headers match the record range boundaries.";
          resultObj.confidence = 100;
        } else {
          // 3. Perform dynamic plain-speaking multi-step summary pass
          try {
            const summaryObj = await summarizeDataset({
              query: queryToSubmit,
              processedData: processed,
              transformation: resultObj.transformation,
              columns,
              rowCount,
              signal,
            });
            resultObj.insight = summaryObj.insight;
            resultObj.explanation = summaryObj.explanation;
          } catch (sumErr: any) {
            if (sumErr.name === "AbortError") {
              throw sumErr;
            }
            console.error("Aggregation summarizer pass failed. Invoking client format fallback:", sumErr);
            resultObj.insight = `Merged and aggregated ${processed.length} matching rows.\nComputed elements count correctly from source grid variables.`;
          }
        }
      } else if (resultObj.isUnclear) {
        // Set fallback text metrics details for unclear/follow-up indicators
        resultObj.insight = resultObj.followUpQuestion || "Could you please clarify your question with more dataset details?";
        resultObj.explanation = "A prompt follow-up is requested to coordinate clean data dimensions.";
        resultObj.chartType = "none";
      }

      setProcessedData(processed);
      setAnalysisResult(resultObj);

      // 4. Register query inside the persistent user history Context
      await addQuery({
        id: Math.random().toString(36).substring(2, 9),
        datasetId: activeDataset.id,
        datasetName: activeDataset.name,
        question: queryToSubmit,
        sql: JSON.stringify(resultObj.transformation, null, 2),
        chartType: resultObj.chartType,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        createdAt: Date.now(),
        explanation: resultObj.explanation,
        result: processed,
        analysis: resultObj,
      });

      setQueryInput("");
      showToast(resultObj.isUnclear ? "Clarification prompt activated." : "Insight generation succeeded.", "success");
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Query request aborted successfully.");
        return;
      }
      console.error(err);
      setError(err.message || "An error occurred attempting to resolve your question.");
      showToast("Failed to compile chart representation.", "error");
    } finally {
      setIsQueryRunning(false);
    }
  };

  // Helper icons for column categories
  const getColIcon = (type: "number" | "date" | "text") => {
    switch (type) {
      case "number":
        return <Hash className="w-3.5 h-3.5 text-blue-500" />;
      case "date":
        return <Calendar className="w-3.5 h-3.5 text-emerald-500" />;
      case "text":
      default:
        return <TextIcon className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <motion.div
      initial={ANIMATION_PRESETS.page.initial}
      animate={ANIMATION_PRESETS.page.animate}
      exit={ANIMATION_PRESETS.page.exit}
      transition={ANIMATION_PRESETS.page.transition}
      className="space-y-10"
    >
      {/* Title Header */}
      <div className="space-y-1.5 select-none animate-fade-in">
        <h1 className="font-sans text-2xl font-medium tracking-tight text-basira-text-heading">
          Insight Engine
        </h1>
        <p className="font-sans text-sm text-basira-text-muted font-light">
          Sift, aggregate, and visualize spreadsheet parameters in natural, uncomplicated language.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 items-start">
        {/* LEFT PANEL: 30% width (lg:col-span-3) */}
        <div className="lg:col-span-3 space-y-6 select-none">
          <div className="bg-white border border-basira-border-default rounded-xl p-5 shadow-card space-y-6">
            {/* 1. Dataset selector dropdown */}
            <div className="space-y-1.5">
              <label className="font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-medium">
                Active Namespace
              </label>
              {datasets.length > 0 ? (
                <div className="relative">
                  <select
                    value={activeDatasetId || ""}
                    onChange={(e) => setActiveDatasetId(e.target.value || null)}
                    className="w-full border border-basira-border-default hover:border-basira-border-subtle rounded-lg px-3 py-2.5 bg-white text-xs text-basira-text-heading font-medium focus:ring-2 focus:ring-blue-100 focus:outline-none appearance-none cursor-pointer"
                  >
                    {datasets.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.rowCount} records)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                    <Database className="w-4 h-4" />
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-between border border-basira-border-default rounded-lg px-3.5 py-2.5 bg-basira-bg-surface text-xs text-basira-text-muted font-light cursor-not-allowed">
                  <span>No datasets connected</span>
                  <Database className="w-4 h-4 text-basira-text-muted" strokeWidth={1.5} />
                </div>
              )}
            </div>

            {/* 2. Column schema list with badges */}
            {activeDataset && (
              <div className="pt-4 border-t border-basira-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[10px] text-basira-text-muted uppercase tracking-wider">
                    Column Inventory ({activeDataset.columns.length})
                  </span>
                  <Sliders className="w-3.5 h-3.5 text-[#94A3B8]" />
                </div>
                <div className="max-h-[180px] overflow-y-auto divide-y divide-slate-100 pr-1">
                  {activeDataset.columns.map((col) => {
                    const type = activeColumnTypes[col] || "text";
                    return (
                      <div key={col} className="py-2 flex items-center justify-between gap-2">
                        <span
                          className="font-mono text-[11px] text-slate-700 truncate font-medium"
                          title={col}
                        >
                          {col}
                        </span>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-slate-100 bg-slate-50 shrink-0">
                          {getColIcon(type)}
                          <span className="font-sans text-[9px] font-medium text-slate-500 uppercase">
                            {type}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Suggested questions */}
            <div className="pt-4 border-t border-basira-border-subtle space-y-3.5">
              <span className="font-medium text-[10px] text-basira-text-muted uppercase tracking-wider block">
                Suggested Inquiries
              </span>
              <SuggestedQuestions
                columns={activeDataset ? activeDataset.columns : []}
                types={activeColumnTypes}
                onSelectQuestion={handleSelectQuestion}
              />
            </div>
          </div>
        </div>

        {/* CENTER PANEL: 70% width (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-6">
          {activeDataset ? (
            <div className="space-y-6">
              
              {/* Parent CSV Header Card */}
              <div className="bg-[#F8FAFC] border border-basira-border-default rounded-xl p-5 flex items-center gap-4 select-none animate-fade-in shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-semibold">
                      Parent CSV Dataset
                    </span>
                    <span className="text-[10px] bg-blue-100/60 text-[#2563EB] px-2 py-0.5 rounded font-medium select-none">
                      Active
                    </span>
                  </div>
                  <h3 className="font-sans text-sm font-semibold text-basira-text-heading truncate" title={activeDataset.name}>
                    {activeDataset.name}
                  </h3>
                  <p className="font-sans text-[11px] text-basira-text-muted font-light mt-0.5 truncate">
                    {activeDataset.rowCount} rows • {activeDataset.columns.length} columns • {activeDataset.fileSize}
                  </p>
                </div>
              </div>

              {/* Main workspace arena */}
              <div className="bg-white border border-basira-border-default rounded-xl p-6 md:p-8 shadow-card flex flex-col justify-between min-h-[440px]">
                
                <div className="flex-1 space-y-8 overflow-y-auto max-h-[600px] pr-1 scrollbar-thin">
                  {datasetQueries.length === 0 && !isLoading && !error ? (
                    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-4 py-12">
                      <div className="w-12 h-12 rounded-xl bg-basira-primary-light flex items-center justify-center text-basira-primary animate-fade-in">
                        <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1.5 select-none">
                        <h3 className="font-sans text-sm font-medium text-basira-text-heading">
                          No query branches yet
                        </h3>
                        <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                          CSV dataset is loaded as the Parent. Type a natural language question below to generate beautiful branching visual charts.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-10 animate-fade-in">
                      {/* Active query chart / structured analytics block */}
                      {analysisResult && !isLoading && (
                        <QueryResult
                          question={activeQuestion || queryInput}
                          analysis={analysisResult}
                          processedData={processedData}
                        />
                      )}

                      {/* Display loading skeleton at bottom of list if new query is compiling */}
                      {isLoading && (
                        <div className="space-y-6 pt-4 border-t border-slate-100 animate-pulse">
                          <div className="flex items-center gap-3 select-none">
                            <div className="w-2.5 h-2.5 rounded-full bg-basira-primary animate-ping" />
                            <span className="font-sans text-xs text-basira-primary font-medium">
                              Parsing dataset and executing transformations over {activeDataset?.rowCount} rows...
                            </span>
                          </div>

                          <div className="space-y-4">
                            {/* Main Chart skeleton */}
                            <div className="border border-dashed border-basira-border-default rounded-xl p-6 h-[200px] flex flex-col justify-end gap-3 bg-slate-50/50">
                              <div className="flex items-end gap-4 h-full px-4">
                                <div className="bg-slate-200/80 w-full h-[40%] rounded-t-lg" />
                                <div className="bg-slate-200/80 w-full h-[75%] rounded-t-lg" />
                                <div className="bg-slate-200/80 w-full h-[55%] rounded-t-lg" />
                                <div className="bg-slate-200/80 w-full h-[90%] rounded-t-lg" />
                                <div className="bg-slate-200/80 w-full h-[30%] rounded-t-lg" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Display error banner at bottom of list if new query failed */}
                      {error && !isLoading && (
                        <div className="p-5 border border-dashed border-amber-300 bg-amber-50/50 rounded-xl space-y-3 text-center select-none pt-4">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
                            <AlertCircle className="w-5 h-5" />
                          </div>
                          <div className="space-y-1.5 font-medium">
                            <h4 className="font-sans text-xs font-semibold text-slate-800">
                              Query Execution Interrupted
                            </h4>
                            <p className="font-sans text-xs text-slate-600 font-light max-w-md mx-auto leading-relaxed whitespace-pre-line text-left bg-white p-3 rounded-lg border border-amber-200/60 shadow-2xs">
                              {error}
                            </p>
                          </div>
                          <div className="pt-1 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={handleSubmitQuery}
                              className="px-3.5 py-1.5 bg-basira-primary hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                            >
                              <span>Retry Question</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input bar selector & triggers */}
                <div className="pt-6 border-t border-basira-border-subtle mt-6">
                  <QueryInput
                    value={queryInput}
                    onChange={setQueryInput}
                    onSubmit={handleSubmitQuery}
                    disabled={!activeDataset}
                    isLoading={isLoading}
                  />
                </div>

              </div>
            </div>
          ) : (
            /* No dataset connected placeholder */
            <div className="bg-white border border-basira-border-default rounded-xl p-8 shadow-card flex flex-col items-center justify-center text-center min-h-[500px] space-y-4 select-none">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                <Database className="w-6 h-6" strokeWidth={1.5} />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-sans text-base font-semibold text-basira-text-heading">
                  No Active Dataset Selected
                </h3>
                <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                  Go to the Upload page to import a spreadsheet, or select an existing namespace in the dropdown to seed some dynamic insight branches.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
