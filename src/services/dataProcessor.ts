/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeminiAnalysisResult, FilterRule } from "../types";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

/**
 * Utility to check if a value is purely numeric
 */
function isNumeric(val: any): boolean {
  if (typeof val === "number") return !isNaN(val);
  if (typeof val === "string") {
    const cleaned = val.trim();
    if (cleaned === "") return false;
    const num = Number(cleaned.replace(/[$,%]/g, "").replace(/^\((.*)\)$/, "-$1"));
    return !isNaN(num);
  }
  return false;
}

/**
 * Robust date parser resolving strings, timestamps, month names, and Excel numbers to millisecond timestamps.
 */
function parseToTimestamp(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
  if (typeof val !== "string" && typeof val !== "number") return null;

  const str = String(val).trim();
  if (str === "") return null;

  // Excel serial numbers or standard Unix timestamps
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    // Excel date range (30000 - 60000 corresponds to 1982 - 2064)
    if (num > 30000 && num < 60000) {
      return (num - 25569) * 86400 * 1000;
    }
    // Unix timestamp in seconds or milliseconds
    if (num > 1000000000 && num < 9999999999999) {
      if (num < 9999999999) return num * 1000;
      return num;
    }
    // Clean year like "2024"
    if (num >= 1970 && num <= 2100) {
      return new Date(num, 0, 1).getTime();
    }
    return null;
  }

  // Month-Year formats like "2024-01", "01/2024", "Jan 2024"
  if (/^\d{4}[-/]\d{1,2}$/.test(str)) {
    const [y, m] = str.split(/[-/]/).map(Number);
    return new Date(y, m - 1, 1).getTime();
  }
  if (/^\d{1,2}[-/]\d{4}$/.test(str)) {
    const [m, y] = str.split(/[-/]/).map(Number);
    return new Date(y, m - 1, 1).getTime();
  }

  // "Jan 2024", "Feb 2024", "January 2024", "Jan-24", "August 2024", etc.
  const monthWithYearMatch = str.match(/^([a-zA-Z]{3,9})[-/\s,]+(\d{2,4})$/);
  if (monthWithYearMatch) {
    const prefix = monthWithYearMatch[1].substring(0, 3).toLowerCase();
    const mIdx = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === prefix
    );
    if (mIdx !== -1) {
      let y = parseInt(monthWithYearMatch[2], 10);
      if (y < 100) y += 2000;
      return new Date(y, mIdx, 1).getTime();
    }
  }

  // Pure month names without year (e.g. "January", "Jan", "August", "Aug")
  const pureMonthMatch = str.match(/^([a-zA-Z]{3,9})$/);
  if (pureMonthMatch) {
    const prefix = pureMonthMatch[1].substring(0, 3).toLowerCase();
    const mIdx = MONTH_NAMES.findIndex(
      (name) => name.toLowerCase() === prefix
    );
    if (mIdx !== -1) {
      return new Date(2024, mIdx, 1).getTime();
    }
  }

  // Quarter format like "2024-Q1", "Q1 2024", "2024 Q1", "Q1"
  const qMatch = str.match(/^(?:(\d{4})[-/ ]?Q([1-4])|Q([1-4])[-/ ]?(\d{4})|Q([1-4]))$/i);
  if (qMatch) {
    const y = parseInt(qMatch[1] || qMatch[4] || "2024", 10);
    const q = parseInt(qMatch[2] || qMatch[3] || qMatch[5] || "1", 10);
    return new Date(y, (q - 1) * 3, 1).getTime();
  }

  // Standard string formats
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    return timestamp;
  }
  return null;
}

/**
 * Safe conversion to number
 */
