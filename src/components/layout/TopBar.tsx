/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cloud, CloudOff, LogOut, LogIn, UserPlus } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";
import { useState } from "react";

export default function TopBar() {
  const location = useLocation();
  const { user, openAuthModal, logout } = useAuth();
  const { isSynced } = useData();
  const [showDropdown, setShowDropdown] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Dashboard";
      case "/upload":
        return "Data Upload";
      case "/query":
        return "Query";
      case "/history":
        return "Query History";
      case "/settings":
        return "Settings";
      default:
        return "Basira";
    }
  };

  const isRealUser = !!user;
  const nameInitial = user?.displayName
    ? user.displayName.charAt(0)
    : user?.email
    ? user.email.charAt(0)
    : "U";
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";

  const handleLogout = async () => {
    try {
      setShowDropdown(false);
      await logout();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="h-[72px] bg-white border-b border-basira-border-default px-8 flex items-center justify-between select-none relative z-40">
      {/* Current page title 22px/500 */}
      <div className="flex items-center gap-3">
        <h1 className="font-sans text-[22px] font-medium tracking-tight text-basira-text-heading">
          {getPageTitle()}
        </h1>

        {/* Sync Status Badge */}
        <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${
          isSynced 
            ? "bg-green-50 border border-green-100 text-green-700" 
            : "bg-amber-50 border border-amber-100 text-amber-700"
        }`}>
          {isSynced ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-green-600" />
              <span>Cloud Synced</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-amber-500" />
              <span>Local Storage</span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      {/* Help and Notification icons removed per design simplification.
          Divider kept immediately before the account capsule so spacing
          stays balanced rather than leaving a visual gap where the removed
          icons used to sit. */}
      <div className="flex items-center gap-3">
        <div className="w-px h-5 bg-basira-border-default mx-1" />

        {/* User Account Capsule / Interactive Dropdown */}
        {isRealUser ? (
          <div className="relative">
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2.5 pl-1 hover:bg-basira-bg-surface p-1.5 rounded-lg transition-all cursor-pointer border border-transparent hover:border-basira-border-subtle"
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={displayName} 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full object-cover border border-basira-primary/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-basira-primary-light flex items-center justify-center border border-basira-primary/10 select-none">
                  <span className="font-sans text-xs font-medium text-basira-primary uppercase">{nameInitial}</span>
                </div>
              )}
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="font-sans text-xs font-medium text-basira-text-heading">{displayName}</span>
                <span className="font-sans text-[10px] text-basira-text-muted font-light mt-0.5">
                  Google Account
                </span>
              </div>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-basira-border-default rounded-xl shadow-lg p-2 flex flex-col gap-1 z-50">
                <div className="px-3 py-2 border-b border-basira-border-subtle mb-1">
                  <p className="text-xs font-medium text-slate-800 truncate select-text">{displayName}</p>
                  <p className="text-[11px] text-basira-text-muted truncate select-text">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    openAuthModal();
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg w-full text-left transition-colors cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Switch Account</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg w-full text-left transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => openAuthModal()}
              id="topbar-signin-btn"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-basira-primary hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
