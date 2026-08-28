/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Upload,
  MessageSquare,
  Clock,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { ANIMATION_PRESETS } from "../../utils/constants";
import { useQueryContext } from "../../context/QueryContext";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isQueryRunning, setIsQueryRunning } = useQueryContext();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPath, setPendingPath] = useState("");

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    if (isQueryRunning && path !== location.pathname) {
      e.preventDefault();
      setPendingPath(path);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmNavigate = () => {
    setShowConfirmModal(false);
    setIsQueryRunning(false);
    navigate(pendingPath);
  };

  const handleCancelNavigate = () => {
    setShowConfirmModal(false);
    setPendingPath("");
  };

  // Handle collapsible sidebar on responsive viewport widths below 768px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Upload", path: "/upload", icon: Upload },
    { name: "Query", path: "/query", icon: MessageSquare },
    { name: "History", path: "/history", icon: Clock },
    { name: "Settings", path: "/settings", icon: SettingsIcon },
  ];

  return (
    <motion.div
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={ANIMATION_PRESETS.sidebar.transition}
      className="h-screen bg-white border-r border-basira-border-default flex flex-col justify-between select-none shrink-0"
    >
      {/* Top Section */}
      <div className="flex flex-col">
        {/* Brand/Logo Area */}
        <Link
          to="/"
          onClick={(e) => handleNavClick(e, "/")}
          className={`flex items-center gap-3 h-[72px] border-b border-basira-border-subtle ${
            isCollapsed ? "justify-center px-0" : "px-6"
          }`}
        >
          {/* Brand logo (uploaded PNG, icon-only crop; wordmark rendered separately below) */}
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            <img src="/logo-icon.png" alt="Basira" className="w-full h-full object-contain" />
          </div>

          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="font-sans text-[18px] font-medium tracking-tight text-basira-text-heading"
            >
              Basira
            </motion.span>
          )}
        </Link>

        {/* Navigation list */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <div key={item.path} className="relative group/nav-item">
                <Link
                  to={item.path}
                  onClick={(e) => handleNavClick(e, item.path)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                    isActive
                      ? "bg-basira-primary-light text-basira-primary font-medium"
                      : "text-basira-text-muted hover:bg-basira-bg-surface hover:text-basira-text-body font-light"
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                    >
                      {item.name}
                    </motion.span>
                  )}
                </Link>

                {/* Collapsed side tooltip on hover */}
                {isCollapsed && (
                  <div className="absolute left-[80px] top-1/2 -translate-y-1/2 z-50 bg-basira-text-heading text-white px-3 py-1.5 rounded-md text-xs font-light tracking-wide pointer-events-none opacity-0 scale-95 group-hover/nav-item:opacity-100 group-hover/nav-item:scale-100 transition-all origin-left duration-150 shadow-md">
                    {item.name}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Collapse Trigger Toggle at Bottom */}
      <div className="p-4 border-t border-basira-border-subtle">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center p-2.5 text-basira-text-muted hover:text-basira-text-body hover:bg-basira-bg-surface rounded-lg transition-all"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <div className="flex items-center gap-2.5">
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              <span className="font-sans text-xs font-light">Collapse sidebar</span>
            </div>
          )}
        </button>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancelNavigate}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-sm bg-white border border-basira-border-default rounded-xl p-5 shadow-xl flex flex-col space-y-4"
            >
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-500">
                  <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="space-y-1 flex-1">
                  <h3 className="font-sans text-sm font-medium text-basira-text-heading">
                    Stop running query?
                  </h3>
                  <p className="font-sans text-xs text-basira-text-muted font-light leading-relaxed">
                    A query is currently in progress. If you navigate away, the execution will be terminated.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end">
                <button
                  type="button"
                  onClick={handleCancelNavigate}
                  className="px-3.5 py-2 rounded-lg border border-basira-border-default text-xs font-sans font-light text-basira-text-body hover:bg-basira-bg-surface transition-all"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleConfirmNavigate}
                  className="px-3.5 py-2 rounded-lg bg-amber-600 text-white text-xs font-sans font-medium hover:bg-amber-700 transition-all shadow-sm"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
