import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  cardsApi,
  statsApi,
  type Card,
  type CardCreatePayload,
  type DashboardStats
} from '../lib/api';

const INITIAL_FILTERS = {
  search: '',
  selected_edition: '',
  year: '',
  has_spotify: undefined as boolean | undefined,
  has_apple: undefined as boolean | undefined
};

const INITIAL_FORM = {
  id: '',
  title: '',
  artist: '',
  year: '',
  spotify_id: '',
  spotify_uri: '',
  spotify_url: '',
  apple_id: '',
  apple_uri: ''
};

type CardFormField = keyof typeof INITIAL_FORM;

type TextFieldProps = {
  required?: boolean;
  pattern?: string;
  maxLength?: number;
  placeholder?: string;
};

const hasSpotify = (card: Card) => {
  const spotify = card.spotify;
  return Boolean(spotify?.id || spotify?.uri || spotify?.url);
};

const hasApple = (card: Card) => {
  const apple = card.apple;
  return Boolean(apple?.id || apple?.uri);
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type EditionMappingStatus = {
  running: boolean;
  total: number;
  processed: number;
  currentCardId?: string;
  error?: string;
};

export default function Cards() {
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS }));
  const [formData, setFormData] = useState(() => ({ ...INITIAL_FORM }));
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mappingCardId, setMappingCardId] = useState<string | null>(null);
  const [editionMappingStatus, setEditionMappingStatus] = useState<EditionMappingStatus>({
    running: false,
    total: 0,
    processed: 0
  });
  const editionMappingAbortRef = useRef(false);

  const queryClient = useQueryClient();

  const controlBase =
    'h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white ' +
    'placeholder:text-white/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition';

  const selectBase = `${controlBase} appearance-none pr-12`;

  const {
    data: cards = [],
    isLoading: cardsLoading
  } = useQuery<Card[]>({
    queryKey: ['cards'],
    queryFn: () => cardsApi.getAll()
  });

  const { data: statsData } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => statsApi.getDashboard().then((response) => response.data)
  });

  const filteredCards = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return cards.filter((card) => {
      const editionIdentifier = card.edition ?? '';
      if (filters.selected_edition && editionIdentifier !== filters.selected_edition) {
        return false;
      }

      if (filters.year && card.year !== filters.year) {
        return false;
      }

      if (typeof filters.has_spotify === 'boolean' && hasSpotify(card) !== filters.has_spotify) {
        return false;
      }

      if (typeof filters.has_apple === 'boolean' && hasApple(card) !== filters.has_apple) {
        return false;
      }

      if (searchTerm) {
        const searchable = [
          card.id,
          card.title,
          card.artist,
          card.year,
          card.edition_name,
          card.edition
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchable.includes(searchTerm)) {
          return false;
        }
      }

      return true;
    });
  }, [cards, filters]);

  const editionIdentifier = filters.selected_edition;
  const editionCards = editionIdentifier
    ? cards.filter((card) => (card.edition ?? '') === editionIdentifier)
    : [];
  const editionCardsMissingApple = editionCards.filter((card) => !hasApple(card));

  const createCardMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setShowCreateModal(false);
      setFormData({ ...INITIAL_FORM });
    }
  });

  const mapCardMutation = useMutation({
    mutationFn: ({ edition, cardId }: { edition: string; cardId: string }) =>
      cardsApi.mapApple(edition, cardId),
    onMutate: ({ cardId }) => setMappingCardId(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onSettled: () => setMappingCardId(null)
  });

  const handleMapSingleCard = (card: Card) => {
    const edition = card.edition ?? '';

    if (!edition) {
      alert('Edition identifier fehlt für diese Card.');
      return;
    }

    mapCardMutation.mutate({ edition, cardId: card.id });
  };

  const handleMapEdition = async () => {
    if (!editionIdentifier || editionMappingStatus.running) {
      return;
    }

    const cardsToProcess = [...editionCardsMissingApple];

    if (cardsToProcess.length === 0) {
      setEditionMappingStatus({
        running: false,
        total: 0,
        processed: 0,
        error: 'Alle Karten dieser Edition enthalten bereits Apple-Daten.',
        currentCardId: undefined
      });
      return;
    }

    setEditionMappingStatus({
      running: true,
      total: cardsToProcess.length,
      processed: 0,
      currentCardId: undefined,
      error: undefined
    });
    editionMappingAbortRef.current = false;

    for (const [index, card] of cardsToProcess.entries()) {
      if (editionMappingAbortRef.current) {
        break;
      }

      const edition = card.edition ?? editionIdentifier;

      setEditionMappingStatus((prev) => ({
        ...prev,
        currentCardId: card.id,
        error: undefined
      }));

      if (edition) {
        try {
          await cardsApi.mapApple(edition, card.id);
          queryClient.invalidateQueries({ queryKey: ['cards'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        } catch (error) {
          const err = error as {
            response?: { data?: { error?: string; message?: string } };
            message?: string;
          };
          const message =
            err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? 'Unbekannter Fehler';
          setEditionMappingStatus((prev) => ({
            ...prev,
            error: `Fehler bei ${card.id}: ${message}`
          }));
        }
      } else {
        setEditionMappingStatus((prev) => ({
          ...prev,
          error: `Edition fehlt für Card ${card.id}.`
        }));
      }

      setEditionMappingStatus((prev) => ({
        ...prev,
        processed: prev.processed + 1
      }));

      if (index < cardsToProcess.length - 1) {
        await delay(500);
        if (editionMappingAbortRef.current) {
          break;
        }
      }
    }

    const mappingWasAborted = editionMappingAbortRef.current;
    setEditionMappingStatus((prev) => ({
      ...prev,
      running: false,
      currentCardId: undefined,
      error: prev.error ?? (mappingWasAborted ? 'Edition-Mapping abgebrochen.' : undefined)
    }));
  };

  const handleCancelEditionMapping = () => {
    if (!editionMappingStatus.running) {
      return;
    }

    editionMappingAbortRef.current = true;
    setEditionMappingStatus((prev) => ({
      ...prev,
      error: 'Edition-Mapping abgebrochen.'
    }));
  };

  const selectedEdition = statsData?.editions.find((edition) => edition.edition_id === filters.selected_edition);

  const formFields: Array<{ label: string; field: CardFormField; props?: TextFieldProps }> = [
    {
      label: 'Card ID',
      field: 'id',
      props: { required: true, pattern: '[0-9]{5}', maxLength: 5, placeholder: 'z.B. 00001' }
    },
    { label: 'Title', field: 'title', props: { required: true, placeholder: 'Song Titel' } },
    { label: 'Artist', field: 'artist', props: { required: true, placeholder: 'Künstler' } },
    { label: 'Year', field: 'year', props: { required: true, pattern: '[0-9]{4}', maxLength: 4, placeholder: '2024' } }
  ];

  const spotifyFields: Array<{ label: string; key: CardFormField }> = [
    { label: 'Spotify ID', key: 'spotify_id' },
    { label: 'Spotify URI', key: 'spotify_uri' },
    { label: 'Spotify URL', key: 'spotify_url' }
  ];

  const appleFields: Array<{ label: string; key: CardFormField }> = [
    { label: 'Apple Music ID', key: 'apple_id' },
    { label: 'Apple Music URI', key: 'apple_uri' }
  ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!filters.selected_edition) {
      alert('Bitte wähle zuerst eine Edition aus dem Filter');
      return;
    }

    const payload: CardCreatePayload = {
      edition_id: filters.selected_edition,
      edition: selectedEdition?.edition,
      id: formData.id,
      title: formData.title,
      artist: formData.artist,
      year: formData.year
    };

    if (formData.spotify_id || formData.spotify_uri || formData.spotify_url) {
      payload.spotify = {
        id: formData.spotify_id || undefined,
        uri: formData.spotify_uri || undefined,
        url: formData.spotify_url || undefined
      };
    }

    if (formData.apple_id || formData.apple_uri) {
      payload.apple = {
        id: formData.apple_id || undefined,
        uri: formData.apple_uri || undefined
      };
    }

    createCardMutation.mutate(payload);
  };

  const cardRows = filteredCards.map((card) => (
    <tr
      key={`${card.id}-${card.edition ?? 'unknown'}`}
      className="even:bg-white/5 hover:bg-cyan-500/5"
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{card.id}</td>
      <td className="px-6 py-4 w-[320px] max-w-[320px] text-sm text-white">
        <Link
          to={`/cards/${card.edition}/${card.id}`}
          className="text-cyan-300 hover:text-cyan-100 hover:underline"
        >
        <div className="font-medium text-white">{card.artist}</div>
        <div className="text-white/70">{card.title}</div>
        </Link>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">{card.year}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasSpotify(card) ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-500/20 text-emerald-200">✓</span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-white/5 text-white/60">–</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasApple(card) ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-500/20 text-red-200">✓</span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-white/5 text-white/60">–</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
        {!hasApple(card) && (
          <button
            type="button"
            onClick={() => handleMapSingleCard(card)}
            disabled={mapCardMutation.isPending || editionMappingStatus.running}
            className="px-2 py-1 rounded-md border border-white/30 bg-white/5 text-xs font-semibold text-white/70 transition-colors hover:border-cyan-300 disabled:border-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
          >
            {mappingCardId === card.id && mapCardMutation.isPending
              ? 'Mapping…'
              : 'Apple zuweisen'}
          </button>
        )}

        {editionMappingStatus.running && (
          <button
            type="button"
            onClick={handleCancelEditionMapping}
            className="mt-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 shadow-lg shadow-black/40"
          >
            Mapping abbrechen
          </button>
        )}
      </td>
    </tr>
  ));

  const hasEditionSelected = Boolean(filters.selected_edition);

  const canCreateCard = hasEditionSelected && !createCardMutation.isPending;
  const canMapEdition =
    hasEditionSelected && editionCardsMissingApple.length > 0 && !editionMappingStatus.running;

  const mappingStatusText = editionMappingStatus.running
    ? `${editionMappingStatus.processed}/${editionMappingStatus.total} verarbeitet${
        editionMappingStatus.currentCardId ? ` · Karte ${editionMappingStatus.currentCardId}` : ''
      }`
    : hasEditionSelected
      ? `${editionCardsMissingApple.length} Karten ohne Apple-Daten in der Edition`
      : 'Bitte zuerst eine Edition auswählen.';

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-12 text-center lg:text-left">
          <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Cards Management
          </h1>
          <p className="mt-2 text-base text-white/70">
            Überblick über alle Karten
          </p>
        </header>

        {/* CONTROL PANEL (New Card + Filters + Mapping) */}
        <section className="mb-10">
          <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-slate-900/85 via-slate-900/65 to-slate-950/85 p-5 shadow-2xl shadow-black/60">
            {/* Header row */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.35em] text-white/45">Controls</p>
                <p className="mt-1 text-sm text-white/70">
                  Suche, filtere und starte Mapping-Aktionen.
                </p>
              </div>
            </div>

            <div className="my-5 h-px bg-white/10" />

            {/* Filters */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
              {/* Search */}
              <div className="xl:col-span-2">
                <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-white/45">
                  Suche
                </label>
                <input
                  type="text"
                  placeholder="Artist, Titel, Jahr, ID…"
                  className={controlBase}
                  value={filters.search}
                  onChange={(event) => setFilters({ ...filters, search: event.target.value })}
                />
              </div>

              {/* Edition */}
              <div className="xl:col-span-2">
                <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-white/45">
                  Edition
                </label>
                <div className="relative">
                  <select
                    className={selectBase}
                    value={filters.selected_edition}
                    onChange={(event) => setFilters({ ...filters, selected_edition: event.target.value })}
                  >
                    <option value="" className="text-slate-900">
                      Alle Editionen
                    </option>
                    {statsData?.editions.map((edition) => (
                      <option key={edition.edition_id} value={edition.edition_id}>
                        {edition.edition_name}
                      </option>
                    ))}
                  </select>
                  <i
                    className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-white/45">
                  Year
                </label>
                <input
                  type="text"
                  placeholder="YYYY"
                  className={controlBase}
                  value={filters.year}
                  onChange={(event) => setFilters({ ...filters, year: event.target.value })}
                />
              </div>

              {/* Spotify */}
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-white/45">
                  Spotify
                </label>
                <div className="relative">
                  <select
                    className={selectBase}
                    value={filters.has_spotify === undefined ? '' : String(filters.has_spotify)}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        has_spotify: event.target.value === '' ? undefined : event.target.value === 'true'
                      })
                    }
                  >
                    <option value="">Alle</option>
                    <option value="true">Nur mit</option>
                    <option value="false">Nur ohne</option>
                  </select>
                  <i
                    className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Apple */}
              <div>
                <label className="mb-2 block text-[10px] uppercase tracking-[0.35em] text-white/45">
                  Apple Music
                </label>
                <div className="relative">
                  <select
                    className={selectBase}
                    value={filters.has_apple === undefined ? '' : String(filters.has_apple)}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        has_apple: event.target.value === '' ? undefined : event.target.value === 'true'
                      })
                    }
                  >
                    <option value="">Alle</option>
                    <option value="true">Nur mit</option>
                    <option value="false">Nur ohne</option>
                  </select>
                  <i
                    className="fa-solid fa-chevron-down pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>

            {/* Integrated actions bar (no nested card) */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                {/* Left: status */}
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/45">
                    Edition Actions
                  </p>
                  <p className="mt-1 text-sm text-white/70">{mappingStatusText}</p>

                  {editionMappingStatus.error && (
                    <p className="mt-2 text-sm text-rose-300">{editionMappingStatus.error}</p>
                  )}
                </div>

                {/* Right: actions */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    disabled={!canCreateCard}
                    className="inline-flex h-12 items-center justify-center gap-3 rounded-full
                              bg-gradient-to-r from-emerald-500 to-teal-500
                              px-6 text-xs font-semibold uppercase tracking-[0.35em] text-white
                              shadow-xl shadow-emerald-500/30
                              transition
                              hover:from-emerald-400 hover:to-teal-400
                              disabled:opacity-40 disabled:cursor-not-allowed"
                    title={!hasEditionSelected ? 'Bitte erst Edition wählen' : 'Neue Card hinzufügen'}
                  >
                    <i className="fa-solid fa-plus text-white/90" aria-hidden="true" />
                    Neue Card
                  </button>

                  <button
                    type="button"
                    onClick={handleMapEdition}
                    disabled={!canMapEdition}
                    className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-xl shadow-amber-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      !hasEditionSelected
                        ? 'Bitte erst Edition wählen'
                        : editionCardsMissingApple.length === 0
                          ? 'Alle Karten dieser Edition haben bereits Apple-Daten.'
                          : 'Apple Mapping für alle Karten der Edition starten'
                    }
                  >
                    <i className="fa-brands fa-apple text-white/90" aria-hidden="true" />
                    {editionMappingStatus.running ? 'Mapping läuft…' : 'Apple Mapping'}
                  </button>

                  {editionMappingStatus.running && (
                    <button
                      type="button"
                      onClick={handleCancelEditionMapping}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:border-white/25 hover:bg-white/10"
                    >
                      <i className="fa-solid fa-xmark" aria-hidden="true" />
                      Abbrechen
                    </button>
                  )}
                </div>
              </div>

              {/* Progress (only while running) */}
              {editionMappingStatus.running && (
                <div className="mt-3">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-amber-400/70"
                      style={{
                        width:
                          editionMappingStatus.total > 0
                            ? `${Math.round((editionMappingStatus.processed / editionMappingStatus.total) * 100)}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {cardsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-white/70">Lade Cards...</div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/60">
            <div className="border-b border-white/10 bg-slate-900/80 px-6 py-3">
              <p className="text-sm text-white/70">{filteredCards.length} Cards gefunden</p>
            </div>
            {filteredCards.length === 0 ? (
              <div className="p-6 text-center text-sm text-white/60">Keine Cards gefunden.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-white/80">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-[0.3em] text-white/60">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">ID</th>
                      <th className="px-6 py-3 text-left font-semibold w-[320px] max-w-[320px]">
                        Artist – Title
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">Year</th>
                      <th className="px-6 py-3 text-left font-semibold">
                        <span className="sr-only">Spotify</span>
                        <i className="fa-brands fa-spotify text-green-400 text-lg" aria-hidden="true" />
                      </th>

                      <th className="px-6 py-3 text-left font-semibold">
                        <span className="sr-only">Apple Music</span>
                        <i className="fa-brands fa-apple text-white/80 text-lg" aria-hidden="true" />
                      </th>
                      <th className="px-6 py-3 text-left font-semibold">Apple Mapping</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-gradient-to-b from-slate-900/70 to-slate-900/60">
                    {cardRows}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="max-w-lg rounded-[28px] border border-white/10 bg-slate-900/90 p-6 shadow-2xl shadow-black/80 text-white">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold uppercase tracking-[0.4em] text-white/70">Neue Card</h3>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-sm font-semibold text-white/40 hover:text-white"
                >
                  Abbrechen
                </button>
              </div>
              {selectedEdition && (
                <p className="text-sm text-white/70 mb-4">
                  Edition: <span className="font-semibold text-white">{selectedEdition.edition_name}</span>
                </p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                {formFields.map(({ label, field, props }) => (
                  <div key={field}>
                    <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-white/60">
                      {label}
                    </label>
                    <input
                      type="text"
                      className={controlBase}
                      value={formData[field]}
                      onChange={(event) =>
                        setFormData((prev) => ({ ...prev, [field]: event.target.value }))
                      }
                      {...props}
                    />
                  </div>
                ))}

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Spotify (optional)
                  </p>
                  <div className="mt-3 space-y-3">
                    {spotifyFields.map((item) => (
                      <div key={item.key}>
                        <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-white/50">
                          {item.label}
                        </label>
                        <input
                          type="text"
                          className={controlBase}
                          value={formData[item.key]}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, [item.key]: event.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                    Apple Music (optional)
                  </p>
                  <div className="mt-3 space-y-3">
                    {appleFields.map((item) => (
                      <div key={item.key}>
                        <label className="mb-1 block text-xs uppercase tracking-[0.3em] text-white/50">
                          {item.label}
                        </label>
                        <input
                          type="text"
                          className={controlBase}
                          value={formData[item.key]}
                          onChange={(event) =>
                            setFormData((prev) => ({ ...prev, [item.key]: event.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
