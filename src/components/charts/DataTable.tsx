/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, ChevronUp, ChevronsUpDown, Info } from "lucide-react";
import { parseDateTimestamp } from "../../utils/timeSeriesUtils";

interface DataTableProps {
  data: any[];
  columns: string[];
  maxHeight?: string;
  pageSize?: number;
}

export default function DataTable({
  data,
  columns,
  maxHeight = "450px",
  pageSize = 15,
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(null);

  // Sorting Handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page when query sort changes
  };

  // Memoized sorted data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;

    return [...data].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Check if they are dates / months / timestamps
      const tsA = parseDateTimestamp(valA);
      const tsB = parseDateTimestamp(valB);
      if (tsA !== null && tsB !== null) {
        return sortDirection === "asc" ? tsA - tsB : tsB - tsA;
      }

      // Check if they are numeric
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return sortDirection === "asc" ? numA - numB : numB - numA;
      }

      // Default string localCompare
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortDirection === "asc"
        ? strA.localeCompare(strB)
        : strB.localeCompare(strA);
    });
  }, [data, sortColumn, sortDirection]);

  // Pagination bounds
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, currentPage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Scrollable Container Wrapper with Sticky Header */}
      <div
        className="bg-white border border-basira-border-default rounded-xl overflow-hidden shadow-sm"
        style={{ maxHeight }}
      >
        <div className="w-full overflow-auto max-h-full">
          <table className="w-full text-left border-collapse font-sans text-xs select-text">
            <thead className="bg-[#F8FAFC] border-b border-basira-border-default sticky top-0 z-10 select-none">
              <tr>
                <th className="px-5 py-3.5 text-[11px] text-[#94A3B8] font-medium w-12 text-center bg-[#F8FAFC]">
                  #
                </th>
                {columns.map((col) => {
                  const isSorted = sortColumn === col;
                  return (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-5 py-3.5 text-[11px] text-[#94A3B8] font-medium bg-[#F8FAFC] cursor-pointer hover:bg-slate-50 hover:text-basira-text-heading transition-colors whitespace-nowrap min-w-[125px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        {isSorted ? (
                          sortDirection === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-basira-primary" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-basira-primary" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 text-slate-350 opacity-40 hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-basira-border-default font-light">
              <AnimatePresence mode="popLayout">
                {paginatedData.map((row, rIdx) => {
                  const absoluteIdx = (currentPage - 1) * pageSize + rIdx + 1;
                  return (
                    <motion.tr
                      key={row.id || `row-${absoluteIdx}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25, delay: Math.min(rIdx * 0.02, 0.2) }}
                      className="hover:bg-slate-50 transition-colors bg-white odd:bg-[#F8FAFC]/40"
                    >
                      <td className="px-5 py-2.5 text-center text-[10px] text-slate-400 font-mono border-r border-basira-border-subtle bg-[#F8FAFC]/30 select-none">
                        {absoluteIdx}
                      </td>
                      {columns.map((col) => {
                        const val = row[col];
                        return (
                          <td
                            key={col}
                            className="px-5 py-2.5 text-basira-text-body font-mono text-[11px] truncate max-w-[220px]"
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
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-1 select-none">
          <span className="font-sans text-[11px] text-basira-text-muted font-light">
            Showing records <span className="font-medium text-basira-text-heading">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium text-basira-text-heading">
              {Math.min(currentPage * pageSize, sortedData.length)}
            </span>{" "}
            of <span className="font-medium text-basira-text-heading">{sortedData.length}</span> entries
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 px-3 border border-basira-border-default rounded-lg font-sans text-xs text-basira-text-body font-medium hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                // limit page numbers if there are too many
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <div key={p} className="flex items-center gap-1">
                      {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                      <button
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg font-sans text-xs font-medium flex items-center justify-center transition-all ${
                          currentPage === p
                            ? "bg-basira-primary text-white"
                            : "border border-transparent text-basira-text-muted hover:border-basira-border-default hover:bg-white"
                        }`}
                      >
                        {p}
                      </button>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 px-3 border border-basira-border-default rounded-lg font-sans text-xs text-basira-text-body font-medium hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