function toNum(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (val === undefined || val === null) return 0;
  const str = String(val).trim();
  if (str === "") return 0;
  const cleaned = str.replace(/[$,%]/g, "").replace(/^\((.*)\)$/, "-$1").trim();
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Helper to get field value with case/whitespace-insensitive matching and date resolution
 */
function getFieldValue(row: any, col: string): any {
  if (!row || typeof row !== "object" || !col) return "";
  if (row[col] !== undefined && row[col] !== null) {
    return row[col];
  }

  const colTrimmed = col.trim();
  const colLower = colTrimmed.toLowerCase();

  // Check for explicit bucketing phrases: "[Column] bucketed monthly", "[Column] bucketed yearly", etc.
  const isBucketedMonthly = colLower.includes("bucketed monthly") || colLower.includes("monthly") || colLower === "month";
  const isBucketedYearly = colLower.includes("bucketed yearly") || colLower.includes("yearly") || colLower === "year";
  const isBucketedQuarterly = colLower.includes("bucketed quarterly") || colLower.includes("quarterly") || colLower === "quarter";

  if (isBucketedMonthly || isBucketedYearly || isBucketedQuarterly) {
    // Extract base column name if present
    const baseCol = colTrimmed
      .replace(/\s*bucketed\s+(monthly|yearly|quarterly)/gi, "")
      .replace(/\s*(monthly|yearly|quarterly)/gi, "")
      .trim();

    let rawDateVal = null;
    if (baseCol && row[baseCol] !== undefined && row[baseCol] !== null) {
      rawDateVal = row[baseCol];
    } else if (baseCol) {
      const matchKey = Object.keys(row).find((k) => k.toLowerCase() === baseCol.toLowerCase());
      if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
        rawDateVal = row[matchKey];
      }
    }

    // Fallback to finding any date/time column if not found on baseCol
    if (rawDateVal === null) {
      for (const key of Object.keys(row)) {
        if (
          key.toLowerCase().includes("date") ||
          key.toLowerCase().includes("time") ||
          key.toLowerCase().includes("day") ||
          key.toLowerCase().includes("month") ||
          key.toLowerCase().includes("year")
        ) {
          const ts = parseToTimestamp(row[key]);
          if (ts !== null) {
            rawDateVal = row[key];
            break;
          }
        }
      }
    }

    if (rawDateVal !== null) {
      const ts = parseToTimestamp(rawDateVal);
      if (ts !== null) {
        const d = new Date(ts);
        if (isBucketedMonthly) {
          return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
        }
        if (isBucketedYearly) {
          return String(d.getFullYear());
        }
        if (isBucketedQuarterly) {
          const q = Math.floor(d.getMonth() / 3) + 1;
          return `Q${q} ${d.getFullYear()}`;
        }
      }
    }
  }

  const colClean = colLower.replace(/[\s_-]/g, "");

  // 1. Case-insensitive lookup fallback
  const matchingKey = Object.keys(row).find((k) => k.toLowerCase() === colLower);
  if (matchingKey !== undefined) return row[matchingKey];

  // 2. Whitespace and separator agnostic fallback
  const matchingCleanKey = Object.keys(row).find(
    (k) => k.toLowerCase().replace(/[\s_-]/g, "") === colClean
  );
  if (matchingCleanKey !== undefined) return row[matchingCleanKey];

  return "";
}

/**
 * Executes full client-side pipeline: filters -> groups & aggregates -> sorts -> limits.
 */
