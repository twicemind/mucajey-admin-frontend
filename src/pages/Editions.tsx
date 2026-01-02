import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { editionsApi } from '../lib/api';

interface SyncResult {
  message: string;
  edition_id: string;
  edition: string;
  playlistId?: string;
  playlistUrl?: string;
  country?: string;
  statistics: {
    totalCards: number;
    updated: number;
    skipped: number;
    notFound: number;
    playlistTracks?: number;
  };
  updates?: Array<{
    cardId: string;
    title: string;
    artist: string;
    spotifyTrack?: string;
    spotifyArtists?: string[];
    itunesTrack?: string;
    itunesArtist?: string;
  }>;
}

interface EditionForm {
  edition_id: string;
  edition_name: string;
  language_short: string;
  language_long: string;
  identifier: string;
  spotify_playlist: string;
}

const initialFormData: EditionForm = {
  edition_id: '',
  edition_name: '',
  language_short: 'de',
  language_long: 'Deutsch',
  identifier: '',
  spotify_playlist: '',
};

export default function Editions() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [selectedFile, setSelectedFile] = useState('');
  const [formData, setFormData] = useState<EditionForm>(initialFormData);

  const queryClient = useQueryClient();

  const { data: editions = [], isLoading } = useQuery({
    queryKey: ['editions'],
    queryFn: editionsApi.getAll
  });

  const editionCount = editions.length;
  console.log('Editionen insgesamt:', editionCount);
  console.log('Editionen Daten:', editions);
  console.log('totalCards:', editions.reduce((acc, edition) => acc + (edition.cardCount || 0), 0));
  const totalCards = useMemo(
    () => editions.reduce((acc, edition) => acc + (edition.cardCount || 0), 0),
    [editions]
  );
  const languageCount = useMemo(() => {
    const langs = new Set<string>();
    editions.forEach((entry) => {
      const value = entry.language_long || entry.language_short;
      if (value) langs.add(value);
    });
    return langs.size;
  }, [editions]);

  const createEditionMutation = useMutation({
    mutationFn: (payload: EditionForm) =>
      editionsApi.create({
        edition_id: payload.edition_id.trim(),
        edition_name: payload.edition_name.trim(),
        language_short: payload.language_short.trim() || undefined,
        language_long: payload.language_long.trim() || undefined,
        identifier: payload.identifier.trim(),
        spotify_playlist: payload.spotify_playlist.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editions'] });
      setShowCreateModal(false);
      setFormData({ ...initialFormData });
    }
  });

  const syncSpotifyMutation = useMutation({
    mutationFn: (edition_id: string) => editionsApi.syncSpotifyPlaylist(edition_id),
    onSuccess: (data) => {
      setSyncResult(data.data as SyncResult);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['editions'] });
    }
  });

  const syncItunesMutation = useMutation({
    mutationFn: (edition_id: string) => editionsApi.syncItunesMusic(edition_id),
    onSuccess: (data) => {
      setSyncResult(data.data as SyncResult);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['editions'] });
    }
  });

  const handleSyncClick = (edition_id: string) => {
    setSelectedFile(edition_id);
    setSyncResult(null);
    setShowSyncModal(true);
    syncSpotifyMutation.mutate(edition_id);
  };

  const handleItunesSyncClick = (edition_id: string) => {
    setSelectedFile(edition_id);
    setSyncResult(null);
    setShowSyncModal(true);
    syncItunesMutation.mutate(edition_id);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createEditionMutation.mutate(formData);
  };

  const creationError =
    createEditionMutation.error as (Error & { response?: { data?: { error?: string } } }) | undefined;
  const createErrorMessage = creationError?.response?.data?.error || creationError?.message || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="text-sm font-semibold text-white/70">Lade Editionen…</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute -top-28 left-1/3 h-80 w-80 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-5%] h-96 w-96 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-12 text-center lg:text-left">
          <p className="text-xs uppercase tracking-[0.45em] text-white/45">Edition Portfolio</p>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Editionen verwalten
              </h1>
              <p className="mt-2 text-base text-white/70">
                Überblick über alle Editionen, ihre Sprachen und Streaming-Stati.
              </p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-full
                        bg-gradient-to-r from-indigo-500 to-fuchsia-500
                        px-6 text-xs font-semibold uppercase tracking-[0.35em] text-white
                        shadow-xl shadow-indigo-500/30 transition hover:opacity-95"
            >
              <span className="text-white/90">+</span>
              Neue Edition
            </button>
          </div>

          {/* KPI Row wie vorher – aber ohne Header-Rahmen */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Edition Files</p>
              <p className="mt-2 text-3xl font-semibold text-white">{editionCount}</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Cards</p>
              <p className="mt-2 text-3xl font-semibold text-white">{totalCards}</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Sprachen</p>
              <p className="mt-2 text-3xl font-semibold text-white">{languageCount}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/60">Editionen</p>
              <h2 className="text-2xl font-semibold text-white">Alle Editionen</h2>
            </div>
            <p className="text-xs text-white/60">{editionCount} Dateien · {totalCards} Cards</p>
          </div>

          <div className="mt-6 flex flex-col gap-6">
  {editions.map((edition) => {
    const isSpecial = edition.edition_id === 'hitster-de-import.json';
    const hasArtwork = Boolean(edition.image?.href && edition.image.exists);
    const imageUrl = hasArtwork ? edition.image?.href : undefined;

    const identifierLabel = edition.identifier ? `#${edition.identifier.toUpperCase()}` : `#${(edition.edition_id || '').slice(-8).toUpperCase() || 'UNKNOWN'}`;
    const title = edition.edition_name || edition.edition_id || 'Unbenannte Edition';
    const cardsLabel = `${edition.cardCount ?? 0} CARDS`;

    return (
      <article
        key={edition.edition_id}
        className="group rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/40 to-slate-900/70 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          {/* LEFT: Cover */}
          <div className="flex items-center justify-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/70 shadow-xl shadow-black/50 md:h-32 md:w-32">
              {hasArtwork ? (
                <img
                  src={imageUrl}
                  alt={`${title} Cover`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.35em] text-white/50">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/60">
                {identifierLabel}
              </p>

              <h3 className="truncate text-2xl font-semibold text-white md:text-3xl">
                {title}
              </h3>

              {/* Pills row like screenshot */}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-emerald-500/10 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.45em] text-emerald-100">
                  {cardsLabel}
                </span>

                <button
                  onClick={() => handleSyncClick(edition.edition_id)}
                  disabled={isSpecial || syncSpotifyMutation.isPending || syncItunesMutation.isPending}
                  className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-500/60 to-lime-500/70 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-lg shadow-emerald-500/30 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Spotify
                  {syncSpotifyMutation.isPending && selectedFile === edition.edition_id && (
                    <span className="text-[10px] tracking-[0.25em] text-white/80">SYNC…</span>
                  )}
                </button>

                <button
                  onClick={() => handleItunesSyncClick(edition.edition_id)}
                  disabled={isSpecial || syncSpotifyMutation.isPending || syncItunesMutation.isPending}
                  className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-sky-500/60 to-blue-500/70 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white shadow-lg shadow-sky-500/30 disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  iTunes
                  {syncItunesMutation.isPending && selectedFile === edition.edition_id && (
                    <span className="text-[10px] tracking-[0.25em] text-white/80">SYNC…</span>
                  )}
                </button>
              </div>

              {/* Optional: secondary meta row */}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/55">
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {edition.language_long || edition.language_short || 'Sprache unbekannt'}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                  {edition.edition_id}
                </span>
                {edition.spotify_playlist ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Playlist: vorhanden
                  </span>
                ) : (
                  <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                    Playlist: n/a
                  </span>
                )}
              </div>

              {isSpecial && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.35em] text-white/40">
                  Sync nicht verfügbar
                </p>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  })}
</div>
        </section>

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="relative mx-4 max-w-md rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl shadow-black/60">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Neue Edition</p>
                <h3 className="text-2xl font-semibold text-white">Edition erstellen</h3>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Edition ID
                  <input
                    type="text"
                    required
                    value={formData.edition_id}
                    onChange={(e) => setFormData({ ...formData, edition_id: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    placeholder="hitster-de-test"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Edition Name
                  <input
                    type="text"
                    value={formData.edition_name}
                    onChange={(e) => setFormData({ ...formData, edition_name: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    placeholder="Hitster Deutschland Test"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Identifier (8 Zeichen)
                  <input
                    type="text"
                    required
                    pattern="[a-z0-9]{8}"
                    maxLength={8}
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value.toLowerCase() })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    placeholder="aaaa0099"
                  />
                  <p className="mt-1 text-[11px] text-white/50">Nur Kleinbuchstaben + Zahlen</p>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                    Sprache (kurz)
                    <input
                      type="text"
                      value={formData.language_short}
                      onChange={(e) => setFormData({ ...formData, language_short: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                    Sprache (lang)
                    <input
                      type="text"
                      value={formData.language_long}
                      onChange={(e) => setFormData({ ...formData, language_long: e.target.value })}
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    />
                  </label>
                </div>
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Spotify Playlist URL
                  <input
                    type="text"
                    pattern="https?://open\.spotify\.com/playlist/.*"
                    value={formData.spotify_playlist}
                    onChange={(e) => setFormData({ ...formData, spotify_playlist: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    placeholder="https://open.spotify.com/playlist/your-playlist-id"
                  />
                </label>
                {createErrorMessage && (
                  <p className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-rose-100">
                    Fehler: {createErrorMessage}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={createEditionMutation.isPending}
                    className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-md shadow-emerald-500/40 disabled:opacity-50"
                  >
                    {createEditionMutation.isPending ? 'Erstelle…' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="relative max-w-4xl rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl shadow-black/70">
              <div className="flex flex-col gap-2 border-b border-white/10 pb-4">
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Sync Status</p>
                <h3 className="text-2xl font-semibold text-white">
                  {syncSpotifyMutation.isPending || syncSpotifyMutation.isSuccess ? 'Spotify Sync' : 'iTunes Sync'} · {selectedFile}
                </h3>
                <p className="text-sm text-white/60">{syncResult?.message || 'Sync läuft…'}</p>
              </div>
              <div className="mt-4 space-y-3 text-sm text-white/70">
                {syncResult ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">Statistik</p>
                    <dl className="mt-3 grid gap-2 text-white/80 md:grid-cols-3">
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.35em] text-white/50">Total Cards</dt>
                        <dd className="text-lg font-semibold">{syncResult.statistics.totalCards}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.35em] text-white/50">Updated</dt>
                        <dd className="text-lg font-semibold">{syncResult.statistics.updated}</dd>
                      </div>
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.35em] text-white/50">Skipped</dt>
                        <dd className="text-lg font-semibold">{syncResult.statistics.skipped}</dd>
                      </div>
                    </dl>
                  </div>
                ) : (
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Daten werden abgefragt…</p>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
