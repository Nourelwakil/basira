/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sparkles } from "lucide-react";

interface SuggestedQuestionsProps {
  columns: string[];
  types: Record<string, "number" | "date" | "text">;
  onSelectQuestion: (question: string) => void;
}

export default function SuggestedQuestions({
  columns,
  types,
  onSelectQuestion,
}: SuggestedQuestionsProps) {
  // Categorize columns
  const numCols = columns.filter((col) => types[col] === "number");
  const dateCols = columns.filter((col) => types[col] === "date");
  const textCols = columns.filter((col) => types[col] === "text");

  // Generate 4-5 balanced template questions
  const generated: string[] = [];

  // Helper selectors
  const num1 = numCols[0];
  const num2 = numCols[1] || numCols[0];
  const date1 = dateCols[0];
  const text1 = textCols[0];

  // 1. Always total
  if (num1) {
    generated.push(`What is the total ${num1}?`);
  }

  // 2. number + date trend
  if (num1 && date1) {
    generated.push(`Show ${num1} trend over ${date1}`);
  } else if (num1 && text1) {
    // Fallback if no date but text
    generated.push(`Compare ${num1} by ${text1}`);
  }

  // 3. number + text compare
  if (num1 && text1) {
    generated.push(`Compare ${num1} by ${text1}`);
  } else if (num2 && num1 && num2 !== num1) {
    generated.push(`Show correlation between ${num1} and ${num2}`);
  }

  // 4. multiple numbers / correlation
  if (num1 && num2 && num1 !== num2) {
    generated.push(`Correlation between ${num1} and ${num2}`);
  } else if (textCols.length > 1) {
    generated.push(`Count of records by ${textCols[0]}`);
  }

  // 5. standard breakdown fallback
  if (numCols.length > 0 && textCols.length > 0) {
    const text2 = textCols[1] || textCols[0];
    generated.push(`Average ${num1} breakdown by ${text2}`);
  } else {
    // Pure fallback if dataset has random schema
    if (columns.length > 0) {
      generated.push(`Display summary table of the dataset`);
    }
  }

  // Unique elements only, limited to 4-5
  const uniqueQuestions = Array.from(new Set(generated)).slice(0, 5);

  if (uniqueQuestions.length === 0) {
    return (
      <span className="text-xs text-[#94A3B8] font-light italic">
        Upload files to gain dynamic recommended questions.
      </span>
    );
  }

  return (
    <div className="space-y-2.5">
      {uniqueQuestions.map((q, idx) => (
        <button
          key={idx}
          onClick={() => onSelectQuestion(q)}
          className="w-full text-left p-3 rounded-lg border border-basira-border-default hover:border-[#D1E0FF] hover:bg-[#F3F7FF] text-basira-text-muted hover:text-basira-primary transition-all duration-150 cursor-pointer flex items-start gap-2.5 group active:scale-[0.98]"
        >
          <Sparkles className="w-3.5 h-3.5 mt-0.5 text-basira-primary/60 group-hover:text-basira-primary group-hover:animate-pulse transition-colors shrink-0" />
          <span className="font-sans text-xs font-light leading-relaxed select-none">
            {q}
          </span>
        </button>
      ))}
    </div>
  );
}
