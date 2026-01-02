import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

type SidebarProps = {
  expanded: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleExpanded: () => void;
  topOffsetPx: number;
};

const NAV_ITEMS = [
  { label: "Home / Dashboard", to: "/", icon: "fa-house" },
  { label: "Editions", to: "/editions", icon: "fa-layer-group" },
  { label: "Cards", to: "/cards", icon: "fa-id-card" },
  //{ label: "Artists", to: "/artists", icon: "fa-microphone-lines" },
  //{ label: "Trending", to: "/trending", icon: "fa-arrow-trend-up" },
];

const ADMIN_ENTRY = { label: "Administration", to: "/users", icon: "fa-gear" };

export default function Sidebar({
  expanded,
  mobileOpen,
  onCloseMobile,
  onToggleExpanded,
  topOffsetPx,
}: SidebarProps) {
  const { user, logout } = useAuth();

  const widthClass = expanded ? "w-72" : "w-20";

  return (
    <>
      {/* Mobile overlay - starts below topbar */}
      <button
        type="button"
        onClick={onCloseMobile}
        aria-label="Navigation schließen"
        className={`fixed inset-x-0 bottom-0 z-30 bg-black/50 backdrop-blur-sm md:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
        style={{ top: topOffsetPx }}
      />

      <aside
        className={[
          "z-40 md:z-10",
          "border-r border-white/10 bg-slate-950/95 backdrop-blur",
          "transition-all duration-200",
          widthClass,
          // mobile drawer
          "fixed left-0 md:sticky",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
        style={{
          top: topOffsetPx,
          height: `calc(100dvh - ${topOffsetPx}px)`,
        }}
      >
        <div className="relative flex h-full flex-col">
          {/* Nav */}
          <nav className="flex-1 px-3 pb-6 pt-6">
            <ul className="space-y-1">
              {NAV_ITEMS.map((entry) => (
                <li key={entry.to}>
                  <NavLink
                    to={entry.to}
                    end={entry.to === "/"}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-2xl px-3 py-3",
                        "text-sm font-semibold transition",
                        isActive
                          ? "bg-emerald-500/20 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                      ].join(" ")
                    }
                  >
                    <span className="inline-flex w-10 justify-center">
                      <i className={`fa-solid ${entry.icon} text-base text-white/80`} aria-hidden="true" />
                    </span>
                    {expanded && <span className="truncate">{entry.label}</span>}
                  </NavLink>
                </li>
              ))}

              {user?.type === "admin" && (
                <li className="pt-1">
                  <NavLink
                    to={ADMIN_ENTRY.to}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      [
                        "group flex items-center gap-3 rounded-2xl px-3 py-3",
                        "text-sm font-semibold transition",
                        isActive
                          ? "bg-amber-500/20 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white",
                      ].join(" ")
                    }
                  >
                    <span className="inline-flex w-10 justify-center">
                      <i className={`fa-solid ${ADMIN_ENTRY.icon} text-base text-white/80`} aria-hidden="true" />
                    </span>
                    {expanded && <span className="truncate">{ADMIN_ENTRY.label}</span>}
                  </NavLink>
                </li>
              )}
            </ul>
          </nav>

          {/* Footer actions */}
          {/* Account / User block */}
          {user && (
            <div className="px-4 pb-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                {/* Header / User */}
                <div className={`flex items-center ${expanded ? "gap-3" : "justify-center"}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60">
                    <i className="fa-solid fa-user-shield text-white/70" aria-hidden="true" />
                  </div>

                  {expanded && (
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Signed-in as</p>
                      <p className="truncate font-semibold leading-tight">{user.username}</p>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">{user.type}</p>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="my-3 h-px bg-white/10" />

                {/* Actions */}
                <div className={`grid gap-2 ${expanded ? "grid-cols-2" : "grid-cols-1"}`}>
                  <NavLink
                    to="/account"
                    onClick={onCloseMobile}
                    className={[
                      "inline-flex items-center justify-center gap-2 rounded-2xl",
                      "border border-white/10 bg-slate-900/60 px-3 py-2",
                      "text-xs font-semibold uppercase tracking-[0.3em] text-white/70",
                      "transition hover:border-white/30 hover:text-white",
                    ].join(" ")}
                    aria-label="Account"
                    title={expanded ? undefined : "Account"}
                  >
                    {!expanded && <i className="fa-solid fa-user" aria-hidden="true" />}
                    {expanded && <span>Account</span>}
                  </NavLink>

                  <button
                    type="button"
                    onClick={logout}
                    className={[
                      "inline-flex items-center justify-center gap-2 rounded-2xl",
                      "border border-rose-500/20 bg-rose-500/15 px-3 py-2",
                      "text-xs font-semibold uppercase tracking-[0.3em] text-rose-200",
                      "transition hover:border-rose-500/60 hover:text-rose-50",
                    ].join(" ")}
                    aria-label="Logout"
                    title={expanded ? undefined : "Logout"}
                  >
                    {!expanded && <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />}
                    {expanded && <span>Logout</span>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Collapse arrow – centered on sidebar edge */}
          <button
            type="button"
            onClick={onToggleExpanded}
            aria-label={expanded ? "Sidebar einklappen" : "Sidebar ausklappen"}
            className={[
              "hidden md:inline-flex",
              "absolute -right-3 top-1/2 -translate-y-1/2",
              "h-10 w-10 items-center justify-center rounded-full",
              "border border-white/10 bg-slate-900/90 shadow-lg shadow-black/40",
              "text-white/70 transition hover:text-white hover:border-white/30",
            ].join(" ")}
          >
            <i className={`fa-solid ${expanded ? "fa-chevron-left" : "fa-chevron-right"}`} aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}