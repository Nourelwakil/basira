/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useToast } from "../components/common/Toast";
import { useDataParser } from "../hooks/useDataParser";
import { ANIMATION_PRESETS } from "../utils/constants";
import DropZone from "../components/upload/DropZone";
import DataPreview from "../components/upload/DataPreview";
import Skeleton from "../components/common/Skeleton";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Button from "../components/common/Button";

export default function Upload() {
  const navigate = useNavigate();
  const { addDataset } = useData();
  const { showToast } = useToast();
  const { parsedData, loading, error, parseFile, clear } = useDataParser();

  const [activeFile, setActiveFile] = useState<File | null>(null);

  const handleFileSelected = async (file: File) => {
    setActiveFile(file);
    try {
      await parseFile(file);
      showToast("Data parsed successfully. Review your configuration below.", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to parse the uploaded file.", "error");
    }
  };

  const handleSave = async (customName: string) => {
    if (!parsedData || !activeFile) return;

    try {
      await addDataset({
        id: Math.random().toString(36).substring(2, 9),
        name: customName,
        uploadedAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        rowCount: parsedData.rowCount,
        columns: parsedData.columns,
        fileSize: formatBytes(activeFile.size),
        rawData: parsedData.rawData,
      });

      showToast(`Dataset "${customName}" is now active.`, "success");
      navigate("/query");
    } catch {
      showToast("Error registering dataset into active workspace.", "error");
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + ["B", "KB", "MB"][i];
  };

  const handleReset = () => {
    clear();
    setActiveFile(null);
  };

  return (
    <motion.div
      initial={ANIMATION_PRESETS.page.initial}
      animate={ANIMATION_PRESETS.page.animate}
      exit={ANIMATION_PRESETS.page.exit}
      transition={ANIMATION_PRESETS.page.transition}
      className="space-y-10"
    >
      {/* Dynamic Header Section */}
      <div className="flex items-center justify-between select-none">
        <div className="space-y-1.5">
          <h1 className="font-sans text-2xl font-medium tracking-tight text-basira-text-heading">
            {parsedData ? "Configuration & Inspection" : "Data Upload Console"}
          </h1>
          <p className="font-sans text-sm text-basira-text-muted font-light">
            {parsedData
              ? "Verify detected schemas, adjust name identifiers, and review database sample records."
              : "Import a .csv spreadsheet or Excel workbook containing structural data metrics."}
          </p>
        </div>

        {parsedData && (
          <Button variant="outline" size="sm" onClick={handleReset} className="flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
            <span>Upload Different File</span>
          </Button>
        )}
      </div>

      {/* Main workflow content area */}
      <div className="space-y-8">
        {/* Error notifications */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="space-y-1">
              <span className="font-sans text-xs font-medium text-red-800">Parsing Failure Detected</span>
              <p className="font-sans text-xs text-red-600 font-light leading-relaxed">{error}</p>
            </div>
          </motion.div>
        )}

        {/* 1. Upload state (DropZone) */}
        {!parsedData && !loading && (
          <div className="space-y-8">
            <DropZone onFileSelected={handleFileSelected} isLoading={loading} />

            {/* Informative Guidance Cards for visual premium balance */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
              <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-sm space-y-3">
                <span className="block font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-medium">01. Parsing Stage</span>
                <h4 className="font-sans text-sm font-medium text-basira-text-heading">Local Client Integration</h4>
                <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                  Your spreadsheets remain on your machine. All row conversions and schema analysis are completed client-side for maximum compliance.
                </p>
              </div>
              <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-sm space-y-3">
                <span className="block font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-medium">02. Auto Schema Mapping</span>
                <h4 className="font-sans text-sm font-medium text-basira-text-heading">Strict Datatype Matching</h4>
                <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                  Basira dynamically scans records to distinguish discrete continuous aggregates, string categorizations, and chronological timelines.
                </p>
              </div>
              <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-sm space-y-3">
                <span className="block font-sans text-[10px] text-basira-text-muted uppercase tracking-wider font-medium">03. High-Fidelity Querying</span>
                <h4 className="font-sans text-sm font-medium text-basira-text-heading">AI Grounding Layer</h4>
                <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                  When finalized, access natural language conversions, complex automated SQL generation, and dynamic interactive charting instantly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2. Loading state with elegant skeleton visual feedback */}
        {loading && (
          <div className="space-y-6">
            <div className="bg-white border border-basira-border-default rounded-xl p-6 space-y-4">
              <Skeleton variant="text" width="180px" />
              <div className="flex gap-4">
                <Skeleton variant="rect" height={32} width="120px" />
                <Skeleton variant="rect" height={32} width="100px" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton variant="text" width="150px" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-basira-border-default rounded-xl p-6 space-y-4 h-40">
                  <Skeleton variant="circle" height={24} width={24} />
                  <Skeleton variant="text" width="60%" />
                  <Skeleton variant="text" width="90%" />
                </div>
                <div className="bg-white border border-basira-border-default rounded-xl p-6 space-y-4 h-40">
                  <Skeleton variant="circle" height={24} width={24} />
                  <Skeleton variant="text" width="70%" />
                  <Skeleton variant="text" width="85%" />
                </div>
                <div className="bg-white border border-basira-border-default rounded-xl p-6 space-y-4 h-40">
                  <Skeleton variant="circle" height={24} width={24} />
                  <Skeleton variant="text" width="50%" />
                  <Skeleton variant="text" width="95%" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Successful conversion preview */}
        {parsedData && activeFile && !loading && (
          <DataPreview
            parsedData={parsedData}
            fileName={activeFile.name}
            fileSize={activeFile.size}
            onSave={handleSave}
          />
        )}
      </div>
    </motion.div>
  );
}
