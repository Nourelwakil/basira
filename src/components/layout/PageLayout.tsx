/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AuthModal from "../auth/AuthModal";

interface PageLayoutProps {
  children: ReactNode;
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-basira-bg-page select-none">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Primary content area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Top brand header */}
        <TopBar />

        {/* Dynamic page contents */}
        <main className="flex-1 overflow-y-auto p-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Authentication Modal */}
      <AuthModal />
    </div>
  );
}
