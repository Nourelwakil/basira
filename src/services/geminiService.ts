/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GeminiAnalysisResult } from "../types";

interface AskGeminiParams {
  query: string;
  columns: string[];
  types: Record<string, string>;
  samples: any[];
  rowCount: number;
  apiKey?: string;
  signal?: AbortSignal;
}

/**
 * Communicates with the Express API endpoint to analyze spreadsheet data via Gemini.
 */
export async function askGemini({
  query,
  columns,
  types,
  samples,
  rowCount,
  apiKey,
  signal,
}: AskGeminiParams): Promise<GeminiAnalysisResult> {
  const response = await fetch("/api/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      query,
      columns,
      types,
      samples,
      rowCount,
      apiKey,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.error || `Failed to analyze dataset with Gemini (Status ${response.status}).`;
    if (typeof msg === "object") {
      msg = msg.message || JSON.stringify(msg);
    }
    if (typeof msg === "string" && msg.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(msg.trim());
        if (parsed.error?.message) {
          msg = parsed.error.message;
        }
      } catch {}
    }
    throw new Error(msg);
  }

  const result = await response.json();
  return result;
}

interface SummarizeParams {
  query: string;
  processedData: any[];
  transformation: any;
  columns: string[];
  rowCount: number;
  apiKey?: string;
  signal?: AbortSignal;
}

/**
 * Summarizes the filtered/aggregated processed rows using the backend Gemini model,
 * providing accurate totals and insights instead of guessing.
 */
export async function summarizeDataset({
  query,
  processedData,
  transformation,
  columns,
  rowCount,
  apiKey,
  signal,
}: SummarizeParams): Promise<{ insight: string; explanation: string }> {
  const response = await fetch("/api/summarize", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      query,
      processedData,
      transformation,
      columns,
      rowCount,
      apiKey,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let msg = errorData.error || `Failed to generate accurate summaries with Gemini (Status ${response.status}).`;
    if (typeof msg === "object") {
      msg = msg.message || JSON.stringify(msg);
    }
    if (typeof msg === "string" && msg.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(msg.trim());
        if (parsed.error?.message) {
          msg = parsed.error.message;
        }
      } catch {}
    }
    throw new Error(msg);
  }

  const result = await response.json();
  return result;
}
