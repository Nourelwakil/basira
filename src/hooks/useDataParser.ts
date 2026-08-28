/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export type DetectedType = "number" | "date" | "text" | "default";

export interface ParsedDataState {
  rawData: any[];
  columns: string[];
  types: Record<string, DetectedType>;
  samples: Record<string, any[]>;
  rowCount: number;
}

function detectColumnType(values: any[]): DetectedType {
  const validValues = values.filter(v => v !== null && v !== undefined && String(v).trim() !== "");
  if (validValues.length === 0) return "text";

  // Check if standard Date object or matching a clear Date string
  const dateRegex = /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$|^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$|^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  
  let dateMatches = 0;
  let numMatches = 0;

  validValues.forEach(v => {
    if (v instanceof Date) {
      dateMatches++;
      return;
    }
    const str = String(v).trim();
    if (dateRegex.test(str)) {
      const timestamp = Date.parse(str);
      if (!isNaN(timestamp)) {
        dateMatches++;
        return;
      }
    }

    if (typeof v === "number" && !isNaN(v)) {
      numMatches++;
      return;
    }

    // Clean currency, percentages, commas, and parentheses for negative numbers
    const cleanNumStr = str.replace(/[$,%]/g, "").replace(/^\((.*)\)$/, "-$1").trim();
    const num = Number(cleanNumStr);
    if (!isNaN(num) && cleanNumStr !== "") {
      numMatches++;
      return;
    }
  });

  const total = validValues.length;
  if (dateMatches / total >= 0.7) return "date";
  if (numMatches / total >= 0.7) return "number";

  return "text";
}

export function useDataParser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedDataState | null>(null);

  const clear = useCallback(() => {
    setParsedData(null);
    setError(null);
    setLoading(false);
  }, []);

  const parseFile = useCallback((file: File): Promise<ParsedDataState> => {
    setLoading(true);
    setError(null);

    return new Promise((resolve, reject) => {
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (fileExtension === "csv") {
        Papa.parse(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: "greedy",
          complete: (results) => {
            try {
              if (results.errors.length > 0 && results.data.length === 0) {
                const errMsg = results.errors[0]?.message || "Failed to parse CSV file.";
                setError(errMsg);
                setLoading(false);
                reject(new Error(errMsg));
                return;
              }

              const rawData = results.data as any[];
              if (rawData.length === 0) {
                const errMsg = "The uploaded CSV file contains no data rows.";
                setError(errMsg);
                setLoading(false);
                reject(new Error(errMsg));
                return;
              }

              // Extract columns
              const columnsSet = new Set<string>();
              rawData.forEach(row => {
                if (row && typeof row === "object") {
                  Object.keys(row).forEach(key => columnsSet.add(key));
                }
              });
              const columns = Array.from(columnsSet);

              // Analyze types and collect samples
              const types: Record<string, DetectedType> = {};
              const samples: Record<string, any[]> = {};

              columns.forEach(col => {
                // Collect up to 20 values for type detection
                const valuesForDetection: any[] = [];
                // Collect up to 3 values for actual display samples
                const sampleValues: any[] = [];

                for (let i = 0; i < rawData.length; i++) {
                  const val = rawData[i]?.[col];
                  if (val !== undefined && val !== null && val !== "") {
                    if (valuesForDetection.length < 20) {
                      valuesForDetection.push(val);
                    }
                    if (sampleValues.length < 3) {
                      sampleValues.push(val);
                    }
                    if (valuesForDetection.length >= 20 && sampleValues.length >= 3) {
                      break;
                    }
                  }
                }

                types[col] = detectColumnType(valuesForDetection);
                samples[col] = sampleValues;
              });

              const parsed: ParsedDataState = {
                rawData,
                columns,
                types,
                samples,
                rowCount: rawData.length,
              };

              setParsedData(parsed);
              setLoading(false);
              resolve(parsed);
            } catch (err: any) {
              const errMsg = err.message || "An unexpected error occurred parsing CSV.";
              setError(errMsg);
              setLoading(false);
              reject(err);
            }
          },
          error: (err) => {
            setError(err.message);
            setLoading(false);
            reject(err);
          },
        });
      } else if (fileExtension === "xlsx" || fileExtension === "xls") {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          try {
            const ab = e.target?.result;
            const workbook = XLSX.read(ab, { type: "array", cellDates: true });
            
            if (workbook.SheetNames.length === 0) {
              throw new Error("Excel file does not contain any sheets.");
            }

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as any[];

            if (rawData.length === 0) {
              throw new Error("The first sheet in your Excel file is completely empty.");
            }

            // Extract columns
            const columnsSet = new Set<string>();
            rawData.forEach(row => {
              if (row && typeof row === "object") {
                Object.keys(row).forEach(key => columnsSet.add(key));
              }
            });
            const columns = Array.from(columnsSet);

            // Analyze types and collect samples
            const types: Record<string, DetectedType> = {};
            const samples: Record<string, any[]> = {};

            columns.forEach(col => {
              const valuesForDetection: any[] = [];
              const sampleValues: any[] = [];

              for (let i = 0; i < rawData.length; i++) {
                const val = rawData[i]?.[col];
                if (val !== undefined && val !== null && val !== "") {
                  if (valuesForDetection.length < 20) {
                    valuesForDetection.push(val);
                  }
                  if (sampleValues.length < 3) {
                    // For UI display, convert Date objects to ISO/readable strings
                    if (val instanceof Date) {
                      sampleValues.push(val.toLocaleDateString());
                    } else {
                      sampleValues.push(val);
                    }
                  }
                  if (valuesForDetection.length >= 20 && sampleValues.length >= 3) {
                    break;
                  }
                }
              }

              types[col] = detectColumnType(valuesForDetection);
              samples[col] = sampleValues;
            });

            const parsed: ParsedDataState = {
              rawData,
              columns,
              types,
              samples,
              rowCount: rawData.length,
            };

            setParsedData(parsed);
            setLoading(false);
            resolve(parsed);
          } catch (err: any) {
            const errMsg = err.message || "An error occurred reading the Excel structure.";
            setError(errMsg);
            setLoading(false);
            reject(err);
          }
        };

        reader.onerror = () => {
          setError("File loading error.");
          setLoading(false);
          reject(new Error("File loading error."));
        };

        reader.readAsArrayBuffer(file);
      } else {
        const errMsg = `Unsupported file type: .${fileExtension}. Please upload a CSV or Excel file.`;
        setError(errMsg);
        setLoading(false);
        reject(new Error(errMsg));
      }
    });
  }, []);

  return {
    parsedData,
    loading,
    error,
    parseFile,
    clear,
  };
}
