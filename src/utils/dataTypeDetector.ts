/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Programmatic scan to classify columns into distinct logical datatypes ('number' | 'date' | 'text')
 */
export function detectColumnTypes(
  rawData: any[] | undefined,
  columns: string[]
): Record<string, "number" | "date" | "text"> {
  const result: Record<string, "number" | "date" | "text"> = {};

  if (!rawData || rawData.length === 0) {
    columns.forEach((col) => {
      result[col] = "text";
    });
    return result;
  }

  columns.forEach((col) => {
    let numberCount = 0;
    let dateCount = 0;
    let textCount = 0;
    let validSampleCount = 0;

    // Sample up to 50 rows for robust scanning
    const samples = rawData.slice(0, 50);
    samples.forEach((row) => {
      const val = row[col];
      if (val === undefined || val === null || val === "") return;

      validSampleCount++;
      const valStr = String(val).trim();

      // Check if it's numeric (including currency formats, percentages, commas, negative formats)
      const cleanNumStr = valStr.replace(/[$,%]/g, "").replace(/^\((.*)\)$/, "-$1").trim();
      const num = Number(cleanNumStr);
      if (!isNaN(num) && cleanNumStr !== "" && !isNaN(parseFloat(cleanNumStr))) {
        numberCount++;
        return;
      }

      // Check if it's a date representation (including month names or quarters)
      const isMonthName = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/i.test(valStr);
      const isQuarter = /^(q[1-4]|20\d{2}[-/ ]?q[1-4]|q[1-4][-/ ]?20\d{2})/i.test(valStr);
      const dateCheck = Date.parse(valStr);
      const yearMatch = /\b(19|20)\d{2}\b/.test(valStr);
      const dashOrSlash = valStr.includes("-") || valStr.includes("/") || valStr.includes(".");

      if (isMonthName || isQuarter || (!isNaN(dateCheck) && (yearMatch || dashOrSlash) && isNaN(Number(valStr)))) {
        dateCount++;
        return;
      }

      textCount++;
    });

    if (validSampleCount === 0) {
      result[col] = "text";
    } else if (numberCount / validSampleCount > 0.6) {
      result[col] = "number";
    } else if (dateCount / validSampleCount > 0.6) {
      result[col] = "date";
    } else {
      result[col] = "text";
    }
  });

  return result;
}
