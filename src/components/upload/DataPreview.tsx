/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Database, ArrowRight, Table, Info } from "lucide-react";
import { ParsedDataState } from "../../hooks/useDataParser";
import Badge from "../common/Badge";
import Button from "../common/Button";

interface DataPreviewProps {
  parsedData: ParsedDataState;
  fileName: string;
  fileSize: number;
  onSave: (customName: string) => void;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default function DataPreview({
  parsedData,
  fileName,
  fileSize,
  onSave,
}: DataPreviewProps) {
  const [datasetName, setDatasetName] = useState("");

  const { rawData, columns, types, samples, rowCount } = parsedData;

  // Initialize dataset name to fileName without extension
  useEffect(() => {
    if (fileName) {
      const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf(".")) || fileName;
      // Capitalize first letters or clean up
      setDatasetName(
        nameWithoutExt
          .replace(/[_-]/g, " ")
          .trim()
      );
    }
  }, [fileName]);

  const previewRows = rawData.slice(0, 10);

  const handleProceed = () => {
    onSave(datasetName.trim() || fileName);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 select-none"
    >
      {/* Horizontal split for naming and high-level file info */}
      <div className="flex flex-col md:flex-row gap-6 items-start justify-between bg-white border border-basira-border-default rounded-xl p-6 shadow-sm">
        <div className="space-y-4 flex-1 w-full">
          <label className="block text-xs font-sans font-medium text-basira-text-muted uppercase tracking-wider">
            Define Dataset Identifier Name
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-basira-text-muted">
              <Database className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="e.g. Annual Revenue 2026"
              className="w-full pl-10 pr-4 py-2.5 bg-basira-bg-surface border border-basira-border-default rounded-lg font-sans text-xs text-basira-text-body font-light focus:outline-none focus:ring-2 focus:ring-basira-primary focus:border-transparent transition-all outline-none"
            />
          </div>
        </div>

        {/* Technical Capsule Info */}
        <div className="grid grid-cols-2 md:flex md:items-center gap-6 mt-2 md:mt-0">
          <div className="space-y-1">
            <span className="block text-[11px] font-sans text-[#94A3B8] uppercase tracking-wide">
              File Extension
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono text-xs text-basira-text-body font-normal">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              .{fileName.split(".").pop()?.toUpperCase()}
            </span>
          </div>

          <div className="w-px h-10 bg-basira-border-default hidden md:block" />

          <div className="space-y-1">
            <span className="block text-[11px] font-sans text-[#94A3B8] uppercase tracking-wide">
              File Size
            </span>
            <span className="font-mono text-xs text-basira-text-body font-light">
              {formatBytes(fileSize)}
            </span>
          </div>

          <div className="w-px h-10 bg-basira-border-default hidden md:block" />

          <div className="space-y-1">
            <span className="block text-[11px] font-sans text-[#94A3B8] uppercase tracking-wide">
              Row Count
            </span>
            <span className="font-mono text-xs text-basira-text-body font-light">
              {rowCount.toLocaleString()} lines
            </span>
          </div>

          <div className="w-px h-10 bg-basira-border-default hidden md:block" />

          <div className="space-y-1">
            <span className="block text-[11px] font-sans text-[#94A3B8] uppercase tracking-wide">
              Columns Detected
            </span>
            <span className="font-mono text-xs text-basira-text-body font-light font-sans text-xs">
              {columns.length} dimensions
            </span>
          </div>
        </div>
      </div>

      {/* Grid of parsed columns details (Schema Explorer) */}
      <div className="space-y-3">
        <h3 className="font-sans text-[12px] uppercase text-[#94A3B8] font-medium tracking-wider">
          Column Schema Specifications
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map((col, index) => {
            const sampleList = samples[col] || [];
            const colType = types[col] || "text";

            return (
              <motion.div
                key={col}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="bg-white border border-basira-border-default p-4 rounded-xl flex flex-col justify-between space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <span className="font-sans text-[13px] font-medium text-basira-text-heading truncate" title={col}>
                    {col}
                  </span>
                  <Badge type={colType === "number" ? "number" : colType === "date" ? "date" : "text"}>
                    {colType}
                  </Badge>
                </div>

                {/* Vertical lists of sample values loaded */}
                <div className="space-y-1.5 pt-1">
                  <span className="block text-[9px] uppercase tracking-wider text-[#94A3B8] font-medium">
                    Sample Records
                  </span>
                  <div className="flex flex-col gap-1">
                    {sampleList.map((val, sIdx) => (
                      <div
                        key={sIdx}
                        className="bg-basira-bg-surface border border-basira-border-subtle rounded px-2.5 py-1 font-mono text-[11px] text-basira-text-body truncate"
                      >
                        {val === "" || val === undefined || val === null ? (
                          <span className="italic text-slate-300">null</span>
                        ) : (
                          String(val)
                        )}
                      </div>
                    ))}
                    {sampleList.length === 0 && (
                      <span className="italic text-slate-300 font-sans text-[11px] font-light">
                        No non-empty samples found
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* High precision table preview area */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-basira-text-heading">
          <Table className="w-4 h-4 text-basira-text-muted" strokeWidth={1.5} />
          <h3 className="font-sans text-xs font-medium uppercase tracking-wider text-[#94A3B8]">
            Interactive Data Preview (First 10 index rows)
          </h3>
        </div>

        <div className="bg-white border border-basira-border-default rounded-xl overflow-hidden shadow-sm">
          <div className="w-full overflow-x-auto min-h-[140px] max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse font-sans text-xs select-text">
              <thead className="bg-[#F8FAFC] border-b border-basira-border-default sticky top-0 z-10 select-none">
                <tr>
                  <th className="px-5 py-3 text-[11px] text-basira-text-muted font-medium w-12 text-center bg-[#F8FAFC]">
                    #
                  </th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-5 py-3 text-[11px] text-basira-text-muted font-medium bg-[#F8FAFC] whitespace-nowrap min-w-[120px]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-basira-border-default font-light">
                {previewRows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className="hover:bg-slate-50 transition-colors bg-white odd:bg-[#F8FAFC]/40"
                  >
                    <td className="px-5 py-2.5 text-center text-[10px] text-slate-400 font-mono border-r border-basira-border-subtle bg-[#F8FAFC]/50 select-none">
                      {rIdx + 1}
                    </td>
                    {columns.map((col) => {
                      const val = row[col];
                      return (
                        <td
                          key={col}
                          className="px-5 py-2.5 text-basira-text-body font-mono text-[11px] truncate max-w-[200px]"
                          title={String(val)}
                        >
                          {val === "" || val === undefined || val === null ? (
                            <span className="italic text-slate-300">null</span>
                          ) : val instanceof Date ? (
                            val.toLocaleDateString()
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Navigation action step bar */}
      <div className="flex items-center justify-between p-6 bg-[#EFF6FF] border border-blue-100 rounded-xl">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-basira-primary shrink-0" strokeWidth={1.5} />
          <p className="font-sans text-xs text-blue-800 leading-normal font-light">
            Once saved, you can query this parsed database using natural language, run complex analytical SQL queries, and construct stunning visual charts dynamically.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={handleProceed}
          className="shrink-0 flex items-center gap-2 shadow-sm font-medium active:scale-[0.98]"
        >
          <span>Proceed to Query Console</span>
          <ArrowRight className="w-4 h-4" strokeWidth={2} />
        </Button>
      </div>
    </motion.div>
  );
}
