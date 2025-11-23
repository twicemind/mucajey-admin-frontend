import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { filesApi } from '../lib/api';

interface SyncResult {
  message: string;
  filename: string;
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

export default function Files() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [formData, setFormData] = useState({
    edition: '',
    identifier: '',
    language_short: 'de',
    language_long: 'Deutsch'
  });
  
  const queryClient = useQueryClient();

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.getAll().then(res => res.data),
  });

  const createFileMutation = useMutation({
    mutationFn: filesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['editions'] });
      setShowCreateModal(false);
      setFormData({ edition: '', identifier: '', language_short: 'de', language_long: 'Deutsch' });
    },
  });

  const syncSpotifyMutation = useMutation({
    mutationFn: (filename: string) => filesApi.syncSpotifyPlaylist(filename),
    onSuccess: (data) => {
      setSyncResult(data.data as SyncResult);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const syncItunesMutation = useMutation({
    mutationFn: (filename: string) => filesApi.syncItunesMusic(filename),
    onSuccess: (data) => {
      setSyncResult(data.data as SyncResult);
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const handleSyncClick = (filename: string) => {
    setSelectedFile(filename);
    setSyncResult(null);
    setShowSyncModal(true);
    syncSpotifyMutation.mutate(filename);
  };

  const handleItunesSyncClick = (filename: string) => {
    setSelectedFile(filename);
    setSyncResult(null);
    setShowSyncModal(true);
    syncItunesMutation.mutate(filename);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createFileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Lade Dateien...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Files Overview</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow"
        >
          + Neue Datei erstellen
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📁</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Files</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{filesData?.total_files}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🎵</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Cards</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{filesData?.total_cards}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Files Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Edition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cards
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Failed Searches
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spotify Sync
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filesData?.files.map((file) => (
                <tr key={file.filename} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {file.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.edition || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.card_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.has_failed_searches ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        ⚠️ Ja
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ✓ Nein
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {file.filename !== 'hitster-de-import.json' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleSyncClick(file.filename)}
                          disabled={syncSpotifyMutation.isPending || syncItunesMutation.isPending}
                          className="text-green-600 hover:text-green-800 hover:underline inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Spotify Playlist Sync"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Spotify
                        </button>
                        <button
                          onClick={() => handleItunesSyncClick(file.filename)}
                          disabled={syncSpotifyMutation.isPending || syncItunesMutation.isPending}
                          className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          title="iTunes/Apple Music Sync"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                          </svg>
                          iTunes
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create File Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Neue Datei erstellen
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Edition Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.edition}
                    onChange={(e) => setFormData({ ...formData, edition: e.target.value })}
                    placeholder="z.B. Hitster Deutschland Test"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identifier (8 Zeichen)
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[a-z0-9]{8}"
                    maxLength={8}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    value={formData.identifier}
                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value.toLowerCase() })}
                    placeholder="z.B. aaaa0099"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nur Kleinbuchstaben und Zahlen</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sprache (kurz)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.language_short}
                      onChange={(e) => setFormData({ ...formData, language_short: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sprache (lang)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      value={formData.language_long}
                      onChange={(e) => setFormData({ ...formData, language_long: e.target.value })}
                    />
                  </div>
                </div>

                {createFileMutation.isError && (
                  <div className="text-red-600 text-sm">
                    Fehler: {(createFileMutation.error as Error & { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Unbekannter Fehler'}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={createFileMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {createFileMutation.isPending ? 'Erstelle...' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Sync Modal (Spotify & iTunes) */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  {syncSpotifyMutation.isPending || syncSpotifyMutation.isSuccess ? 'Spotify' : 'iTunes'} Sync - {selectedFile}
                </h3>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {(syncSpotifyMutation.isPending || syncItunesMutation.isPending) && (
                <div className="flex flex-col items-center justify-center py-8">
                  <svg className="animate-spin h-12 w-12 text-green-600 mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-gray-600">
                    {syncSpotifyMutation.isPending ? 'Synchronisiere mit Spotify Playlist...' : 'Synchronisiere mit iTunes Search API...'}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {syncItunesMutation.isPending && 'Dies kann einige Minuten dauern (Rate Limiting)...'}
                  </p>
                </div>
              )}

              {(syncSpotifyMutation.isError || syncItunesMutation.isError) && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Fehler beim Synchronisieren</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {((syncSpotifyMutation.error || syncItunesMutation.error) as Error)?.message || 'Unbekannter Fehler'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {syncResult && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex">
                      <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-green-800">Synchronisierung abgeschlossen</h3>
                        <p className="text-sm text-green-700 mt-1">{syncResult.message}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Details</h4>
                    <dl className="grid grid-cols-2 gap-4">
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Edition</dt>
                        <dd className="mt-1 text-sm text-gray-900">{syncResult.edition}</dd>
                      </div>
                      {syncResult.playlistId && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Playlist ID</dt>
                          <dd className="mt-1 text-sm text-gray-900">{syncResult.playlistId}</dd>
                        </div>
                      )}
                      {syncResult.country && (
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Country</dt>
                          <dd className="mt-1 text-sm text-gray-900">{syncResult.country}</dd>
                        </div>
                      )}
                      {syncResult.playlistUrl && (
                        <div className="col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Playlist URL</dt>
                          <dd className="mt-1 text-sm text-gray-900">
                            <a href={syncResult.playlistUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                              {syncResult.playlistUrl}
                            </a>
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Statistiken</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-md p-3">
                        <div className="text-2xl font-bold text-blue-600">{syncResult.statistics.totalCards}</div>
                        <div className="text-xs text-blue-600 mt-1">Gesamt Cards</div>
                      </div>
                      <div className="bg-green-50 rounded-md p-3">
                        <div className="text-2xl font-bold text-green-600">{syncResult.statistics.updated}</div>
                        <div className="text-xs text-green-600 mt-1">Aktualisiert</div>
                      </div>
                      <div className="bg-yellow-50 rounded-md p-3">
                        <div className="text-2xl font-bold text-yellow-600">{syncResult.statistics.skipped}</div>
                        <div className="text-xs text-yellow-600 mt-1">Übersprungen</div>
                      </div>
                      <div className="bg-red-50 rounded-md p-3">
                        <div className="text-2xl font-bold text-red-600">{syncResult.statistics.notFound}</div>
                        <div className="text-xs text-red-600 mt-1">Nicht gefunden</div>
                      </div>
                      {syncResult.statistics.playlistTracks && (
                        <div className="bg-purple-50 rounded-md p-3">
                          <div className="text-2xl font-bold text-purple-600">{syncResult.statistics.playlistTracks}</div>
                          <div className="text-xs text-purple-600 mt-1">Playlist Tracks</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {syncResult.updates && syncResult.updates.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-md p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Aktualisierte Cards ({syncResult.updates.length})</h4>
                      <div className="overflow-y-auto max-h-60">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Card ID</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Artist</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Spotify Track</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {syncResult.updates.map((update, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-xs text-gray-900">{update.cardId}</td>
                                <td className="px-3 py-2 text-xs text-gray-900">{update.title}</td>
                                <td className="px-3 py-2 text-xs text-gray-500">{update.artist}</td>
                                <td className="px-3 py-2 text-xs">
                                  <a 
                                    href={`https://open.spotify.com/track/${update.spotifyTrack}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-600 hover:underline"
                                  >
                                    {update.spotifyTrack}
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowSyncModal(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
