import { useMemo, useState } from 'react';
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
  json_file: '',
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

  const queryClient = useQueryClient();

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
      const editionIdentifier = card.source_file ?? card.edition_file ?? '';
      if (filters.json_file && editionIdentifier !== filters.json_file) {
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
          card.edition,
          card.source_file,
          card.edition_file
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

  const editionIdentifier = filters.json_file;
  const editionCards = editionIdentifier
    ? cards.filter((card) => (card.source_file ?? card.edition_file ?? '') === editionIdentifier)
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
    const edition = card.edition ?? card.edition_file ?? card.source_file ?? '';

    if (!edition) {
      alert('Edition identifier fehlt für diese Card.');
      return;
    }

    mapCardMutation.mutate({ edition, cardId: card.id });
  };

  const handleMapEdition = async () => {
    if (!editionIdentifier) {
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

    for (const [index, card] of cardsToProcess.entries()) {
      const edition = card.edition ?? card.edition_file ?? card.source_file ?? editionIdentifier;

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
        await delay(5000);
      }
    }

    setEditionMappingStatus((prev) => ({
      ...prev,
      running: false,
      currentCardId: undefined
    }));
  };

  const selectedEdition = statsData?.editions.find((edition) => edition.file === filters.json_file);
  const mutationError = createCardMutation.error as { response?: { data?: { detail?: string } } } | null;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!filters.json_file) {
      alert('Bitte wähle zuerst eine Edition aus dem Filter');
      return;
    }

    const payload: CardCreatePayload = {
      edition_file: filters.json_file,
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
    <tr key={`${card.id}-${card.source_file ?? card.edition_file ?? 'unknown'}`} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.id}</td>
      <td className="px-6 py-4 text-sm text-gray-900">
        <div className="font-medium">{card.artist}</div>
        <div className="text-gray-500">{card.title}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.year}</td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{card.source_file ?? card.edition_file}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasSpotify(card) ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">✓</span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">–</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {hasApple(card) ? (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">✓</span>
        ) : (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">–</span>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <button
          type="button"
          onClick={() => handleMapSingleCard(card)}
          disabled={hasApple(card) || mapCardMutation.isPending || editionMappingStatus.running}
          className="px-2 py-1 rounded-md border border-gray-300 text-xs font-semibold transition-colors hover:border-gray-500 disabled:border-gray-200 disabled:text-gray-500 disabled:cursor-not-allowed"
        >
          {hasApple(card)
            ? 'Apple vorhanden'
            : mappingCardId === card.id && mapCardMutation.isPending
              ? 'Mapping…'
              : 'Apple zuweisen'}
        </button>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm">
        <Link to={`/cards/${card.source_file ?? card.edition_file}/${card.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
          Details →
        </Link>
      </td>
    </tr>
  ));

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Cards Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!filters.json_file}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg shadow"
          title={!filters.json_file ? 'Bitte erst Edition filtern' : 'Neue Card hinzufügen'}
        >
          + Neue Card
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Suche Artist, Title, Year..."
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.search}
            onChange={(event) => setFilters({ ...filters, search: event.target.value })}
          />
          <select
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.json_file}
            onChange={(event) => setFilters({ ...filters, json_file: event.target.value })}
          >
            <option value="">Alle Editionen</option>
            {statsData?.editions.map((edition) => (
              <option key={edition.file} value={edition.file}>
                {edition.edition_name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Year"
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.year}
            onChange={(event) => setFilters({ ...filters, year: event.target.value })}
          />
          <select
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.has_spotify === undefined ? '' : String(filters.has_spotify)}
            onChange={(event) =>
              setFilters({
                ...filters,
                has_spotify: event.target.value === '' ? undefined : event.target.value === 'true'
              })
            }
          >
            <option value="">Alle (Spotify)</option>
            <option value="true">Nur mit Spotify</option>
            <option value="false">Nur ohne Spotify</option>
          </select>
          <select
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.has_apple === undefined ? '' : String(filters.has_apple)}
            onChange={(event) =>
              setFilters({
                ...filters,
                has_apple: event.target.value === '' ? undefined : event.target.value === 'true'
              })
            }
          >
            <option value="">Alle (Apple Music)</option>
            <option value="true">Nur mit Apple Music</option>
            <option value="false">Nur ohne Apple Music</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
        <button
          type="button"
          onClick={handleMapEdition}
          disabled={!filters.json_file || editionCardsMissingApple.length === 0 || editionMappingStatus.running}
          className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg font-semibold shadow disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {editionMappingStatus.running ? 'Edition-Mapping läuft…' : 'Apple Mapping für komplette Edition'}
        </button>
        <div className="text-sm text-gray-600">
          {editionMappingStatus.running ? (
            <span>
              {editionMappingStatus.processed}/{editionMappingStatus.total} Karten verarbeitet
              {editionMappingStatus.currentCardId ? ` · Karte ${editionMappingStatus.currentCardId}` : ''}
            </span>
          ) : filters.json_file ? (
            <span>
              {editionCardsMissingApple.length} Karten ohne Apple-Daten in der Edition
            </span>
          ) : (
            <span>Edition wählen, um das Mapping für alle Karten zu starten.</span>
          )}
        </div>
      </div>
      {editionMappingStatus.error && (
        <div className="mb-6 text-sm text-red-600">{editionMappingStatus.error}</div>
      )}

      {cardsLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Lade Cards...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">{filteredCards.length} Cards gefunden</p>
          </div>
          {filteredCards.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">Keine Cards gefunden.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Artist - Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spotify</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apple Music</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Apple Mapping</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aktionen</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">{cardRows}</tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">Neue Card hinzufügen</h3>
              {selectedEdition && (
                <p className="text-sm text-gray-600 mb-4">
                  Edition: <span className="font-semibold">{selectedEdition.edition_name}</span>
                </p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Card ID</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{5}"
                    maxLength={5}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.id}
                    onChange={(event) => setFormData({ ...formData, id: event.target.value })}
                    placeholder="z.B. 00001"
                  />
                  <p className="text-xs text-gray-500 mt-1">5 Ziffern</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.title}
                    onChange={(event) => setFormData({ ...formData, title: event.target.value })}
                    placeholder="Song Titel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Artist</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.artist}
                    onChange={(event) => setFormData({ ...formData, artist: event.target.value })}
                    placeholder="Künstler"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{4}"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.year}
                    onChange={(event) => setFormData({ ...formData, year: event.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Spotify (optional)</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Spotify ID</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.spotify_id}
                        onChange={(event) => setFormData({ ...formData, spotify_id: event.target.value })}
                        placeholder="z.B. 3n3Ppam7vgaVa1iaRUc9Lp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Spotify URI</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.spotify_uri}
                        onChange={(event) => setFormData({ ...formData, spotify_uri: event.target.value })}
                        placeholder="spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Spotify URL</label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.spotify_url}
                        onChange={(event) => setFormData({ ...formData, spotify_url: event.target.value })}
                        placeholder="https://open.spotify.com/track/..."
                      />
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Apple Music (optional)</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apple Music ID</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.apple_id}
                        onChange={(event) => setFormData({ ...formData, apple_id: event.target.value })}
                        placeholder="z.B. 1440857781"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apple Music URI</label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.apple_uri}
                        onChange={(event) => setFormData({ ...formData, apple_uri: event.target.value })}
                        placeholder="music.apple.com/de/album/..."
                      />
                    </div>
                  </div>
                </div>
                {mutationError?.response?.data?.detail && (
                  <div className="text-red-600 text-sm">Fehler: {mutationError.response.data.detail}</div>
                )}
                <div className="flex justify-end gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={createCardMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    {createCardMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
