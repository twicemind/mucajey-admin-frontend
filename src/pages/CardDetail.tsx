import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { toDataURL } from 'qrcode';
import type { FormEvent } from 'react';
import { cardsApi, type Card, type CardUpdatePayload, type ItunesTrack } from '../lib/api';

type ApiError = {
  response?: {
    data?: {
      error?: string;
      detail?: string;
      message?: string;
    };
  };
  message?: string;
};

type FormState = {
  title: string;
  artist: string;
  year: string;
  spotify_id: string;
  spotify_uri: string;
  spotify_url: string;
  apple_id: string;
  apple_uri: string;
};

const HITSTER_BASE_URL = 'http://www.hitstergame.com';
const DEFAULT_LANGUAGE = 'de';

/**
 * Normalize segments: empty / unknown / '-' => undefined, else trimmed
 */
const normalizeSegment = (value?: string) => {
  const v = (value ?? '').trim();
  if (!v || v.toLowerCase() === 'unknown' || v === '-') return undefined;
  return v;
};

/**
 * For hitstergame.com, they expect the last segment of an edition id like:
 * "hitster-de-classics" -> "classics"
 */
const normalizeIdentifier = (value?: string) => {
  const v = normalizeSegment(value);
  if (!v) return undefined;

  const parts = v.split('-').filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
};

type CardLike = Card & {
  edition_id?: string;
  edition_name?: string;
  edition?: string;
  language_short?: string;
};

const getEditionId = (card?: CardLike) =>
  normalizeSegment(card?.edition_id) ?? normalizeSegment(card?.edition);

const getEditionName = (card?: CardLike) =>
  normalizeSegment(card?.edition_name) ?? normalizeSegment(card?.edition);

const getLanguage = (card?: CardLike) =>
  normalizeSegment(card?.language_short)?.toLowerCase() ?? DEFAULT_LANGUAGE;

const buildCardLink = (card: Card) => {
  const cardId = normalizeSegment(String(card.id ?? ''));
  if (!cardId) return undefined;

  const editionId = getEditionId(card);
  const identifier = normalizeIdentifier(editionId);
  const languageSegment = getLanguage(card);

  return identifier
    ? `${HITSTER_BASE_URL}/${languageSegment}/${identifier}/${cardId}`
    : `${HITSTER_BASE_URL}/${languageSegment}/${cardId}`;
};

type CardDetailQrState = {
  target?: string;
  src?: string;
};

function HitsterQrRings() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {[
        { r: 34, c: '#22d3ee', o: 0.85 },
        { r: 38, c: '#a78bfa', o: 0.75 },
        { r: 42, c: '#fb7185', o: 0.65 },
        { r: 46, c: '#fbbf24', o: 0.65 }
      ].map((ring) => (
        <circle
          key={ring.r}
          cx="50"
          cy="50"
          r={ring.r}
          fill="none"
          stroke={ring.c}
          strokeWidth="1.2"
          opacity={ring.o}
          filter="url(#glow)"
          strokeDasharray="7 6"
          strokeLinecap="round"
        />
      ))}

      <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
    </svg>
  );
}

