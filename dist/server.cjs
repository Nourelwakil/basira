var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
function isValidGeminiApiKey(key) {
  if (typeof key !== "string") return false;
  const trimmed = key.trim();
  return trimmed.length >= 15 && !trimmed.includes(" ") && !trimmed.includes("<") && !trimmed.includes("{");
}
function handleGeminiError(err, res, defaultMsg) {
  let errMsg = err?.message || "";
  const errString = typeof err === "object" ? JSON.stringify(err) : String(err);
  console.error("Gemini operation failed:", err);
  if (typeof errMsg === "string" && errMsg.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(errMsg.trim());
      if (parsed.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch {
    }
  }
  if (errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("overloaded") || errMsg.includes("temporarily unavailable") || errString.includes("503") || errString.includes("UNAVAILABLE") || errString.includes("high demand")) {
    return res.status(503).json({
      error: `Gemini servers are currently experiencing peak global demand on this endpoint.

Our system automatically retried across fallback models. Please click "Retry Question" in a few seconds to run your analysis.`,
      retryAfter: 3,
      isHighDemand: true
    });
  }
  if (errMsg.includes("429") || errMsg.includes("Quota exceeded") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("exceeded your current quota") || errString.includes("RESOURCE_EXHAUSTED") || errString.includes("429")) {
    const retryMatch = errMsg.match(/retry in\s+([\d\.]+)\s*s/i) || errString.match(/retry in\s+([\d\.]+)\s*s/i);
    const retrySeconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : 5;
    return res.status(429).json({
      error: `Gemini request rate limit reached. Please wait ${retrySeconds} seconds, then retry your question.`,
      retryAfter: retrySeconds,
      isRateLimit: true
    });
  }
  if (errMsg.includes("API key not valid") || errMsg.includes("API_KEY_INVALID") || errString.includes("API key not valid") || errString.includes("API_KEY_INVALID") || errString.includes("INVALID_ARGUMENT") || errString.includes("400")) {
    return res.status(400).json({
      error: `The API key configured in Google AI Studio is invalid or does not have permissions to call the Gemini API.

To resolve this, please perform the following checks:
1. Ensure the "Generative Language API" is enabled in your Google Cloud Project.
2. If you restricted your API key to specific APIs, ensure that "Generative Language API" is added to the list of allowed APIs.
3. Ensure there are no application restrictions (such as IP or referrer restrictions) that prevent server-side calls.`
    });
  }
  return res.status(500).json({
    error: errMsg || defaultMsg
  });
}
async function generateWithRetry(ai, params, maxRetriesPerModel = 2) {
  const primaryModel = params.model || "gemini-3.7-flash";
  const candidateModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-3.7-flash",
    primaryModel
  ].filter((m, i, arr) => !!m && arr.indexOf(m) === i);
  let lastError = null;
  for (const modelName of candidateModels) {
    let attempt = 0;
    while (attempt <= maxRetriesPerModel) {
      try {
        const callParams = { ...params, model: modelName };
        const result = await ai.models.generateContent(callParams);
        result._modelUsed = modelName;
        return result;
      } catch (err) {
        lastError = err;
        const errMsg = err?.message || "";
        const errString = typeof err === "object" ? JSON.stringify(err) : String(err);
        const isTransient = errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("UNAVAILABLE") || errMsg.includes("high demand") || errMsg.includes("overloaded") || errMsg.includes("Quota exceeded") || errMsg.includes("temporarily unavailable") || errString.includes("429") || errString.includes("503") || errString.includes("UNAVAILABLE") || errString.includes("high demand");
        if (isTransient && attempt < maxRetriesPerModel) {
          attempt++;
          const backoffMs = attempt * 1800;
          console.warn(`[Gemini Retry] Model ${modelName} encountered transient error (${errMsg.slice(0, 100)}...). Retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetriesPerModel})...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        console.warn(`[Gemini Cascade] Switching from ${modelName} to next fallback model due to: ${errMsg.slice(0, 100)}`);
        break;
      }
    }
  }
  throw lastError;
}
function parseToTimestamp(val) {
  if (val instanceof Date) return val.getTime();
  if (typeof val !== "string" && typeof val !== "number") return null;
  const str = String(val).trim();
  if (str === "") return null;
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    if (num > 3e4 && num < 6e4) {
      return (num - 25569) * 86400 * 1e3;
    }
    if (num > 1e9 && num < 9999999999999) {
      if (num < 9999999999) return num * 1e3;
      return num;
    }
    if (num >= 2e3 && num <= 2100) {
      return new Date(num, 0, 1).getTime();
    }
    return null;
  }
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    return timestamp;
  }
  return null;
}
function detectDatasetYear(samples, columns, types = {}) {
  const yearsCount = {};
  const dateCols = Object.keys(types || {}).filter((col) => types[col] === "date");
  const checkValue = (val) => {
    if (val === void 0 || val === null) return;
    const ts = parseToTimestamp(val);
    if (ts) {
      const d = new Date(ts);
      const y = d.getFullYear();
      if (y >= 1970 && y <= 2100) {
        yearsCount[y] = (yearsCount[y] || 0) + 1;
      }
    }
  };
  if (Array.isArray(samples)) {
    samples.forEach((row) => {
      dateCols.forEach((col) => {
        checkValue(row[col]);
      });
      if (dateCols.length === 0 && Array.isArray(columns)) {
        columns.forEach((col) => {
          const val = row[col];
          if (typeof val === "string" && (val.includes("-") || val.includes("/"))) {
            checkValue(val);
          }
        });
      }
    });
  }
  const years = Object.keys(yearsCount).map(Number);
  if (years.length > 0) {
    return years.reduce((a, b) => yearsCount[a] > yearsCount[b] ? a : b);
  }
  return (/* @__PURE__ */ new Date()).getFullYear();
}
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
app.get("/api/key-status", (req, res) => {
  res.json({ configured: isValidGeminiApiKey(process.env.GEMINI_API_KEY || "") });
});
app.post("/api/query", async (req, res) => {
  try {
    const { query, columns, types, samples, rowCount, apiKey: clientApiKey } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query instruction is required." });
    }
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "No Gemini API Key found. Please configure your key in Settings > Secrets."
      });
    }
    if (!isValidGeminiApiKey(apiKey)) {
      return res.status(400).json({
        error: `Your configured GEMINI_API_KEY is invalid. Please open Google AI Studio Settings > Secrets and make sure your key is entered correctly with no trailing or leading whitespace.`
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetYear = detectDatasetYear(samples || [], columns || [], types || {});
    const refDateString = `${targetYear}-06-14`;
    const refDateFriendly = `Sunday, June 14, ${targetYear}`;
    const systemInstruction = "You are Basira, an elite business intelligence and data visualization agent.\nYour sole task is to analyze a natural language query for a dataset and return a structured JSON response specifying the best visualization style, a transformation schema, research explanation, and accuracy rating.\n\n====================================================\nCRITICAL AGGREGATION & METRIC INTERPRETATION RULES:\n====================================================\n1. NON-EXACT METRIC QUANTITIES (HEADCOUNT, COUNT, NUMBER OF ROWS):\n   When the user's query references a metric or quantity that is NOT an exact column name in the dataset (e.g., 'headcount', 'count', 'number of employees', 'total customers', 'number of orders', 'volume'), do NOT sum or aggregate unrelated numeric columns to approximate it.\n   Instead, interpret it as a row count: set aggregation to 'count' (type: 'count') and group by the categorical/tenure/segment field most relevant to the query (e.g., for 'headcount trend by years at company', group by YearsAtCompany and count rows; for 'headcount by department', group by Department and count rows).\n2. STRICT 'SUM' AND 'AVERAGE' RESTRICTION:\n   Only use 'sum' or 'avg' aggregation when the query explicitly references a numeric column that actually exists in the dataset (e.g., 'total sales', 'average salary', 'total profit', 'average monthly income').\n3. UNCERTAINTY DEFAULT TO 'COUNT':\n   If you are uncertain whether a term maps to an existing column or is an implicit count metric, ALWAYS default to 'count' rather than summing unrelated numeric fields.\n\n====================================================\nCHART SELECTION & TIME-SERIES RULES:\n====================================================\n1. WHEN TO USE 'line' (or 'area'): STRICTLY FOR CALENDAR TIME SERIES (Date, Month, Calendar Year, Quarter). This includes:\n   - A single metric over calendar time (e.g., 'revenue over time', 'monthly sales trend', 'profit each month', 'sales in 2023').\n   - A metric over calendar time broken down by category (e.g., 'Show total sales by product category for each year', 'revenue by region over months'). In this case, each category becomes a distinct line/series across the time axis (X-axis = Date/Year/Month, Series = Categories).\n2. WHEN TO USE 'bar' (CRITICAL DISTINCTION \u2014 TENURE / DURATION / AGE vs CALENDAR TIME):\n   - Non-temporal categorical comparisons (e.g., 'sales across regions', 'total profit by category', 'salary by department').\n   - TENURE, DURATION, EXPERIENCE, OR AGE METRICS (e.g., 'YearsAtCompany', 'YearsInCurrentRole', 'TotalWorkingYears', 'YearsSinceLastPromotion', 'Age', 'Tenure'): Even if the user says 'trend' (such as 'Show headcount trend by years at company' or 'salary trend by age'), these are discrete duration/tenure bins, NOT calendar dates! ALWAYS use 'bar' for tenure/duration/age queries, grouping by the tenure column (e.g., groupBy: ['YearsAtCompany']) and sorting ascending { column: 'YearsAtCompany', direction: 'asc' }.\n   - Headcount / Employee count queries: Set aggregate type to 'count' (or sum on EmployeeCount).\n3. NEVER GROUP BY A RAW DATE COLUMN (FOR CALENDAR DATES). A query like 'revenue by month' or 'trend over time' must never return groupBy: ['Order Date'] or groupBy: ['Date'] using the bare column name. A raw date column has one unique value per row, which produces one data point per transaction instead of per time period, making the chart unreadable and the underlying computation wrong.\n4. ALWAYS SPECIFY THE BUCKETING LEVEL IN THE COLUMN NAME ITSELF FOR DATES. Return the groupBy value as the exact phrase '[DateColumnName] bucketed monthly' for month-level trends, or '[DateColumnName] bucketed yearly' for year-level trends. The phrase must literally contain the word 'monthly' or 'yearly' \u2014 this is how the system recognizes bucketing intent.\n   - 'Show total revenue by month over time' -> groupBy: ['Order Date bucketed monthly'], chartType: 'line', chartConfig: { xAxisKey: 'Order Date bucketed monthly', seriesKeys: ['Total Revenue'] }\n   - 'Show total sales by product category for each year' -> groupBy: ['Order Date bucketed yearly', 'Category'], chartType: 'line', chartConfig: { xAxisKey: 'Order Date bucketed yearly' }\n   - 'Sales by region over time' -> groupBy: ['Order Date bucketed monthly', 'Region'], chartType: 'line', chartConfig: { xAxisKey: 'Order Date bucketed monthly' }\n   - 'Show headcount trend by years at company' -> groupBy: ['YearsAtCompany'], chartType: 'bar', sort: { column: 'YearsAtCompany', direction: 'asc' }, chartConfig: { xAxisKey: 'YearsAtCompany' }\n5. VAGUE TREND QUERIES ON CALENDAR DATA ('show me the trend', 'show me revenue over time') still require bucketing. Do not treat vagueness as permission to skip the 'bucketed monthly'/'bucketed yearly' phrase \u2014 apply the same rule as a clear query, defaulting to monthly granularity and 'line' chart.\n6. DO NOT TRUNCATE. Use the full dataset for the aggregation, not a sample or preview subset. A trend chart missing months from the middle or end of the date range is a critical failure, even if the chart type itself is correct. NEVER add limit on time-series queries.\n\nCRITICAL RULE ON WHOLE DATASET INTEGRITY & NO UNSOLICITED DATE FILTERS:\n- NEVER add date filters or date range boundaries (e.g. gte/lte) unless the user EXPLICITLY mentions a specific date or time window in their prompt (e.g., 'in March 2024', 'for 2023', 'last week').\n- For general trend, line chart, or performance questions (e.g., 'sales trend', 'revenue over time', 'show data over months', 'line chart of profit'), you MUST process the ENTIRE dataset across all available months and years. Do NOT restrict or filter to a single year or sub-period.\n- NEVER set a 'limit' parameter on temporal / trend / line / area queries. Every single period from the whole dataset must be rendered.\n\nCRITICAL RULE ON HELPFULNESS AND AUTO-MAPPING:\n- NEVER reject standard business metrics or brief questions (like 'show sales', 'revenue', 'total profit', 'count', 'march') as unclear. You must ALWAYS try to resolve them into a proper chart and transformation query.\n- If the user specifies a brief metric name (e.g., 'sales' or 'orders'), automatically map it to the corresponding numeric column in the active dataset inventory.\n- Do NOT set isUnclear to true unless the inputs are completely blank, gibberish, or a totally non-analytic general chat unrelated to the dataset.\n\nCRITICAL RELEVANCE RULES:\n- Verify if the user's natural language question is related to the presented dataset columns or analytical metrics. Non-analytical queries or general conversation should be rejected with chartType: 'none', explanation: 'Filtered out because the question is unrelated to the active dataset context.'\n\nUNCLEAR QUERY CRITERIA:\n- Set 'isUnclear' to true ONLY if the input is totally nonsensical, completely empty, or has absolute zero correlation to any available data variables. For any actual dataset column inquiries, map them immediately.\n\nDATA TRANSFORMATION SPECIFICATION:\n1. Filter: Arrays of rules applied to raw columns with operators: 'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in'. ONLY use if user explicitly filtered.\n2. GroupBy: Array of columns to merge rows by. MUST use '[DateColumnName] bucketed monthly' or '[DateColumnName] bucketed yearly' when grouping by date.\n3. Aggregates: Specify columns to calculate. Example:\n   [ { 'outputColumn': 'Total Sales', 'rawColumn': 'Sales', 'type': 'sum' } ]\n4. Sort: Sort specification { column, direction: 'asc'|'desc' }.\n5. Limit: Restrict returned rows (e.g. for top 10 items). NEVER limit temporal line charts.\n\nVISUALIZATION MAPPING RULES (Based strictly on Munzner 2014 Framework & Query Intent):\n1. TREND OVER TIME ('line' or 'area'): Temporal dimension on X-axis (Year, Month, Date). Use 'line' for single trends as well as multi-category trends over time (e.g. sales by category for each year -> 'line'). groupBy: ['[DateColumnName] bucketed yearly', 'Category'], sort: asc.\n2. CATEGORY COMPARISON ('bar'): Non-temporal categorical dimension compared across a quantitative metric (e.g., profit across regions, revenue by category, department salary comparisons).\n3. RANKING ('bar'): Top-N or bottom-N sorted comparisons (e.g., 'top 10 sub-categories', 'best sellers', 'highest earning job roles'). Set sort direction 'desc' and specify appropriate limit.\n4. PART-OF-WHOLE / COMPOSITION ('pie'): Proportions, shares, percentages, or breakdowns across <= 8 categories (e.g., '% of sales by category', 'break down workforce by education field', 'overtime vs non-overtime proportion').\n5. DISTRIBUTION / SPREAD ('histogram'): Frequency distribution or spread of a SINGLE numeric variable across all records without an explicit grouping category (e.g., 'distribution of discount values', 'tell me about the discounts', 'distribution of monthly income'). Set chartConfig: { valueKey: '<numericColumn>' }, transformation with groupBy: [] and aggregates: [].\n6. CORRELATION / BIVARIATE RELATIONSHIP ('scatter'): Relationship or correlation between TWO numeric columns (e.g., discount vs profit, age vs monthly income). Set chartConfig: { xAxisKey: '<numericCol1>', yAxisKey: '<numericCol2>' }, transformation with groupBy: [] and aggregates: [].\n7. SINGLE KPI RETRIEVAL ('metric'): A single aggregate summary value across all records without categorical breakdown (e.g., 'total revenue across all orders', 'total sales'). Set transformation with groupBy: [] and single aggregate.\n8. MULTI-DIMENSIONAL LOOKUP ('table'): Complex raw reference lookups requiring multiple tabular columns.\n\nFEW-SHOT EXAMPLES (Munzner 2014 Intent Classes):\n\u2022 Query: 'Show headcount trend by years at company' or 'headcount by years at company' -> Intent: Comparison/Distribution -> chartType: 'bar', groupBy: ['YearsAtCompany'], aggregates: [{ outputColumn: 'Headcount', rawColumn: 'YearsAtCompany', type: 'count' }], sort: { column: 'YearsAtCompany', direction: 'asc' }, chartConfig: { xAxisKey: 'YearsAtCompany' }.\n\u2022 Query: 'Attrition count by department' -> Intent: Comparison -> chartType: 'bar', groupBy: ['Department'], aggregates: [{ outputColumn: 'Count', rawColumn: 'Department', type: 'count' }], chartConfig: { xAxisKey: 'Department' }.\n\u2022 Query: 'Show total sales by product category for each year' -> chartType: 'line', groupBy: ['Order Date bucketed yearly', 'Category'], aggregates: [{ outputColumn: 'Total Sales', rawColumn: 'Sales', type: 'sum' }], sort: { column: 'Order Date bucketed yearly', direction: 'asc' }, chartConfig: { xAxisKey: 'Order Date bucketed yearly' }.\n\u2022 Query: 'Show total revenue by month over time' -> chartType: 'line', groupBy: ['Order Date bucketed monthly'], aggregates: [{ outputColumn: 'Total Revenue', rawColumn: 'Revenue', type: 'sum' }], sort: { column: 'Order Date bucketed monthly', direction: 'asc' }, chartConfig: { xAxisKey: 'Order Date bucketed monthly', seriesKeys: ['Total Revenue'] }.\n\u2022 Query: 'Show me the trend' or 'Revenue over time' -> chartType: 'line', groupBy: ['Order Date bucketed monthly'], aggregates: [{ outputColumn: 'Total Revenue', rawColumn: 'Revenue', type: 'sum' }], sort: { column: 'Order Date bucketed monthly', direction: 'asc' }, chartConfig: { xAxisKey: 'Order Date bucketed monthly', seriesKeys: ['Total Revenue'] }.\n\u2022 Query: 'Compare total profit across all regions' -> Intent: Comparison -> 'bar', groupBy: ['Region'], aggregates: [{ outputColumn: 'Total Profit', rawColumn: 'Profit', type: 'sum' }].\n\u2022 Query: 'Show top 10 sub-categories by total sales' -> Intent: Ranking -> 'bar', groupBy: ['Sub-Category'], sort: { column: 'Total Sales', direction: 'desc' }, limit: 10.\n\u2022 Query: 'What percentage of total sales does each category represent?' -> Intent: Composition -> 'pie', groupBy: ['Category'].\n\u2022 Query: 'Tell me about the discounts' -> Intent: Distribution -> 'histogram', valueKey: 'Discount', no groupBy.\n\u2022 Query: 'Is there a correlation between discount and profit?' -> Intent: Correlation -> 'scatter', xAxisKey: 'Discount', yAxisKey: 'Profit', no groupBy.\n\u2022 Query: 'What is the total revenue across all orders?' -> Intent: Single KPI -> 'metric', single sum aggregate.\n\nBe highly analytical, smart, eager to generate charts, and compliant.";
    const contents = `User Natural Language Question: "${query}"

Dataset Columns: ${JSON.stringify(columns)}
Detected Column Types: ${JSON.stringify(types)}
Total Row Count: ${rowCount}
Random Preview Samples: ${JSON.stringify(samples)}
`;
    const response = await generateWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          required: ["isUnclear", "followUpQuestion", "chartType", "chartConfig", "transformation", "explanation", "confidence"],
          properties: {
            isUnclear: {
              type: import_genai.Type.BOOLEAN,
              description: "True if user query is too brief, vague, or lacks details to form a proper query."
            },
            followUpQuestion: {
              type: import_genai.Type.STRING,
              description: "Suggest a clear, helpful analytical query template to the user if isUnclear is true. Otherwise empty string."
            },
            chartType: {
              type: import_genai.Type.STRING,
              enum: ["bar", "line", "pie", "scatter", "histogram", "area", "table", "metric", "none"],
              description: "The targeted chart rendering type."
            },
            chartConfig: {
              type: import_genai.Type.OBJECT,
              description: "Mapping of series/axes keys for Recharts rendering.",
              properties: {
                xAxisKey: { type: import_genai.Type.STRING },
                seriesKeys: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                yAxisKey: { type: import_genai.Type.STRING },
                valueKey: { type: import_genai.Type.STRING },
                categoryKey: { type: import_genai.Type.STRING }
              }
            },
            transformation: {
              type: import_genai.Type.OBJECT,
              description: "Specs for client pipeline filtering, grouping, aggregating, and sorting.",
              properties: {
                groupBy: { type: import_genai.Type.ARRAY, items: { type: import_genai.Type.STRING } },
                aggregates: {
                  type: import_genai.Type.ARRAY,
                  items: {
                    type: import_genai.Type.OBJECT,
                    required: ["outputColumn", "rawColumn", "type"],
                    properties: {
                      outputColumn: { type: import_genai.Type.STRING },
                      rawColumn: { type: import_genai.Type.STRING },
                      type: { type: import_genai.Type.STRING, enum: ["sum", "avg", "count", "min", "max", "none"] }
                    }
                  }
                },
                sort: {
                  type: import_genai.Type.OBJECT,
                  properties: {
                    column: { type: import_genai.Type.STRING },
                    direction: { type: import_genai.Type.STRING, enum: ["asc", "desc"] }
                  }
                },
                filter: {
                  type: import_genai.Type.ARRAY,
                  items: {
                    type: import_genai.Type.OBJECT,
                    required: ["column", "operator", "value"],
                    properties: {
                      column: { type: import_genai.Type.STRING },
                      operator: { type: import_genai.Type.STRING, enum: ["eq", "neq", "gt", "lt", "gte", "lte", "contains", "in"] },
                      value: { type: import_genai.Type.STRING }
                    }
                  }
                },
                limit: { type: import_genai.Type.INTEGER }
              }
            },
            explanation: {
              type: import_genai.Type.STRING,
              description: "A friendly, professional sentence justifying the chart layout matching the query."
            },
            confidence: {
              type: import_genai.Type.INTEGER,
              description: "Estimated accuracy score between 0 and 100."
            }
          }
        }
      }
    });
    let text = response.text || "{}";
    text = text.trim();
    if (text.startsWith("```")) {
      const match = text.match(/^(?:```(?:json)?\n?)([\s\S]*?)(?:\n?```)$/);
      if (match) {
        text = match[1].trim();
      }
    }
    const boundaryMatch = text.match(/(\{[\s\S]*\})/);
    if (boundaryMatch) {
      text = boundaryMatch[1];
    }
    const resultObj = JSON.parse(text.trim());
    resultObj.modelUsed = response._modelUsed || "unknown";
    return res.json(resultObj);
  } catch (err) {
    return handleGeminiError(err, res, "An error occurred calling the Gemini intelligence server.");
  }
});
app.post("/api/summarize", async (req, res) => {
  try {
    const { query, processedData, transformation, columns, rowCount, apiKey: clientApiKey } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "No Gemini API Key found."
      });
    }
    if (!isValidGeminiApiKey(apiKey)) {
      return res.status(400).json({
        error: `Your configured GEMINI_API_KEY is invalid. Please open Google AI Studio Settings > Secrets and make sure your key is entered correctly with no trailing or leading whitespace.`
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const targetYear = detectDatasetYear(processedData || [], columns || []);
    const systemInstruction = `You are Basira, an elite business intelligence and data visualization agent.
Your sole task is to analyze the actual mathematically aggregated dataset rows matching a user's question, and write an intuitive, plain-spoken plain-language plain-English summary reporting exact figures (total revenue, number of orders, quantity sold, average order values, top products).

CRITICAL MATHEMATICAL INTEGRITY MANDATES:
1. REPORT ABSOLUTE ACCURATE VALUES: Read from the REAL PROCESSED DATA array. Calculate or sum actual indicators (e.g. add the column values, count the results, determine top items). Do NOT guess, improvise, or invent numbers under any circumstances.
2. CONVERT CURRENCY: Represent money outputs cleanly formatted as standard currency ($XX,XXX.XX).
3. LAYPERSON DESIGN: Translate analytical jargon into friendly, accessible explanation. Tell exactly what the data means simply, formatted as clear bullet points or a short brief overview.
4. If the dataset rows are empty, state clearly that no records matched the date filters or boundaries specified in the dataset scale.
5. Treat the current year context of the dataset as ${targetYear}.`;
    const contents = `User Question: "${query}"
Original Dataset Columns: ${JSON.stringify(columns)}
Global Dataset Size: ${rowCount} total rows
Applied Transformation Query: ${JSON.stringify(transformation)}

REAL MATHEMATICALLY PROCESSED RECORD ROWS (Source of Truth):
${JSON.stringify((processedData || []).slice(0, 100))}

Return a structured JSON object containing 'insight' and 'explanation'.`;
    const response = await generateWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          required: ["insight", "explanation"],
          properties: {
            insight: {
              type: import_genai.Type.STRING,
              description: "Professional, plain-spoken analytical insight detailing the raw totals, trends, or results computed directly from the processed dataset array."
            },
            explanation: {
              type: import_genai.Type.STRING,
              description: "A short professional 1-2 sentence explainability statement detailing why the visual chart layout accurate matches the request context."
            }
          }
        }
      }
    });
    let text = response.text || "{}";
    text = text.trim();
    if (text.startsWith("```")) {
      const match = text.match(/^(?:```(?:json)?\n?)([\s\S]*?)(?:\n?```)$/);
      if (match) {
        text = match[1].trim();
      }
    }
    const boundaryMatch = text.match(/(\{[\s\S]*\})/);
    if (boundaryMatch) {
      text = boundaryMatch[1];
    }
    const resultObj = JSON.parse(text.trim());
    resultObj.modelUsed = response._modelUsed || "unknown";
    return res.json(resultObj);
  } catch (err) {
    return handleGeminiError(err, res, "An error occurred compiling dynamic summaries.");
  }
});
app.post("/api/test-connection", async (req, res) => {
  try {
    const { apiKey: clientApiKey } = req.body;
    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: "Gemini API key is required for verification." });
    }
    if (!isValidGeminiApiKey(apiKey)) {
      return res.status(400).json({
        error: `Your configured GEMINI_API_KEY is invalid. Please open Google AI Studio Settings > Secrets and make sure your key is entered correctly with no trailing or leading whitespace.`
      });
    }
    const ai = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: "Respond with only one word: Connected."
    });
    const text = response.text || "";
    if (text.toLowerCase().includes("connect") || text.trim().length > 0) {
      return res.json({ success: true, message: "Successfully connected to Gemini API!" });
    } else {
      return res.status(500).json({ error: "Unexpected response from Gemini API." });
    }
  } catch (err) {
    return handleGeminiError(err, res, "Failed to authenticate with Gemini API.");
  }
});
async function initializeServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Basira Backend] Server running on port ${PORT}`);
  });
}
initializeServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
