/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Dataset {
  id: string;
  name: string;
  uploadedAt: string;
  rowCount: number;
  columns: string[];
  fileSize: string;
  rawData?: any[];
}

export type ChartType = "bar" | "line" | "pie" | "scatter" | "histogram" | "area" | "table" | "metric" | "none";

export interface ChartConfig {
  xAxisKey?: string;
  seriesKeys?: string[];
  yAxisKey?: string;
  valueKey?: string;
  categoryKey?: string;
}

export interface FilterRule {
  column: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "in";
  value: any;
}

export interface AggregateRule {
  column: string;
  type: "sum" | "avg" | "count" | "min" | "max" | "none";
}

export interface TransformationSchema {
  groupBy?: string[];
  aggregates?: Record<string, AggregateRule>;
  sort?: {
    column: string;
    direction: "asc" | "desc";
  };
  filter?: FilterRule[];
  limit?: number;
}

export interface GeminiAnalysisResult {
  chartType: ChartType;
  chartConfig: ChartConfig;
  transformation: TransformationSchema;
  insight: string;
  explanation: string;
  confidence: number;
  isUnclear?: boolean;
  followUpQuestion?: string;
}

export interface QueryRecord {
  id: string;
  datasetId: string;
  datasetName: string;
  question: string;
  timestamp: string;
  insight: string;
  explanation: string;
  confidence: number;
  chartType: ChartType;
  chartConfig: ChartConfig;
  rawResponse: GeminiAnalysisResult;
  processedData: any[];
}
