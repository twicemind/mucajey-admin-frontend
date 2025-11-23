import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cardsApi, statsApi } from '../lib/api';

export default function Cards() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    artist: '',
    year: '',
    spotify_id: '',
    spotify_uri: '',
    spotify_url: '',
    apple_id: '',
    apple_uri: ''
  });
  const [filters, setFilters] = useState({
    search: '',
    json_file: '',
    year: '',
    has_spotify: undefined as boolean | undefined,
    has_apple: undefined as boolean | undefined,
  });

  const queryClient = useQueryClient();

  const { data: cards, isLoading } = useQuery({
    queryKey: ['cards', filters],
    queryFn: () => cardsApi.getAll(filters).then(res => res.data),
  });

  const { data: editionsData } = useQuery({
    queryKey: ['editions'],
    queryFn: () => statsApi.getEditions().then(res => res.data),
  });

  const createCardMutation = useMutation({
    mutationFn: cardsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['editions'] });
      setShowCreateModal(false);
      setFormData({ 
        id: '', 
        title: '', 
        artist: '', 
        year: '',
        spotify_id: '',
        spotify_uri: '',
        spotify_url: '',
        apple_id: '',
        apple_uri: ''
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filters.json_file) {
      alert('Bitte wähle zuerst eine Edition aus dem Filter');
      return;
    }
    
    // Erstelle das Card-Objekt mit den Spotify/Apple Strukturen
    const cardData: any = {
      filename: filters.json_file,
      id: formData.id,
      title: formData.title,
      artist: formData.artist,
      year: formData.year
    };
    
    // Füge Spotify-Daten hinzu wenn vorhanden
    if (formData.spotify_id || formData.spotify_uri || formData.spotify_url) {
      cardData.spotify = {
        id: formData.spotify_id,
        uri: formData.spotify_uri,
        url: formData.spotify_url
      };
    }
    
    // Füge Apple-Daten hinzu wenn vorhanden
    if (formData.apple_id || formData.apple_uri) {
      cardData.apple = {
        id: formData.apple_id,
        uri: formData.apple_uri
      };
    }
    
    createCardMutation.mutate(cardData);
  };

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

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Suche Artist, Title, Year..."
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
          
          <select
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.json_file}
            onChange={(e) => setFilters({ ...filters, json_file: e.target.value })}
          >
            <option value="">Alle Editionen</option>
            {editionsData?.editions.map((edition) => (
              <option key={edition.file} value={edition.file}>
                {edition.name}
              </option>
            ))}
          </select>
          
          <select
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.has_spotify === undefined ? '' : String(filters.has_spotify)}
            onChange={(e) => setFilters({
              ...filters,
              has_spotify: e.target.value === '' ? undefined : e.target.value === 'true'
            })}
          >
            <option value="">Alle (Spotify)</option>
            <option value="true">Nur mit Spotify</option>
            <option value="false">Nur ohne Spotify</option>
          </select>

          <select
            className="border border-gray-300 rounded-md px-4 py-2"
            value={filters.has_apple === undefined ? '' : String(filters.has_apple)}
            onChange={(e) => setFilters({
              ...filters,
              has_apple: e.target.value === '' ? undefined : e.target.value === 'true'
            })}
          >
            <option value="">Alle (Apple Music)</option>
            <option value="true">Nur mit Apple Music</option>
            <option value="false">Nur ohne Apple Music</option>
          </select>
        </div>
      </div>

      {/* Cards Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Lade Cards...</div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-700">
              {cards?.length || 0} Cards gefunden
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Artist - Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Spotify
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Apple Music
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cards?.map((card) => (
                  <tr key={`${card.source_file}-${card.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{card.artist}</div>
                      <div className="text-gray-500">{card.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.year}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {card.source_file}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {card.spotify?.id ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          ✓
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          –
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {card.apple?.id ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          ✓
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          –
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/cards/${card.source_file}/${card.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-2">
                Neue Card hinzufügen
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Edition: <span className="font-semibold">{editionsData?.editions.find(e => e.file === filters.json_file)?.name}</span>
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card ID
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{5}"
                    maxLength={5}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    placeholder="z.B. 00001"
                  />
                  <p className="text-xs text-gray-500 mt-1">5 Ziffern</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Song Titel"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Artist
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.artist}
                    onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                    placeholder="Künstler"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{4}"
                    maxLength={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Spotify (optional)</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Spotify ID
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.spotify_id}
                        onChange={(e) => setFormData({ ...formData, spotify_id: e.target.value })}
                        placeholder="z.B. 3n3Ppam7vgaVa1iaRUc9Lp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Spotify URI
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.spotify_uri}
                        onChange={(e) => setFormData({ ...formData, spotify_uri: e.target.value })}
                        placeholder="spotify:track:3n3Ppam7vgaVa1iaRUc9Lp"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Spotify URL
                      </label>
                      <input
                        type="url"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.spotify_url}
                        onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
                        placeholder="https://open.spotify.com/track/..."
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Apple Music (optional)</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apple Music ID
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.apple_id}
                        onChange={(e) => setFormData({ ...formData, apple_id: e.target.value })}
                        placeholder="z.B. 1440857781"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apple Music URI
                      </label>
                      <input
                        type="text"
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        value={formData.apple_uri}
                        onChange={(e) => setFormData({ ...formData, apple_uri: e.target.value })}
                        placeholder="music.apple.com/de/album/..."
                      />
                    </div>
                  </div>
                </div>

                {createCardMutation.isError && (
                  <div className="text-red-600 text-sm">
                    Fehler: {(createCardMutation.error as any)?.response?.data?.detail || 'Unbekannter Fehler'}
                  </div>
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
