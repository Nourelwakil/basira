/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { motion } from "motion/react";
import { Upload } from "lucide-react";

interface DropZoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export default function DropZone({ onFileSelected, isLoading }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcess(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      validateAndProcess(file);
    }
  };

  const handleClick = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  const validateAndProcess = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "xlsx" || ext === "xls") {
      onFileSelected(file);
    }
  };

  return (
    <motion.div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      animate={{
        scale: isDragOver ? 1.02 : 1,
        borderColor: isDragOver ? "#2563EB" : "#E2E8F0",
        backgroundColor: isDragOver ? "#EFF6FF" : "#FFFFFF",
      }}
      transition={{ duration: 0.15 }}
      className={`relative w-full border-2 border-dashed rounded-xl p-12 text-center cursor-pointer select-none transition-shadow ${
        isLoading ? "pointer-events-none opacity-50" : "hover:shadow-sm"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        {/* Animated Upload Icon */}
        <motion.div
          animate={isDragOver ? { y: -4 } : { y: 0 }}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
            isDragOver ? "bg-[#DBEAFE] text-[#2563EB]" : "bg-[#F8FAFC] text-[#94A3B8]"
          }`}
        >
          <Upload className="w-8 h-8 animate-pulse" strokeWidth={1.2} />
        </motion.div>

        {/* Informative prompt headings */}
        <div className="space-y-1.5">
          <h3 className="font-sans text-sm font-medium text-basira-text-heading">
            {isDragOver ? "Drop to parse files" : "Drop your CSV or Excel file here"}
          </h3>
          <p className="font-sans text-xs text-basira-text-muted font-light">
            or <span className="text-[#2563EB] font-normal hover:underline">click to browse</span> your desktop works
          </p>
        </div>

        {/* Accepted extensions badge list */}
        <div className="flex gap-2.5 pt-2">
          <span className="font-mono text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-medium">CSV</span>
          <span className="font-mono text-[9px] bg-emerald-50 px-2 py-0.5 rounded text-emerald-600 font-medium">XLSX</span>
          <span className="font-mono text-[9px] bg-emerald-50 px-2 py-0.5 rounded text-emerald-600 font-medium">XLS</span>
        </div>
      </div>
    </motion.div>
  );
}
