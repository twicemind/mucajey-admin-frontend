import { Outlet } from "react-router-dom";
import { useCallback, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const TOPBAR_H = 80; // px

export function AppShell() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);

  const toggleSidebarExpanded = useCallback(() => setSidebarExpanded(v => !v), []);
  const toggleSidebarMobile = useCallback(() => setSidebarOpenMobile(v => !v), []);
  const closeSidebarMobile = useCallback(() => setSidebarOpenMobile(false), []);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Topbar full width */}
      <div
        className="sticky top-0 z-30"
        style={{ height: TOPBAR_H }}
      >
        <Topbar onToggleMobileNav={toggleSidebarMobile} />
      </div>

      {/* Body under topbar */}
      <div
        className="flex"
        style={{ minHeight: `calc(100dvh - ${TOPBAR_H}px)` }}
      >
        <Sidebar
          expanded={sidebarExpanded}
          mobileOpen={sidebarOpenMobile}
          onCloseMobile={closeSidebarMobile}
          onToggleExpanded={toggleSidebarExpanded}
          topOffsetPx={TOPBAR_H}
        />

        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;