/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings as SettingsIcon,
  Database,
  Info,
  Trash2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Key,
  CheckCircle2,
  User,
  LogIn,
  LogOut,
  KeyRound,
} from "lucide-react";
import { useData } from "../context/DataContext";
import { useQueryContext } from "../context/QueryContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/common/Toast";
import { ANIMATION_PRESETS } from "../utils/constants";

export default function Settings() {
  const { datasets, removeDataset } = useData();
  const { removeQueriesByDatasetId } = useQueryContext();
  const { user, openAuthModal, logout } = useAuth();
  const { showToast } = useToast();

  const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/key-status")
      .then((res) => res.json())
      .then((data) => {
        setIsApiConfigured(!!data.configured);
      })
      .catch((err) => {
        console.error("Error fetching key status:", err);
        setIsApiConfigured(false);
      });
  }, []);

  // Modal deletion validation states
  const [datasetToDelete, setDatasetToDelete] = useState<{ id: string; name: string } | null>(null);

  const isRealUser = !!user;

  const handleSignOut = async () => {
    try {
      await logout();
      showToast("Signed out successfully.", "info");
    } catch (e) {
      console.error(e);
      showToast("Error signing out.", "error");
    }
  };

  // Confirm and delete target spreadsheet dataset
  const handleDeleteDataset = async () => {
    if (!datasetToDelete) return;
    try {
      await removeQueriesByDatasetId(datasetToDelete.id);
      await removeDataset(datasetToDelete.id);
      showToast(`Dataset "${datasetToDelete.name}" and all branching queries successfully removed.`, "success");
    } catch {
      showToast("Error occurred wiping reference structures.", "error");
    } finally {
      setDatasetToDelete(null);
    }
  };

  return (
    <motion.div
      initial={ANIMATION_PRESETS.page.initial}
      animate={ANIMATION_PRESETS.page.animate}
      exit={ANIMATION_PRESETS.page.exit}
      transition={ANIMATION_PRESETS.page.transition}
      className="space-y-10"
    >
      {/* Title Header */}
      <div className="space-y-1.5 select-none">
        <h1 className="font-sans text-2xl font-medium tracking-tight text-basira-text-heading">
          System Settings
        </h1>
        <p className="font-sans text-sm text-basira-text-muted font-light">
          Configure authentication, database parameters, and connection keys.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left and Center Settings Options (2 columns) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section: Firebase Authentication Profile */}
          <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <User className="w-4 h-4 text-basira-primary" strokeWidth={1.5} />
                <h2 className="font-sans text-sm font-medium text-basira-text-heading">
                  User Authentication
                </h2>
              </div>
              <div>
                {isRealUser ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Authenticated
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    Guest Session
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {isRealUser ? (
                <div className="p-4 bg-slate-50 border border-basira-border-subtle rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-sans text-xs font-semibold text-slate-800">
                      {user.displayName || "Registered User"}
                    </p>
                    <p className="font-sans text-[11px] text-basira-text-muted">
                      {user.email} • Google Sign-In
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSignOut}
                      className="px-3 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                  <p className="font-sans text-xs text-slate-700 leading-relaxed">
                    You are currently on a guest session. Sign in with your Google account to sync your private datasets and queries securely.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => openAuthModal()}
                      className="px-4 py-2 bg-basira-primary hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 1: API Configuration Status */}
          <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-basira-primary" strokeWidth={1.5} />
                <h2 className="font-sans text-sm font-medium text-basira-text-heading">
                  Gemini API Connection
                </h2>
              </div>
              <div>
                {isApiConfigured === null ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-100 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" />
                    Checking Connection...
                  </span>
                ) : isApiConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Securely Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 font-sans">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Key Not Set
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {isApiConfigured ? (
                <div className="p-3.5 bg-emerald-50/40 border border-emerald-100/50 rounded-lg space-y-1.5">
                  <p className="font-sans text-xs font-medium text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Active Connection Verified
                  </p>
                  <p className="font-sans text-[11px] text-emerald-700 font-light leading-relaxed">
                    Your Gemini API key is active on the server. The application is fully prepared to execute dynamic business queries and generate visualizations.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/40 border border-amber-100/50 rounded-lg space-y-1.5">
                  <p className="font-sans text-xs font-medium text-amber-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Action Required
                  </p>
                  <p className="font-sans text-[11px] text-amber-700 font-light leading-relaxed">
                    No active key detected in the workspace environment. Please locate the **Secrets** panel in the Google AI Studio UI and configure a key named <code className="px-1 py-0.5 bg-amber-100/50 rounded font-mono text-[10px]">GEMINI_API_KEY</code>.
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5">
                <p className="font-sans text-xs font-medium text-slate-800 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  How Google AI Studio Secures Your Key
                </p>
                <p className="font-sans text-[11px] text-basira-text-muted font-light leading-relaxed">
                  To align with modern security principles, API credentials are never compiled or stored in the browser. Instead, they are securely managed in the developer environment and injected only in the server-side backend.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Data Management */}
          <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between select-none">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-basira-primary" strokeWidth={1.5} />
                <h2 className="font-sans text-sm font-medium text-basira-text-heading">
                  Connected Datasets
                </h2>
              </div>
              <span className="font-mono text-xs text-basira-primary font-medium px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                {datasets.length} registered
              </span>
            </div>

            {datasets.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-basira-border-default rounded-lg bg-basira-bg-surface select-none">
                <p className="font-sans text-xs text-basira-text-muted font-light">
                  No active datasets registered to wipe or verify.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/60 rounded-xl overflow-hidden shadow-sm">
                {datasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="p-4 md:p-5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50/40 transition-colors"
                  >
                    <div className="flex items-start gap-3 truncate">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5 select-none">
                        <FileSpreadsheet className="w-5 h-5" strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1 truncate select-none">
                        <h3 className="font-sans text-xs font-medium text-slate-800 truncate" title={dataset.name}>
                          {dataset.name}
                        </h3>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 font-sans text-[10px] text-slate-400 font-light">
                          <span>{dataset.rowCount} rows</span>
                          <span>•</span>
                          <span>{dataset.fileSize}</span>
                          <span>•</span>
                          <span>Imported: {new Date(dataset.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => setDatasetToDelete({ id: dataset.id, name: dataset.name })}
                      className="p-2 border border-slate-100 bg-white hover:border-red-200 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Delete dataset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section 3: About (Right Info Sidebar - 1 column) */}
        <div className="space-y-8 select-none">
          <div className="bg-white border border-basira-border-default rounded-xl p-6 shadow-card space-y-6">
            <div className="flex items-center gap-2.5">
              <Info className="w-4 h-4 text-basira-primary" strokeWidth={1.5} />
              <h2 className="font-sans text-sm font-medium text-basira-text-heading">
                About Basira
              </h2>
            </div>

            <div className="flex flex-col items-center justify-center p-4 text-center space-y-5">
              {/* Brand logo (uploaded PNG, icon-only crop) */}
              <div className="w-32 h-16 flex items-center justify-center select-none pointer-events-none">
                <img src="/logo-icon.png" alt="Basira" className="w-full h-full object-contain" />
              </div>

              <div className="space-y-1">
                <p className="font-sans text-base font-medium text-basira-text-heading tracking-tight leading-none">
                  Basira
                </p>
                <p className="font-mono text-[10px] text-basira-text-muted tracking-wider uppercase">
                  Version 1.0.0
                </p>
              </div>

              <div className="pt-4 border-t border-basira-border-subtle w-full text-left space-y-2.5 font-sans text-xs text-basira-text-body font-light leading-normal">
                <p>
                  <span className="text-basira-text-muted font-normal block uppercase text-[10px] tracking-wider leading-none mb-0.5">Author</span>
                  Noureldeen Elwakil
                </p>
                <p>
                  <span className="text-basira-text-muted font-normal block uppercase text-[10px] tracking-wider leading-none mb-0.5">Degree</span>
                  M.Sc. Computer Science, IU Berlin
                </p>
                <p>
                  <span className="text-basira-text-muted font-normal block uppercase text-[10px] tracking-wider leading-none mb-0.5">Supervisor</span>
                  Dr. Bernhard von Guretzky
                </p>
                <p>
                  <span className="text-basira-text-muted font-normal block uppercase text-[10px] tracking-wider leading-none mb-0.5">Year</span>
                  2026
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation Modal */}
      <AnimatePresence>
        {datasetToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDatasetToDelete(null)}
              className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-sm cursor-default"
            />

            {/* Modal Dialog container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-2xl p-6 overflow-hidden space-y-5"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 text-red-500 flex items-center justify-center shrink-0 mt-0.5 select-none">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="space-y-1.5 select-none">
                  <h3 className="font-sans text-sm font-medium text-slate-800">
                    Wipe reference structures?
                  </h3>
                  <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                    You are trying to delete <span className="font-medium text-slate-700">"{datasetToDelete.name}"</span>. Removing this dataset will break any dashboard telemetry referencing its parameters.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1.5 select-none">
                <button
                  onClick={() => setDatasetToDelete(null)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium active:scale-[0.98] transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteDataset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium active:scale-[0.98] transition-all cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
