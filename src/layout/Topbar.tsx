type TopbarProps = {
  onToggleMobileNav: () => void;
};

export default function Topbar({ onToggleMobileNav }: TopbarProps) {
  return (
    <header className="h-20 border-b border-white/10 bg-slate-900/80 backdrop-blur">
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left: burger + title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleMobileNav}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
            aria-label="Navigation öffnen"
          >
            <i className="fa-solid fa-bars" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.4em] text-white/40">mucajey</p>
            <p className="text-lg font-semibold text-white">Admin Console</p>
          </div>
        </div>

        {/* Right: status */}
        <div className="flex items-center gap-3 text-sm text-white/60">
          <span className="text-xs uppercase tracking-[0.4em] text-white/40">mucajey</span>
          <span className="text-xs text-white/80">Live backend</span>
        </div>
      </div>
    </header>
  );
}