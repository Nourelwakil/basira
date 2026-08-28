/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TimeGranularity = "auto" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "raw";

export const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/**
 * Robust date parser resolving date strings, timestamps, ISO, month names, and Excel serial numbers
 */
export function parseDateTimestamp(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
  
  if (typeof val === "number") {
    // Excel date serial number (30000 to 60000 = 1982 to 2064)
    if (val > 30000 && val < 60000) {
      return (val - 25569) * 86400 * 1000;
    }
    // Unix timestamp in seconds
    if (val > 1000000000 && val < 9999999999) {
      return val * 1000;
    }
    // Unix timestamp in milliseconds
    if (val >= 1000000000000 && val < 9999999999999) {
      return val;
    }
    // Year only (e.g. 2024)
    if (val >= 1970 && val <= 2100) {
      return new Date(val, 0, 1).getTime();
    }
    return null;
  }

  const str = String(val).trim();
  if (!str) return null;

  // Clean Year only (e.g. "2024")
  if (/^\d{4}$/.test(str)) {
    const y = parseInt(str, 10);
    if (y >= 1970 && y <= 2100) {
      return new Date(y, 0, 1).getTime();
    }
  }

  // Month-Year formats like "2024-01", "2024/01", "01-2024", "01/2024"
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
    const mIdx = MONTH_NAMES_SHORT.findIndex(
      (name) => name.toLowerCase() === prefix
    );
    if (mIdx !== -1) {
      let y = parseInt(monthWithYearMatch[2], 10);
      if (y < 100) y += 2000; // e.g. "Jan-24" -> 2024
      return new Date(y, mIdx, 1).getTime();
    }
  }

  // Pure month name without year (e.g. "Jan", "January", "Feb", "February", "Aug", "August")
  const pureMonthMatch = str.match(/^([a-zA-Z]{3,9})$/);
  if (pureMonthMatch) {
    const prefix = pureMonthMatch[1].substring(0, 3).toLowerCase();
    const mIdx = MONTH_NAMES_SHORT.findIndex(
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

  // Standard Date.parse
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return parsed;
  }

  return null;
}

/**
 * Checks whether a given column in a dataset contains date/time values
 */
export function isDateColumn(data: any[], colKey: string): boolean {
  if (!data || data.length === 0 || !colKey) return false;

  const keyLower = colKey.toLowerCase();
  if (
    keyLower.includes("date") ||
    keyLower.includes("month") ||
    keyLower.includes("year") ||
    keyLower.includes("quarter") ||
    keyLower.includes("week") ||
    keyLower.includes("time") ||
    keyLower.includes("day") ||
    keyLower.includes("period") ||
    keyLower.includes("bucketed")
  ) {
    return true;
  }

  let validCount = 0;
  let dateCount = 0;
  const sampleSize = Math.min(data.length, 30);

  for (let i = 0; i < sampleSize; i++) {
    const val = data[i]?.[colKey];
    if (val !== undefined && val !== null && val !== "") {
      validCount++;
      if (parseDateTimestamp(val) !== null) {
        dateCount++;
      }
    }
  }

  return validCount > 0 && dateCount / validCount >= 0.6;
}

/**
 * Generates clean period key (for grouping) and display label (for X-Axis / Tooltip)
 */