export function processDataset(
  rawRows: any[],
  schema: GeminiAnalysisResult["transformation"]
): any[] {
  if (!rawRows || rawRows.length === 0) return [];
  if (!schema) return rawRows;

  // Normalize aggregates list to standard record mapping if array is passed
  let normalizedAggregates: Record<string, { column: string; type: string }> = {};
  if (schema.aggregates) {
    if (Array.isArray(schema.aggregates)) {
      schema.aggregates.forEach((item: any) => {
        if (item && item.outputColumn) {
          normalizedAggregates[item.outputColumn] = {
            column: item.rawColumn || item.column,
            type: item.type || "sum",
          };
        }
      });
    } else {
      normalizedAggregates = schema.aggregates;
    }
  }

  const normalizedSchema = {
    ...schema,
    aggregates: normalizedAggregates,
  };

  let processed = [...rawRows];

  // 1. Filtering
  if (normalizedSchema.filter && normalizedSchema.filter.length > 0) {
    processed = processed.filter((row) => {
      return (normalizedSchema.filter || []).every((f: FilterRule) => {
        const val = getFieldValue(row, f.column);
        if (val === undefined || val === null || val === "") {
          return f.operator === "neq";
        }

        const rowValStr = String(val).toLowerCase();
        const filterValStr = String(f.value).toLowerCase();

        const dateVal = parseToTimestamp(val);
        const dateFilter = parseToTimestamp(f.value);
        const bothAreDates = dateVal !== null && dateFilter !== null;

        switch (f.operator) {
          case "eq":
            if (bothAreDates) return dateVal === dateFilter;
            return rowValStr === filterValStr;
          case "neq":
            if (bothAreDates) return dateVal !== dateFilter;
            return rowValStr !== filterValStr;
          case "gt":
            if (bothAreDates) return dateVal > dateFilter;
            return toNum(val) > toNum(f.value);
          case "lt":
            if (bothAreDates) return dateVal < dateFilter;
            return toNum(val) < toNum(f.value);
          case "gte":
            if (bothAreDates) return dateVal >= dateFilter;
            return toNum(val) >= toNum(f.value);
          case "lte":
            if (bothAreDates) return dateVal <= dateFilter;
            return toNum(val) <= toNum(f.value);
          case "contains":
            if (bothAreDates) {
              const dV = new Date(dateVal);
              const dF = new Date(dateFilter);
              return dV.getFullYear() === dF.getFullYear() && dV.getMonth() === dF.getMonth();
            }
            return rowValStr.includes(filterValStr);
          case "in":
            const valuesList = Array.isArray(f.value)
              ? f.value.map((v) => String(v).toLowerCase())
              : String(f.value).split(",").map((s) => s.trim().toLowerCase());
            return valuesList.includes(rowValStr);
          default:
            return true;
        }
      });
    });
  }

  // 2. Grouping & Aggregates
  const hasGroupBy = normalizedSchema.groupBy && normalizedSchema.groupBy.length > 0;
  const hasAggregates = normalizedSchema.aggregates && Object.keys(normalizedSchema.aggregates).length > 0;

  if (hasGroupBy) {
    const rawGroupCols = normalizedSchema.groupBy || [];
    const isMultiDim = rawGroupCols.length === 2;
    const groups: Record<string, any[]> = {};

    processed.forEach((row) => {
      const keyParts = rawGroupCols.map((col) => {
        const val = getFieldValue(row, col);
        return String(val ?? "");
      });
      const key = keyParts.join("||");
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    // If 2 grouping dimensions (e.g. Year and Category), pivot rows for grouped Recharts rendering
    if (isMultiDim) {
      const primaryCol = rawGroupCols[0];
      const secondaryCol = rawGroupCols[1];
      const primaryKeysSet = new Set<string>();
      const secondaryKeysSet = new Set<string>();

      const cellValues: Record<string, Record<string, number>> = {};

      Object.entries(groups).forEach(([groupKey, rowsInGroup]) => {
        const [pVal, sVal] = groupKey.split("||");
        primaryKeysSet.add(pVal);
        secondaryKeysSet.add(sVal);

        if (!cellValues[pVal]) {
          cellValues[pVal] = {};
        }

        let aggVal = 0;
        if (hasAggregates && normalizedSchema.aggregates) {
          const firstAgg = Object.values(normalizedSchema.aggregates)[0];
          const rawCol = firstAgg.column;
          if (firstAgg.type === "count") {
            aggVal = rowsInGroup.length;
          } else if (firstAgg.type === "avg") {
            const sum = rowsInGroup.reduce((acc, r) => acc + toNum(getFieldValue(r, rawCol)), 0);
            aggVal = rowsInGroup.length > 0 ? Number((sum / rowsInGroup.length).toFixed(2)) : 0;
          } else {
            aggVal = Number(rowsInGroup.reduce((acc, r) => acc + toNum(getFieldValue(r, rawCol)), 0).toFixed(2));
          }
        } else {
          aggVal = rowsInGroup.length;
        }

        cellValues[pVal][sVal] = aggVal;
      });

      const pivotedRows: any[] = [];
      const sortedPrimaryKeys = Array.from(primaryKeysSet).sort((a, b) => {
        const tsA = parseToTimestamp(a);
        const tsB = parseToTimestamp(b);
        if (tsA !== null && tsB !== null) return tsA - tsB;
        return a.localeCompare(b);
      });
      const secondaryKeysList = Array.from(secondaryKeysSet).sort();

      sortedPrimaryKeys.forEach((pVal) => {
        const rowObj: Record<string, any> = { [primaryCol]: pVal };
        
        // Add helpful aliases for chart rendering
        const pLower = primaryCol.toLowerCase();
        if (pLower.includes("monthly") || pLower.includes("month")) {
          rowObj["Month"] = pVal;
        }
        if (pLower.includes("yearly") || pLower.includes("year")) {
          rowObj["Year"] = pVal;
        }
        const baseCol = primaryCol.replace(/\s*bucketed\s+(monthly|yearly|quarterly)/gi, "").trim();
        if (baseCol && baseCol !== primaryCol) {
          rowObj[baseCol] = pVal;
        }

        secondaryKeysList.forEach((sVal) => {
          rowObj[sVal] = cellValues[pVal]?.[sVal] || 0;
        });
        pivotedRows.push(rowObj);
      });

      (pivotedRows as any)._seriesKeys = secondaryKeysList;
      (pivotedRows as any)._xAxisKey = primaryCol;

      processed = pivotedRows;
    } else {
      // Standard 1-dimension GroupBy
      processed = Object.keys(groups).map((groupKey) => {
        const rowsInGroup = groups[groupKey];
        const modelRow = rowsInGroup.length > 0 ? rowsInGroup[0] : null;
        const resultRow: Record<string, any> = {};

        rawGroupCols.forEach((col) => {
          resultRow[col] = groupKey;
          const cLower = col.toLowerCase();
          if (cLower.includes("monthly") || cLower.includes("month")) {
            resultRow["Month"] = groupKey;
          }
          if (cLower.includes("yearly") || cLower.includes("year")) {
            resultRow["Year"] = groupKey;
          }
          const baseCol = col.replace(/\s*bucketed\s+(monthly|yearly|quarterly)/gi, "").trim();
          if (baseCol && baseCol !== col) {
            resultRow[baseCol] = groupKey;
          }
        });

        if (hasAggregates && normalizedSchema.aggregates) {
          Object.entries(normalizedSchema.aggregates).forEach(([outColName, aggDef]) => {
            const { column: rawColName, type: aggType } = aggDef;

            if (rowsInGroup.length === 0) {
              resultRow[outColName] = 0;
              return;
            }

            switch (aggType) {
              case "sum":
                resultRow[outColName] = Number(rowsInGroup.reduce((sum, r) => sum + toNum(getFieldValue(r, rawColName)), 0).toFixed(2));
                break;
              case "avg":
                const totalSum = rowsInGroup.reduce((sum, r) => sum + toNum(getFieldValue(r, rawColName)), 0);
                resultRow[outColName] = rowsInGroup.length > 0 ? Number((totalSum / rowsInGroup.length).toFixed(2)) : 0;
                break;
              case "count":
                resultRow[outColName] = rowsInGroup.length;
                break;
              case "min":
                const valsMin = rowsInGroup.map((r) => toNum(getFieldValue(r, rawColName)));
                resultRow[outColName] = valsMin.length > 0 ? Math.min(...valsMin) : 0;
                break;
              case "max":
                const valsMax = rowsInGroup.map((r) => toNum(getFieldValue(r, rawColName)));
                resultRow[outColName] = valsMax.length > 0 ? Math.max(...valsMax) : 0;
                break;
              case "none":
              default:
                resultRow[outColName] = modelRow ? getFieldValue(modelRow, rawColName) : "";
                break;
            }
          });
        } else {
          // No aggregates were specified alongside a groupBy. Rather than guessing
          // by summing every numeric column in the dataset (which produces garbage
          // multi-series charts for queries like "headcount trend"), default to a
          // row count. This is the same safe default the model is instructed to use
          // for implicit count metrics, applied defensively in case the model's
          // response omits aggregates entirely.
          resultRow["Count"] = rowsInGroup.length;
        }

        return resultRow;
      });
    }
  } else if (hasAggregates && normalizedSchema.aggregates) {
    // If every aggregate is type "none" (a raw pass-through column, used for
    // correlation/distribution queries with no real aggregation), collapsing
    // to a single summary row is wrong, that discards all but one row, which
    // is exactly why correlation and distribution queries were returning a
    // single meaningless data point instead of the full raw dataset. Treat
    // this case the same as having no aggregates at all: return the raw rows
    // untouched, only when aggregation is actually requested (at least one
    // non-"none" type) does collapsing to a single summary row make sense.
    const allNone = Object.values(normalizedSchema.aggregates).every((agg: any) => agg.type === "none");
    if (allNone) {
      // no-op: fall through with `processed` left as the raw row set
    } else {
      const resultRow: Record<string, any> = {};
      Object.entries(normalizedSchema.aggregates).forEach(([outColName, aggDef]) => {
        const { column: rawColName, type: aggType } = aggDef;

        switch (aggType) {
          case "sum":
            resultRow[outColName] = Number(processed.reduce((sum, r) => sum + toNum(getFieldValue(r, rawColName)), 0).toFixed(2));
            break;
          case "avg":
            const totalSum = processed.reduce((sum, r) => sum + toNum(getFieldValue(r, rawColName)), 0);
            resultRow[outColName] = processed.length > 0 ? Number((totalSum / processed.length).toFixed(2)) : 0;
            break;
          case "count":
            resultRow[outColName] = processed.length;
            break;
          case "min":
            const valsMin = processed.map((r) => toNum(getFieldValue(r, rawColName)));
            resultRow[outColName] = valsMin.length > 0 ? Math.min(...valsMin) : 0;
            break;
          case "max":
            const valsMax = processed.map((r) => toNum(getFieldValue(r, rawColName)));
            resultRow[outColName] = valsMax.length > 0 ? Math.max(...valsMax) : 0;
            break;
          case "none":
          default:
            resultRow[outColName] = getFieldValue(processed[0], rawColName) ?? null;
            break;
        }
      });
      processed = [resultRow];
    }
  }

  // 3. Sorting (with chronological date awareness)
  if (normalizedSchema.sort && normalizedSchema.sort.column) {
    const sortCol = normalizedSchema.sort.column;
    const isDesc = normalizedSchema.sort.direction === "desc";

    processed.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];
      if (valA === undefined) valA = a["Month"] ?? a["Year"] ?? a[Object.keys(a)[0]];
      if (valB === undefined) valB = b["Month"] ?? b["Year"] ?? b[Object.keys(b)[0]];

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      // Check if both are dates/timestamps/month strings
      const tsA = parseToTimestamp(valA);
      const tsB = parseToTimestamp(valB);
      if (tsA !== null && tsB !== null) {
        return isDesc ? tsB - tsA : tsA - tsB;
      }

      if (isNumeric(valA) && isNumeric(valB)) {
        return isDesc ? toNum(valB) - toNum(valA) : toNum(valA) - toNum(valB);
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return isDesc ? strB.localeCompare(strA) : strA.localeCompare(strB);
    });
  }

  // 4. Limit (Do not truncate if grouping by temporal trend mode)
  const isTemporalGroup = (normalizedSchema.groupBy || []).some(
    (g) =>
      g.toLowerCase().includes("month") ||
      g.toLowerCase().includes("date") ||
      g.toLowerCase().includes("quarter") ||
      g.toLowerCase().includes("bucketed") ||
      g.toLowerCase().includes("year")
  );

  if (!isTemporalGroup && normalizedSchema.limit && normalizedSchema.limit > 0) {
    processed = processed.slice(0, normalizedSchema.limit);
  }

  return processed;
}
