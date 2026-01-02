import { useQuery } from '@tanstack/react-query';
import { statsApi } from '../lib/api';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsApi.getDashboard().then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-200">Lade Statistiken...</div>
      </div>
    );
  }

  if (!stats) {
    return <div>Keine Daten verfügbar</div>;
  }

  const summary = stats.summary;
  const editions = stats.editions ?? [];

  const spotifyPercentage = summary.total_cards
    ? (summary.cards_with_spotify_id / summary.total_cards) * 100
    : 0;
  const applePercentage = summary.total_cards
    ? (summary.cards_with_apple_id / summary.total_cards) * 100
    : 0;
  const bothPercentage = summary.total_cards
    ? (summary.cards_with_both_streaming / summary.total_cards) * 100
    : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12 text-center lg:text-left">
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 text-base text-white/70">
            Überblick über Inhalte, Streaming-Coverage und Editionen.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-4 mb-10">
          {[
            {
              label: 'Total Cards',
              value: summary.total_cards,
              accent: 'from-indigo-500 to-slate-900',
              icon: '🎵'
            },
            {
              label: 'Editionen',
              value: summary.total_editions,
              accent: 'from-emerald-500 to-cyan-900',
              icon: '📚'
            }
          ].map((card) => (
            <article
              key={card.label}
              className="rounded-3xl bg-gradient-to-br shadow-[0_20px_60px_rgba(15,23,42,0.5)] p-6 text-white"
            >
              <div className="text-4xl" aria-hidden>
                {card.icon}
              </div>
              <p className="mt-3 text-sm uppercase tracking-[0.4em] text-white/50">{card.label}</p>
              <p className="text-3xl font-semibold leading-tight">{card.value}</p>
            </article>
          ))}
        </div>

        <div className="rounded-[32px] bg-white/10 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Streaming Coverage</p>
              <h2 className="text-xl font-semibold text-white">Prozentualer Stand</h2>
            </div>
            <p className="text-sm text-white/60">
              {summary.cards_with_spotify_id} Spotify · {summary.cards_with_apple_id} Apple · {summary.cards_with_both_streaming} Beide
            </p>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { title: 'Spotify IDs', percentage: spotifyPercentage, color: 'bg-emerald-400' },
              { title: 'Apple IDs', percentage: applePercentage, color: 'bg-red-400' },
              { title: 'Both Services', percentage: bothPercentage, color: 'bg-sky-400' }
            ].map((metric) => (
              <div key={metric.title}>
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>{metric.title}</span>
                  <span>{metric.percentage.toFixed(1)}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10">
                  <div
                    className={`${metric.color} h-2 rounded-full`}
                    style={{ width: `${metric.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-[32px] bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Alle Editionen</h2>
            </div>
            <p className="text-sm text-white/60">{editions.length} Editionen geladen</p>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            {editions.map((edition) => (
              <article key={edition.edition_id} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-black/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{edition.edition_name}</h3>
                </div>
                <p className="mt-2 text-sm text-white/60">Identifier: {edition.identifier || '—'}</p>
                <p className="text-sm text-white/60">{edition.cardCount} Karten</p>
                <p className="text-sm text-white/60">
                  Sprache: {edition.language_long || edition.language_short || '—'}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
