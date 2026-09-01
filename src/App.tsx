/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { useAuth } from "./context/AuthContext";
import PageLayout from "./components/layout/PageLayout";
import AuthGate from "./pages/AuthGate";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Query from "./pages/Query";
import History from "./pages/History";
import Settings from "./pages/Settings";
import WelcomeScreen from "./components/common/WelcomeScreen";
import { BrainCircuit } from "lucide-react";

// Shown once per browser session (not on every reload) so returning users
// mid-session aren't forced to sit through the animation repeatedly, while
// a genuinely new visit (new tab/session) still gets the intro.
const WELCOME_SEEN_KEY = "basira_welcome_seen";

export default function App() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const [showWelcome, setShowWelcome] = useState(
    () => !sessionStorage.getItem(WELCOME_SEEN_KEY)
  );

  const handleWelcomeFinished = () => {
    sessionStorage.setItem(WELCOME_SEEN_KEY, "1");
    setShowWelcome(false);
  };

  if (showWelcome) {
    return (
      <AnimatePresence>
        <WelcomeScreen onFinished={handleWelcomeFinished} />
      </AnimatePresence>
    );
  }

  // If Firebase Auth is checking initial session token
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4 font-sans select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
          <BrainCircuit className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Verifying security credentials...
        </p>
      </div>
    );
  }

  // Enforce mandatory login: if not logged in, render the AuthGate login screen exclusively
  if (!user) {
    return <AuthGate />;
  }

  return (
    <PageLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/query" element={<Query />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </AnimatePresence>
    </PageLayout>
  );
}