function CardDetailQr({ card }: { card: Card }) {
  const targetUrl = buildCardLink(card);
  const [qrState, setQrState] = useState<CardDetailQrState>({});

  useEffect(() => {
    let canceled = false;

    if (!targetUrl) {
      queueMicrotask(() => {
        if (!canceled) setQrState({});
      });
      return () => {
        canceled = true;
      };
    }

    toDataURL(targetUrl, {
      width: 520,
      margin: 1,
      errorCorrectionLevel: 'M'
    })
      .then((dataUrl) => {
        if (!canceled) setQrState({ target: targetUrl, src: dataUrl });
      })
      .catch(() => {
        if (!canceled) {
          setQrState((prev) =>
            prev.target === targetUrl ? { target: targetUrl, src: undefined } : prev
          );
        }
      });

    return () => {
      canceled = true;
    };
  }, [targetUrl]);

  const showLoader = Boolean(targetUrl && qrState.target !== targetUrl);
  const hasValidQr = Boolean(targetUrl && qrState.target === targetUrl && qrState.src);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        {showLoader && (
          <p className="mt-2 text-[10px] uppercase tracking-[0.35em] text-white/35">
            QR wird aktualisiert…
          </p>
        )}
      </div>

      <div
        className="
          relative aspect-square w-[300px] sm:w-[340px] md:w-[380px]
          overflow-hidden rounded-[28px]
          border border-white/10 bg-gradient-to-b from-black/70 to-black/90
          shadow-2xl shadow-black/70
        "
      >
        <div className="pointer-events-none absolute inset-0 opacity-60" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-fuchsia-500/25 blur-3xl" />
          <div className="absolute -bottom-20 right-[-10%] h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
        </div>

        <div className="pointer-events-none absolute inset-0 opacity-80" aria-hidden="true">
          <HitsterQrRings />
        </div>

        <div className="relative flex h-full w-full items-center justify-center p-8">
          <div className="rounded-2xl bg-white p-4 shadow-xl shadow-black/50">
            {hasValidQr ? (
              <img
                src={qrState.src}
                alt={`QR-Code für Card ${card.id}`}
                className="h-[210px] w-[210px] sm:h-[230px] sm:w-[230px] md:h-[250px] md:w-[250px] object-contain"
              />
            ) : (
              <div className="flex h-[210px] w-[210px] sm:h-[230px] sm:w-[230px] md:h-[250px] md:w-[250px] items-center justify-center">
                <span className="text-xs font-semibold uppercase tracking-[0.3em] text-black/50">
                  {targetUrl ? 'QR lädt…' : 'ID fehlt'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.5em] text-white/60">HITSTER QR</span>
        </div>
      </div>
    </div>
  );
}

function toFormState(card?: Card): FormState {
  return {
    title: card?.title ?? '',
    artist: card?.artist ?? '',
    year: card?.year ?? '',
    spotify_id: card?.spotify?.id ?? '',
    spotify_uri: card?.spotify?.uri ?? '',
    spotify_url: card?.spotify?.url ?? '',
    apple_id: card?.apple?.id ?? '',
    apple_uri: card?.apple?.uri ?? ''
  };
}

function toUpdatePayload(form: FormState): CardUpdatePayload {
  const payload: CardUpdatePayload = {
    title: form.title,
    artist: form.artist,
    year: form.year
  };

  if (form.spotify_id || form.spotify_uri || form.spotify_url) {
    payload.spotify = { id: form.spotify_id, uri: form.spotify_uri, url: form.spotify_url };
  }

  if (form.apple_id || form.apple_uri) {
    payload.apple = { id: form.apple_id, uri: form.apple_uri };
  }

  return payload;
}

export default function CardDetail() {
  // Refactor: no more json-files/edition_files => use edition_id in route params
  // Example route: /cards/:edition_id/:id
  const { edition_id, id } = useParams<{ edition_id: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [itunesSearchResult, setItunesSearchResult] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormState>({
    title: '',
    artist: '',
    year: '',
    spotify_id: '',
    spotify_uri: '',
    spotify_url: '',
    apple_id: '',
    apple_uri: ''
  });

  // Cards can be fetched independently of edition_id; do not block query on old "filename"
  const { data: cards = [], isLoading, error } = useQuery<Card[]>({
    queryKey: ['cards'],
    queryFn: cardsApi.getAll
  });

  const card = useMemo(() => {
    const targetEdition = normalizeSegment(edition_id);
    const targetId = normalizeSegment(id);

    console.log('Looking for card with edition:', targetEdition, 'and id:', targetId);

    if (!targetEdition || !targetId) return undefined;

    return cards.find((c) => {
      const cid = normalizeSegment(String(c.id ?? ''));
      if (cid !== targetId) return false;

      const editionId = normalizeSegment(c.edition_id);
      const edition = normalizeSegment(c.edition);

      return editionId === targetEdition || edition === targetEdition;
    });
  }, [cards, edition_id, id]);

  const updateCardMutation = useMutation({
    // Refactor: cardsApi.update(edition_id, cardId, data)
    mutationFn: ({ editionId, cardId, data }: { editionId: string; cardId: string; data: CardUpdatePayload }) =>
      cardsApi.update(editionId, cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setIsEditing(false);
    }
  });

  const searchItunesMutation = useMutation({
    mutationFn: () => {
      if (!card) throw new Error('No card data');
      return cardsApi.searchItunes(card.title, card.artist, 'de');
    },
    onSuccess: (response) => {
      const track: ItunesTrack | undefined = response.data.track;
      if (track?.id && track?.uri) {
        setFormData((prev) => ({ ...prev, apple_id: track.id ?? '', apple_uri: track.uri ?? '' }));
        setItunesSearchResult(`✓ Gefunden: ${track.name ?? ''} - ${track.artist ?? ''}`);
        setTimeout(() => setItunesSearchResult(null), 5000);
        return;
      }
      setItunesSearchResult(`✗ ${response.data.message || 'Kein Match gefunden'}`);
      setTimeout(() => setItunesSearchResult(null), 5000);
    },
    onError: (err: unknown) => {
      const typedError = err as ApiError;
      setItunesSearchResult(`✗ ${typedError?.response?.data?.message || 'Kein Match gefunden'}`);
      setTimeout(() => setItunesSearchResult(null), 5000);
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const editionId = normalizeSegment(edition_id);
    const cardId = normalizeSegment(id);
    if (!editionId || !cardId) return;

    updateCardMutation.mutate({ editionId, cardId, data: toUpdatePayload(formData) });
  };

  const startEditing = () => {
    if (!card) return;
    setFormData(toFormState(card));
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <span className="text-sm font-semibold">Lade Card Details…</span>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
        <div className="max-w-md rounded-[28px] border border-white/10 bg-white/5 p-6 text-center shadow-xl shadow-black/40">
          <h2 className="text-xl font-semibold text-white">Card nicht gefunden</h2>
          <p className="mt-2 text-sm text-white/70">Die angeforderte Card konnte nicht geladen werden.</p>
          <button
            onClick={() => navigate('/cards')}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const hasSpotifyData = Boolean(card.spotify?.id || card.spotify?.uri || card.spotify?.url);
  const hasAppleData = Boolean(card.apple?.id || card.apple?.uri);

  const editionLabel = getEditionName(card) ?? getEditionId(card) ?? 'Unbekannte Edition';
  const editionIdLabel = getEditionId(card) ?? 'Unbekannt';

  const updateErrorMessage =
    (updateCardMutation.error as ApiError)?.response?.data?.error ||
    (updateCardMutation.error as ApiError)?.response?.data?.detail ||
    (updateCardMutation.error as ApiError)?.response?.data?.message ||
    (updateCardMutation.error as ApiError)?.message ||
    undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <button
              onClick={() => navigate('/cards')}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-lg shadow-indigo-500/30"
            >
              Zurück
            </button>

            <p className="mt-4 text-xs uppercase tracking-[0.4em] text-white/60">Edition</p>
            <p className="text-base text-white/70">{editionLabel}</p>

            <h1 className="mt-2 text-3xl font-semibold text-white">
              {card.artist} · <span className="text-indigo-200">{card.title}</span>
            </h1>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            {!isEditing ? (
              <button
                onClick={startEditing}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-lg shadow-indigo-500/30"
              >
                Bearbeiten
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(toFormState(card));
                  }}
                  className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white/80"
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={updateCardMutation.isPending}
                  className="rounded-full bg-emerald-500/80 px-5 py-2 text-xs font-semibold uppercase tracking-[0.4em] text-white shadow-md shadow-emerald-500/30 disabled:opacity-60"
                >
                  {updateCardMutation.isPending ? 'Speichert…' : 'Speichern'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Meta */}
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Card Meta</p>
            <dl className="mt-4 space-y-3 text-sm text-white/70">
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-white/60">Card ID</dt>
                <dd className="font-semibold text-white">#{card.id}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-white/60">Jahr</dt>
                <dd className="font-semibold text-white">{card.year}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-white/60">Sprache</dt>
                <dd className="font-semibold text-white">{(card.language_short ?? DEFAULT_LANGUAGE).toUpperCase()}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-white/60">Edition</dt>
                <dd className="font-semibold text-white">{editionLabel}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-6">
                <dt className="text-white/60">Edition ID</dt>
                <dd className="font-semibold text-white">{editionIdLabel}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
            <CardDetailQr card={card} />
          </div>
        </section>

        {/* Editing */}
        {isEditing && (
          <section className="rounded-[32px] border border-white/10 bg-slate-900/60 p-6 shadow-2xl shadow-black/40 backdrop-blur-lg">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Editieren</p>
                <h2 className="text-xl font-semibold text-white">Card bearbeiten</h2>
              </div>
              <p className="text-xs text-white/60">Änderungen werden nach Speichern übernommen</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Title
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Artist
                  <input
                    type="text"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                  />
                </label>
              </div>

              <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                Jahr
                <input
                  type="text"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                />
              </label>

              <div className="space-y-4 rounded-2xl border border-white/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Spotify</p>
                <div className="grid gap-4 md:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Spotify ID"
                    value={formData.spotify_id}
                    onChange={(e) => setFormData({ ...formData, spotify_id: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Spotify URI"
                    value={formData.spotify_uri}
                    onChange={(e) => setFormData({ ...formData, spotify_uri: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
                  />
                  <input
                    type="url"
                    placeholder="Spotify URL"
                    value={formData.spotify_url}
                    onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Apple Music</p>
                  <button
                    type="button"
                    onClick={() => searchItunesMutation.mutate()}
                    disabled={searchItunesMutation.isPending || !formData.title || !formData.artist}
                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {searchItunesMutation.isPending ? 'Suche…' : 'iTunes Match'}
                  </button>
                </div>

                {itunesSearchResult && (
                  <p
                    className={`rounded-2xl px-3 py-2 text-sm ${
                      itunesSearchResult.startsWith('✓')
                        ? 'bg-emerald-500/20 text-emerald-100 border border-emerald-500/40'
                        : 'bg-amber-500/10 text-amber-100 border border-amber-400/40'
                    }`}
                  >
                    {itunesSearchResult}
                  </p>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Apple Music ID"
                    value={formData.apple_id}
                    onChange={(e) => setFormData({ ...formData, apple_id: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-rose-400 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Apple Music URI"
                    value={formData.apple_uri}
                    onChange={(e) => setFormData({ ...formData, apple_uri: e.target.value })}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-rose-400 focus:outline-none"
                  />
                </div>
              </div>

              {updateErrorMessage && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-red-100">
                  Fehler: {updateErrorMessage}
                </div>
              )}
            </form>
          </section>
        )}

        {/* Platform details */}
        {!isEditing && (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Spotify</h3>
                <span className={`text-xs font-semibold ${hasSpotifyData ? 'text-emerald-200' : 'text-white/60'}`}>
                  {hasSpotifyData ? 'verfügbar' : 'nicht vorhanden'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p className="truncate">
                  <span className="text-white/40">ID:</span> {card.spotify?.id ?? '—'}
                </p>
                <p className="truncate">
                  <span className="text-white/40">URI:</span> {card.spotify?.uri ?? '—'}
                </p>
                <p className="truncate">
                  <span className="text-white/40">URL:</span>
                  {card.spotify?.url ? (
                    <a
                      href={card.spotify.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1 text-white underline-offset-4 hover:text-white"
                    >
                      Link
                    </a>
                  ) : (
                    ' —'
                  )}
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/40">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">Apple Music</h3>
                <span className={`text-xs font-semibold ${hasAppleData ? 'text-rose-200' : 'text-white/60'}`}>
                  {hasAppleData ? 'verfügbar' : 'nicht vorhanden'}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-sm text-white/70">
                <p className="truncate">
                  <span className="text-white/40">ID:</span> {card.apple?.id ?? '—'}
                </p>
                <p className="truncate">
                  <span className="text-white/40">URI:</span> {card.apple?.uri ?? '—'}
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}