/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  Clock,
  Search,
  Database,
  ChevronRight,
  AlertCircle,
  Download,
  FileCode,
  Copy,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQueryContext, QueryItem } from "../context/QueryContext";
import { ANIMATION_PRESETS } from "../utils/constants";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";
import { useToast } from "../components/common/Toast";

export default function History() {
  const navigate = useNavigate();
  const { queries } = useQueryContext();
  const { showToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  const tabs = ["All", "Bar", "Line", "Pie", "Scatter", "Table", "Metric"];

  // Filter and Search logic
  const filteredQueries = useMemo(() => {
    return queries.filter((q) => {
      // 1. Filter by Tab (chartType)
      const matchesTab =
        activeTab === "All" || q.chartType.toLowerCase() === activeTab.toLowerCase();

      // 2. Filter by search query
      const cleanSearch = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !cleanSearch ||
        q.question.toLowerCase().includes(cleanSearch) ||
        q.datasetName.toLowerCase().includes(cleanSearch);

      return matchesTab && matchesSearch;
    });
  }, [queries, activeTab, searchQuery]);

  /**
   * Export all queries as a formatted JSON file download
   */
  const handleExportAllJSON = () => {
    if (queries.length === 0) {
      showToast("No queries available to export.", "info");
      return;
    }

    try {
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        totalQueries: queries.length,
        queries: queries.map((q) => ({
          id: q.id,
          datasetId: q.datasetId,
          datasetName: q.datasetName,
          question: q.question,
          chartType: q.chartType,
          timestamp: q.timestamp,
          createdAt: q.createdAt,
          sqlTransformation: q.sql ? (typeof q.sql === "string" ? tryParseJson(q.sql) : q.sql) : null,
          insight: q.analysis?.insight || q.explanation || null,
          explanation: q.analysis?.explanation || q.explanation || null,
          chartConfig: q.analysis?.chartConfig || null,
          resultRowsCount: q.result?.length || 0,
          resultData: q.result || [],
        })),
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `basira_all_queries_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported ${queries.length} queries to JSON successfully.`, "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to generate JSON file.", "error");
    }
  };

  /**
   * Export single query item to JSON
   */
  const handleExportSingleJSON = (e: React.MouseEvent, query: QueryItem) => {
    e.stopPropagation();
    try {
      const singlePayload = {
        exportedAt: new Date().toISOString(),
        query: {
          id: query.id,
          datasetId: query.datasetId,
          datasetName: query.datasetName,
          question: query.question,
          chartType: query.chartType,
          timestamp: query.timestamp,
          createdAt: query.createdAt,
          sqlTransformation: query.sql ? (typeof query.sql === "string" ? tryParseJson(query.sql) : query.sql) : null,
          insight: query.analysis?.insight || query.explanation || null,
          explanation: query.analysis?.explanation || query.explanation || null,
          chartConfig: query.analysis?.chartConfig || null,
          resultRowsCount: query.result?.length || 0,
          resultData: query.result || [],
        },
      };

      const jsonStr = JSON.stringify(singlePayload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const sanitizedName = query.question.slice(0, 25).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      link.download = `basira_query_${sanitizedName}_${query.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exported query "${query.question.slice(0, 30)}..." to JSON.`, "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to export query JSON.", "error");
    }
  };

  /**
   * Copy single query JSON to clipboard
   */
  const handleCopySingleJSON = (e: React.MouseEvent, query: QueryItem) => {
    e.stopPropagation();
    try {
      const singlePayload = {
        id: query.id,
        datasetId: query.datasetId,
        datasetName: query.datasetName,
        question: query.question,
        chartType: query.chartType,
        timestamp: query.timestamp,
        sqlTransformation: query.sql ? tryParseJson(query.sql) : null,
        insight: query.analysis?.insight || query.explanation || null,
        resultData: query.result || [],
      };
      navigator.clipboard.writeText(JSON.stringify(singlePayload, null, 2));
      setCopiedQueryId(query.id);
      setTimeout(() => setCopiedQueryId(null), 2000);
      showToast("Query JSON copied to clipboard.", "success");
    } catch (e) {
      console.error(e);
      showToast("Failed to copy to clipboard.", "error");
    }
  };

  const tryParseJson = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };



  // Motion variants for stagger entry
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 12 },
    show: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 25,
      },
    },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
        <div className="space-y-1.5">
          <h1 className="font-sans text-2xl font-medium tracking-tight text-basira-text-heading">
            Query History
          </h1>
          <p className="font-sans text-sm text-basira-text-muted font-light">
            Your chronological library of generated answers, insights, and charts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {queries.length > 0 && (
            <button
              type="button"
              onClick={handleExportAllJSON}
              className="px-4 py-2 bg-basira-primary hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export All Queries (JSON)</span>
              <span className="bg-blue-500/40 text-white px-1.5 py-0.5 rounded text-[10px] font-mono ml-0.5">
                {queries.length}
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Search and Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none">
          {/* Search Input Container */}
          <div className="relative flex items-center max-w-sm w-full">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previous questions..."
              className="w-full h-10 bg-white border border-basira-border-default hover:border-basira-border-subtle focus:border-basira-primary rounded-lg pl-10 pr-4 text-xs font-light text-basira-text-body transition-colors focus:outline-none"
            />
          </div>

          {/* Filter Tabs Container */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? "bg-basira-primary text-white font-medium shadow-sm"
                      : "text-basira-text-muted hover:bg-basira-bg-surface hover:text-basira-text-body"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Query Index */}
        {queries.length === 0 ? (
          /* Case 1: Absolutely no query exists */
          <EmptyState
            icon={Clock}
            title="Chronology empty"
            description="Connect dynamic datasets and execute your first visualization query to populate this history index."
            actionLabel="Go to Query Console"
            onAction={() => navigate("/query")}
          />
        ) : filteredQueries.length === 0 ? (
          /* Case 2: Filter results are empty */
          <div className="bg-white border border-basira-border-default rounded-xl p-12 text-center min-h-[300px] flex flex-col items-center justify-center shadow-card select-none">
            <div className="max-w-xs space-y-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center mx-auto text-orange-500">
                <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="font-sans text-sm font-medium text-basira-text-heading">
                  No matching queries found
                </h3>
                <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                  We couldn't locate any records matching your custom search or selected visualization tab filter.
                </p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveTab("All");
                }}
                className="px-4 py-2 text-xs font-medium text-basira-primary bg-basira-primary-light hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          /* Case 3: Display filtered list of queries */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {filteredQueries.map((query) => (
              <motion.div
                key={query.id}
                variants={itemVariants}
                whileHover={{ y: -3, boxShadow: "0 6px 16px rgba(0,0,0,0.03)" }}
                onClick={() => navigate("/query", { state: { queryId: query.id } })}
                className="group p-5 bg-white border border-basira-border-default rounded-xl hover:border-basira-border-subtle hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between h-[150px]"
              >
                <div className="space-y-3">
                  {/* Top line dataset namespace & date badge */}
                  <div className="flex items-center justify-between gap-1 select-none">
                    <span className="flex items-center gap-1.5 text-[11px] text-basira-text-muted font-medium bg-basira-bg-surface border border-slate-100 px-2.5 py-1 rounded-md max-w-[150px] truncate">
                      <Database className="w-3 h-3 text-[#2563EB]" strokeWidth={1.8} />
                      {query.datasetName}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {query.timestamp}
                      </span>
                    </div>
                  </div>

                  {/* Question (Truncated to exactly two lines) */}
                  <p className="font-sans text-[13px] font-medium text-basira-text-heading leading-snug line-clamp-2 block group-hover:text-basira-primary transition-colors pr-2">
                    {query.question}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {query.chartType !== "none" ? (
                      <Badge type="chart">{`${query.chartType} chart`}</Badge>
                    ) : (
                      <Badge type="default">No chart</Badge>
                    )}
                  </div>
                  
                  {/* Action row with Export JSON, Copy JSON, and Explore */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleCopySingleJSON(e, query)}
                      title="Copy query JSON to clipboard"
                      className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {copiedQueryId === query.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleExportSingleJSON(e, query)}
                      title="Download query as JSON"
                      className="p-1 rounded text-slate-400 hover:text-basira-primary hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-0.5 text-[11px] text-basira-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-1">
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