export function getPeriodInfo(
  timestamp: number,
  granularity: TimeGranularity,
  includeYear: boolean = true
): { sortKey: string; label: string } {
  const d = new Date(timestamp);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0-11
  const date = d.getDate();

  switch (granularity) {
    case "yearly":
      return {
        sortKey: `${year}-01-01`,
        label: `${year}`,
      };

    case "quarterly": {
      const q = Math.floor(month / 3) + 1;
      return {
        sortKey: `${year}-Q${q}`,
        label: includeYear ? `Q${q} ${year}` : `Q${q}`,
      };
    }

    case "weekly": {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const mYear = monday.getFullYear();
      const mMonth = MONTH_NAMES_SHORT[monday.getMonth()];
      const mDate = monday.getDate();
      const sortKey = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, "0")}-${String(monday.getDate()).padStart(2, "0")}`;
      return {
        sortKey,
        label: `Week of ${mMonth} ${mDate}, ${mYear}`,
      };
    }

    case "daily": {
      const mName = MONTH_NAMES_SHORT[month];
      const sortKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
      return {
        sortKey,
        label: `${mName} ${date}, ${year}`,
      };
    }

    case "monthly":
    default: {
      const mName = MONTH_NAMES_SHORT[month];
      const sortKey = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      return {
        sortKey,
        label: includeYear ? `${mName} ${year}` : mName,
      };
    }
  }
}

/**
 * Determines the best automatic granularity for a set of dates
 */
export function detectBestGranularity(timestamps: number[]): "daily" | "weekly" | "monthly" | "yearly" {
  if (timestamps.length <= 1) return "monthly";

  const minTs = Math.min(...timestamps);
  const maxTs = Math.max(...timestamps);
  const diffDays = (maxTs - minTs) / (1000 * 60 * 60 * 24);

  if (diffDays <= 14) return "daily";
  if (diffDays <= 90) return "weekly";
  if (diffDays <= 365 * 3) return "monthly";
  return "yearly";
}

/**
 * Generates continuous period placeholders (e.g. all 12 months for each year) so there are no holes
 */
export function generateFullPeriodBuckets(
  timestamps: number[],
  granularity: TimeGranularity,
  seriesKeys: string[],
  singleYearMode: boolean = false
): Record<string, { sortKey: string; label: string; ts: number; count: number; seriesSums: Record<string, number>; rawRows: any[] }> {
  const buckets: Record<
    string,
    {
      sortKey: string;
      label: string;
      ts: number;
      count: number;
      seriesSums: Record<string, number>;
      rawRows: any[];
    }
  > = {};

  if (timestamps.length === 0) return buckets;

  const minYear = new Date(Math.min(...timestamps)).getFullYear();
  const maxYear = new Date(Math.max(...timestamps)).getFullYear();
  const targetMinYear = isNaN(minYear) || minYear < 1970 ? 2024 : minYear;
  const targetMaxYear = isNaN(maxYear) || maxYear < 1970 ? 2024 : maxYear;
  const isSingleYear = targetMinYear === targetMaxYear || singleYearMode;

  if (granularity === "monthly") {
    for (let y = targetMinYear; y <= targetMaxYear; y++) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(y, m, 1);
        const ts = d.getTime();
        const mName = MONTH_NAMES_SHORT[m];
        const sortKey = `${y}-${String(m + 1).padStart(2, "0")}-01`;
        const label = isSingleYear ? `${mName} ${y}` : `${mName} ${y}`;

        buckets[sortKey] = {
          sortKey,
          label,
          ts,
          count: 0,
          seriesSums: {},
          rawRows: [],
        };
        seriesKeys.forEach((key) => {
          buckets[sortKey].seriesSums[key] = 0;
        });
      }
    }
  } else if (granularity === "quarterly") {
    for (let y = targetMinYear; y <= targetMaxYear; y++) {
      for (let q = 1; q <= 4; q++) {
        const d = new Date(y, (q - 1) * 3, 1);
        const ts = d.getTime();
        const sortKey = `${y}-Q${q}`;
        const label = `Q${q} ${y}`;

        buckets[sortKey] = {
          sortKey,
          label,
          ts,
          count: 0,
          seriesSums: {},
          rawRows: [],
        };
        seriesKeys.forEach((key) => {
          buckets[sortKey].seriesSums[key] = 0;
        });
      }
    }
  } else if (granularity === "yearly") {
    for (let y = targetMinYear; y <= targetMaxYear; y++) {
      const d = new Date(y, 0, 1);
      const ts = d.getTime();
      const sortKey = `${y}-01-01`;
      const label = `${y}`;

      buckets[sortKey] = {
        sortKey,
        label,
        ts,
        count: 0,
        seriesSums: {},
        rawRows: [],
      };
      seriesKeys.forEach((key) => {
        buckets[sortKey].seriesSums[key] = 0;
      });
    }
  }

  return buckets;
}

/**
 * Aggregates dataset rows by the specified time granularity, summing numeric series.
 * Supports full calendar cycle coverage (all 12 months for monthly, all 4 quarters for quarterly).
 */
export function aggregateTimeSeriesData(
  data: any[],
  xAxisKey: string,
  seriesKeys: string[],
  granularity: TimeGranularity = "auto",
  fillCompletePeriods: boolean = false
): { aggregatedData: any[]; effectiveGranularity: TimeGranularity; isTimeBased: boolean } {
  if (!data || data.length === 0) {
    return { aggregatedData: [], effectiveGranularity: granularity, isTimeBased: false };
  }

  // Check if xAxis is indeed date-based
  const isTime = isDateColumn(data, xAxisKey);
  if (!isTime) {
    return { aggregatedData: data, effectiveGranularity: "raw", isTimeBased: false };
  }

  // Collect timestamps
  const parsedRows: { ts: number; rawRow: any }[] = [];
  const validTimestamps: number[] = [];

  data.forEach((row) => {
    const rawVal = row[xAxisKey];
    const ts = parseDateTimestamp(rawVal);
    if (ts !== null) {
      parsedRows.push({ ts, rawRow: row });
      validTimestamps.push(ts);
    } else {
      parsedRows.push({ ts: 0, rawRow: row });
    }
  });

  if (validTimestamps.length === 0) {
    return { aggregatedData: data, effectiveGranularity: "raw", isTimeBased: false };
  }

  // Choose effective granularity
  let targetGranularity = granularity;
  if (targetGranularity === "auto") {
    targetGranularity = detectBestGranularity(validTimestamps);
  }

  if (targetGranularity === "raw") {
    const sorted = [...data].sort((a, b) => {
      const tsA = parseDateTimestamp(a[xAxisKey]) ?? 0;
      const tsB = parseDateTimestamp(b[xAxisKey]) ?? 0;
      return tsA - tsB;
    });
    return { aggregatedData: sorted, effectiveGranularity: "raw", isTimeBased: true };
  }

  // Pre-seed buckets with full calendar cycle (e.g. all 12 months) if fillCompletePeriods is true
  let buckets: Record<
    string,
    {
      sortKey: string;
      label: string;
      ts: number;
      count: number;
      seriesSums: Record<string, number>;
      rawRows: any[];
    }
  > = {};

  if (fillCompletePeriods && (targetGranularity === "monthly" || targetGranularity === "quarterly" || targetGranularity === "yearly")) {
    buckets = generateFullPeriodBuckets(validTimestamps, targetGranularity, seriesKeys);
  }

  // Populate buckets with data
  parsedRows.forEach(({ ts, rawRow }) => {
    const { sortKey, label } = getPeriodInfo(ts || Date.now(), targetGranularity);

    if (!buckets[sortKey]) {
      buckets[sortKey] = {
        sortKey,
        label,
        ts,
        count: 0,
        seriesSums: {},
        rawRows: [],
      };
      seriesKeys.forEach((key) => {
        buckets[sortKey].seriesSums[key] = 0;
      });
    }

    buckets[sortKey].count += 1;
    buckets[sortKey].rawRows.push(rawRow);

    seriesKeys.forEach((key) => {
      const val = rawRow[key];
      const num = typeof val === "number" ? val : Number(String(val ?? "").replace(/[$,%]/g, "").trim());
      if (!isNaN(num)) {
        buckets[sortKey].seriesSums[key] += num;
      }
    });
  });

  // Sort buckets chronologically
  const sortedSortKeys = Object.keys(buckets).sort();

  const aggregatedData = sortedSortKeys.map((sortKey) => {
    const bucket = buckets[sortKey];
    const rowObj: Record<string, any> = {
      [xAxisKey]: bucket.label,
      _sortKey: bucket.sortKey,
      _periodTimestamp: bucket.ts,
      _itemCount: bucket.count,
    };

    seriesKeys.forEach((key) => {
      const sumVal = bucket.seriesSums[key] || 0;
      rowObj[key] = Number(sumVal.toFixed(2));
    });

    return rowObj;
  });

  return {
    aggregatedData,
    effectiveGranularity: targetGranularity,
    isTimeBased: true,
  };
}

/**
 * Computes linear regression (best fit trend line y = mx + b)
 */
export function computeLinearRegression(
  data: any[],
  seriesKey: string
): { slope: number; intercept: number; trendPoints: number[]; direction: "up" | "down" | "flat" } {
  if (!data || data.length < 2 || !seriesKey) {
    return { slope: 0, intercept: 0, trendPoints: [], direction: "flat" };
  }

  const n = data.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    const yVal = Number(data[i][seriesKey]) || 0;
    sumX += i;
    sumY += yVal;
    sumXY += i * yVal;
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, trendPoints: data.map(() => sumY / n), direction: "flat" };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  const trendPoints = data.map((_, i) => Number((slope * i + intercept).toFixed(2)));
  const direction = Math.abs(slope) < 0.001 ? "flat" : slope > 0 ? "up" : "down";

  return { slope, intercept, trendPoints, direction };
}

/**
 * Calculates high-level summary metrics for the time series header
 */
export function calculateTimeSeriesMetrics(
  data: any[],
  xAxisKey: string,
  primarySeriesKey: string
): {
  total: number;
  startVal: number;
  endVal: number;
  growthPct: number | null;
  minVal: number;
  maxVal: number;
  minLabel: string;
  maxLabel: string;
  avgVal: number;
  activePeriodCount: number;
  totalPeriodCount: number;
  direction: "up" | "down" | "flat";
} {
  if (!data || data.length === 0 || !primarySeriesKey) {
    return {
      total: 0,
      startVal: 0,
      endVal: 0,
      growthPct: null,
      minVal: 0,
      maxVal: 0,
      minLabel: "",
      maxLabel: "",
      avgVal: 0,
      activePeriodCount: 0,
      totalPeriodCount: 0,
      direction: "flat",
    };
  }

  let total = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;
  let minLabel = "";
  let maxLabel = "";
  let activeCount = 0;

  data.forEach((row) => {
    const val = Number(row[primarySeriesKey]) || 0;
    const label = String(row[xAxisKey] ?? "");

    total += val;
    if (val > 0) activeCount++;
    if (val < minVal) {
      minVal = val;
      minLabel = label;
    }
    if (val > maxVal) {
      maxVal = val;
      maxLabel = label;
    }
  });

  // Calculate first non-zero and last non-zero for real growth rate
  const nonZeroPoints = data.filter((r) => Number(r[primarySeriesKey]) > 0);
  const startVal = nonZeroPoints.length > 0 ? Number(nonZeroPoints[0][primarySeriesKey]) : Number(data[0][primarySeriesKey]) || 0;
  const endVal = nonZeroPoints.length > 0 ? Number(nonZeroPoints[nonZeroPoints.length - 1][primarySeriesKey]) : Number(data[data.length - 1][primarySeriesKey]) || 0;

  let growthPct: number | null = null;
  if (startVal !== 0) {
    growthPct = Number((((endVal - startVal) / Math.abs(startVal)) * 100).toFixed(1));
  }

  const activePeriodCount = activeCount > 0 ? activeCount : data.length;
  const avgVal = Number((total / (activePeriodCount || 1)).toFixed(2));
  const direction = endVal > startVal ? "up" : endVal < startVal ? "down" : "flat";

  return {
    total: Number(total.toFixed(2)),
    startVal,
    endVal,
    growthPct,
    minVal: minVal === Infinity ? 0 : minVal,
    maxVal: maxVal === -Infinity ? 0 : maxVal,
    minLabel,
    maxLabel,
    avgVal,
    activePeriodCount,
    totalPeriodCount: data.length,
    direction,
  };
}
