# Basira

Basira is a natural language business intelligence web application. Users upload a CSV dataset, ask questions in plain English, and receive a chart along with a plain-language insight and an explanation of why that chart type was chosen.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Express (Node.js)
- **LLM:** Google Gemini API (structured JSON output mode)
- **Auth & Data Sync:** Firebase Authentication and Firestore
- **Charting:** Recharts

## Features

- Natural language querying against uploaded CSV datasets
- Automatic chart type selection (bar, line, area, pie, scatter, histogram, table, metric card)
- Output-level explanations for each chart type decision
- Per-account data isolation with Google sign-in
- Cloud-synced query history and dataset library across devices
- Multi-model fallback cascade for Gemini API reliability

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   ```
   npm install
   ```
2. Create a `.env.local` file and set your Gemini API key:
   ```
   GEMINI_API_KEY=your_key_here
   ```
3. Run the app:
   ```
   npm run dev
   ```

## Build

```
npm run build
npm start
```

## Deployment

The app is deployed on Render, using a self-managed Firebase project for authentication and Firestore. The `GEMINI_API_KEY` is set as a server-side environment variable and is never exposed to the client.

## Known Limitations

- Dataset sync to Firestore is limited to files that serialize to under ~800KB; larger datasets work locally but won't sync across devices.
- Query result summaries are generated from a sample of up to 100 rows for large result sets.

See the project thesis documentation for a full evaluation of query interpretation accuracy, chart type selection reliability, and known failure patterns.
