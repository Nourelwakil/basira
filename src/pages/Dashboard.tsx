/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Database, MessageSquare, BarChart3, Target, ArrowRight, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useQueryContext } from "../context/QueryContext";
import { useAnimatedCounter } from "../hooks/useAnimatedCounter";
import { ANIMATION_PRESETS } from "../utils/constants";
import Button from "../components/common/Button";
import Badge from "../components/common/Badge";
import EmptyState from "../components/common/EmptyState";

interface StatProps {
  label: string;
  value: number;
  icon: any;
  delayIndex: number;
  suffix?: string;
}

function StatCard({ label, value, icon: Icon, delayIndex, suffix = "" }: StatProps) {
  const countValue = useAnimatedCounter(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delayIndex * 0.05 }}
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.04)" }}
      className="bg-[#F8FAFC] border border-basira-border-default p-6 rounded-xl transition-all duration-200 select-none"
    >
      <div className="flex items-center justify-between">
        <span className="font-sans text-[12px] text-[#94A3B8] font-medium tracking-wide uppercase">
          {label}
        </span>
        <Icon className="w-5 h-5 text-[#94A3B8]" strokeWidth={1.5} />
      </div>
      <div className="mt-4 flex items-baseline">
        <span className="font-sans text-[32px] font-light text-basira-text-heading tracking-tight leading-none">
          {countValue}
          {suffix}
        </span>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { datasets } = useData();
  const { queries } = useQueryContext();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning, Nour";
    if (hour < 18) return "Good afternoon, Nour";
    return "Good evening, Nour";
  };

  const datasetsCount = datasets.length;
  const queriesCount = queries.length;
  const chartsCount = queries.filter((q) => q.chartType !== "none").length;
  const accuracyPercentage = 98; // LLM check rate

  const recentQueries = queries.slice(0, 5);

  return (
    <motion.div
      initial={ANIMATION_PRESETS.page.initial}
      animate={ANIMATION_PRESETS.page.animate}
      exit={ANIMATION_PRESETS.page.exit}
      transition={ANIMATION_PRESETS.page.transition}
      className="space-y-10"
    >
      {/* Header section */}
      <div className="space-y-2 select-none">
        <h1 className="font-sans text-2xl font-medium tracking-tight text-basira-text-heading">
          {getGreeting()}
        </h1>
        <p className="font-sans text-sm text-basira-text-muted font-light">
          Your local intelligent data workspace is fully initialized and operational.
        </p>
      </div>

      {/* Grid of stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Datasets"
          value={datasetsCount}
          icon={Database}
          delayIndex={0}
        />
        <StatCard
          label="Queries"
          value={queriesCount}
          icon={MessageSquare}
          delayIndex={1}
        />
        <StatCard
          label="Charts"
          value={chartsCount}
          icon={BarChart3}
          delayIndex={2}
        />
        <StatCard
          label="Accuracy"
          value={accuracyPercentage}
          icon={Target}
          delayIndex={3}
          suffix="%"
        />
      </div>

      {/* Main dashboard content */}
      {datasetsCount === 0 ? (
        <EmptyState
          icon={Database}
          title="Upload your first dataset"
          description="Connect to your CSV or Excel workspace so Basira can parse, understand, explore, and produce beautiful interactive visualizations for you."
          actionLabel="Go to Upload"
          onAction={() => navigate("/upload")}
        />
      ) : (
        <div className="space-y-8">
          {/* Quick query bar */}
          <div className="space-y-3">
            <h3 className="font-sans text-[12px] uppercase text-[#94A3B8] font-medium tracking-wider">
              Quick Actions
            </h3>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              onClick={() => navigate("/query")}
              className="relative flex items-center justify-between p-4 bg-white border border-basira-border-default rounded-xl hover:border-basira-border-subtle hover:shadow-card transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <Search className="w-4 h-4 text-basira-text-muted group-hover:text-basira-primary transition-colors duration-150" strokeWidth={1.5} />
                <span className="font-sans text-xs text-basira-text-muted font-light truncate">
                  Have a question about your datasets? Ask Basira now (e.g., "Show me top selling products" or "List highest accuracy records")
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-sans font-medium text-basira-primary pr-1">
                <span>Query Console</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" strokeWidth={1.5} />
              </div>
            </motion.div>
          </div>

          {/* Recent queries list */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-base font-medium text-basira-text-heading">
                Recent Queries
              </h2>
              {recentQueries.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => navigate("/history")}>
                  View All History
                </Button>
              )}
            </div>

            {recentQueries.length === 0 ? (
              <div className="border border-dashed border-basira-border-default rounded-xl p-8 text-center text-basira-text-muted text-xs font-light">
                No queries executed yet. Submit your first question inside the Query Console!
              </div>
            ) : (
              <div className="space-y-3">
                {recentQueries.map((query, index) => (
                  <motion.div
                    key={query.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    onClick={() => navigate("/query", { state: { queryId: query.id } })}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-basira-border-default rounded-xl hover:border-basira-border-subtle hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-basira-primary-light flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4 text-basira-primary" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-sans text-[13px] font-medium text-basira-text-heading truncate max-w-lg">
                          {query.question}
                        </p>
                        <p className="font-sans text-[11px] text-basira-text-muted mt-0.5 font-light">
                          Dataset: {query.datasetName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 mt-2.5 sm:mt-0 ml-11 sm:ml-0">
                      {query.chartType !== "none" && (
                        <Badge type="chart">{`${query.chartType} chart`}</Badge>
                      )}
                      <Badge type="date">{query.timestamp}</Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
