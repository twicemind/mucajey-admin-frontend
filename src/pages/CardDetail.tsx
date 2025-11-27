import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import {
  cardsApi,
  type Card,
  type CardUpdatePayload,
  type ItunesTrack
} from '../lib/api';

export default function CardDetail() {
  const { filename, id } = useParams<{ filename: string; id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [itunesSearchResult, setItunesSearchResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    year: '',
    spotify_id: '',
    spotify_uri: '',
    spotify_url: '',
    apple_id: '',
    apple_uri: ''
  });

  const { data: cards = [], isLoading, error } = useQuery<Card[]>({
    queryKey: ['cards'],
    queryFn: cardsApi.getAll,
    enabled: !!filename,
  });

  const card = useMemo(
    () =>
      cards.find(
        (c) =>
          c.id === id &&
          (c.source_file ?? c.edition_file ?? '') === (filename ?? '')
      ),
    [cards, filename, id]
  );

  const updateCardMutation = useMutation({
    mutationFn: ({ cardId, jsonFile, data }: { cardId: string; jsonFile: string; data: CardUpdatePayload }) =>
      cardsApi.update(jsonFile, cardId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setIsEditing(false);
    },
  });

  const searchItunesMutation = useMutation({
    mutationFn: () => {
      if (!card) throw new Error('No card data');
      return cardsApi.searchItunes(card.title, card.artist, 'de');
    },
    onSuccess: (response) => {
      const track: ItunesTrack | undefined = response.data.track;
      if (track?.id && track?.uri) {
        setFormData((prev) => ({
          ...prev,
          apple_id: track.id ?? '',
          apple_uri: track.uri ?? ''
        }));
        setItunesSearchResult(`✓ Gefunden: ${track.name ?? ''} - ${track.artist ?? ''}`);
        setTimeout(() => setItunesSearchResult(null), 5000);
        return;
      }
      setItunesSearchResult(`✗ ${response.data.message || 'Kein Match gefunden'}`);
      setTimeout(() => setItunesSearchResult(null), 5000);
    },
    onError: (error: any) => {
      setItunesSearchResult(`✗ ${error?.response?.data?.message || 'Kein Match gefunden'}`);
      setTimeout(() => setItunesSearchResult(null), 5000);
    },
  });

  useEffect(() => {
    if (!card || isEditing || formData.title) {
      return;
    }

    setFormData({
      title: card.title,
      artist: card.artist,
      year: card.year,
      spotify_id: card.spotify?.id || '',
      spotify_uri: card.spotify?.uri || '',
      spotify_url: card.spotify?.url || '',
      apple_id: card.apple?.id || '',
      apple_uri: card.apple?.uri || ''
    });
  }, [card, isEditing, formData.title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename || !id) return;

    const updateData: CardUpdatePayload = {
      title: formData.title,
      artist: formData.artist,
      year: formData.year
    };

    // Spotify-Daten hinzufügen wenn vorhanden
    if (formData.spotify_id || formData.spotify_uri || formData.spotify_url) {
      updateData.spotify = {
        id: formData.spotify_id,
        uri: formData.spotify_uri,
        url: formData.spotify_url
      };
    }

    // Apple-Daten hinzufügen wenn vorhanden
    if (formData.apple_id || formData.apple_uri) {
      updateData.apple = {
        id: formData.apple_id,
        uri: formData.apple_uri
      };
    }

      updateCardMutation.mutate({
        cardId: id,
        jsonFile: filename,
        data: updateData
      });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Lade Card Details...</div>
      </div>
    );
  }

  if (error || !card) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-red-800 font-semibold">Card nicht gefunden</h2>
          <p className="text-red-600 mt-2">Die angeforderte Card konnte nicht geladen werden.</p>
          <button
            onClick={() => navigate('/cards')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/cards')}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Zurück zur Übersicht
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{isEditing ? 'Card bearbeiten' : card.title}</h1>
          <p className="text-xl text-gray-600 mt-2">{isEditing ? `ID: ${card.id}` : card.artist}</p>
        </div>
        <div>
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Bearbeiten
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    title: card.title,
                    artist: card.artist,
                    year: card.year,
                    spotify_id: card.spotify?.id || '',
                    spotify_uri: card.spotify?.uri || '',
                    spotify_url: card.spotify?.url || '',
                    apple_id: card.apple?.id || '',
                    apple_uri: card.apple?.uri || ''
                  });
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={updateCardMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {updateCardMutation.isPending ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg overflow-hidden mb-6">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Card bearbeiten</h2>
          </div>
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Artist</label>
              <input
                type="text"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jahr</label>
              <input
                type="text"
                pattern="[0-9]{4}"
                maxLength={4}
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Spotify</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spotify ID</label>
                  <input
                    type="text"
                    value={formData.spotify_id}
                    onChange={(e) => setFormData({ ...formData, spotify_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spotify URI</label>
                  <input
                    type="text"
                    value={formData.spotify_uri}
                    onChange={(e) => setFormData({ ...formData, spotify_uri: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Spotify URL</label>
                  <input
                    type="url"
                    value={formData.spotify_url}
                    onChange={(e) => setFormData({ ...formData, spotify_url: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                <span>Apple Music</span>
                <button
                  type="button"
                  onClick={() => searchItunesMutation.mutate()}
                  disabled={searchItunesMutation.isPending || !formData.title || !formData.artist}
                  className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {searchItunesMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Suche...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      iTunes Match
                    </>
                  )}
                </button>
              </h3>
              {itunesSearchResult && (
                <div className={`mb-3 p-2 rounded text-sm ${
                  itunesSearchResult.startsWith('✓') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                }`}>
                  {itunesSearchResult}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apple Music ID</label>
                  <input
                    type="text"
                    value={formData.apple_id}
                    onChange={(e) => setFormData({ ...formData, apple_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apple Music URI</label>
                  <input
                    type="text"
                    value={formData.apple_uri}
                    onChange={(e) => setFormData({ ...formData, apple_uri: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {updateCardMutation.isError && (
              <div className="text-red-600 text-sm">
                <div>Fehler beim Aktualisieren der Card:</div>
                <div className="mt-1 font-mono text-xs">
                  {(updateCardMutation.error as any)?.response?.data?.error || 
                   (updateCardMutation.error as any)?.response?.data?.detail || 
                   (updateCardMutation.error as any)?.response?.data?.message ||
                   (updateCardMutation.error as any)?.message ||
                   'Unbekannter Fehler'}
                </div>
                {(updateCardMutation.error as any)?.response?.data?.details && (
                  <div className="mt-1 text-xs">Details: {(updateCardMutation.error as any).response.data.details}</div>
                )}
              </div>
            )}
          </div>
        </form>
      )}

      {/* Read-Only View */}
      {!isEditing && (
        <>
          {/* Main Info Card */}
          <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Basis-Informationen</h2>
            </div>
            <div className="px-6 py-4">
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Card ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{card.id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Jahr</dt>
                  <dd className="mt-1 text-sm text-gray-900">{card.year}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Datei</dt>
                  <dd className="mt-1 text-sm text-gray-900">{card.source_file}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Spotify Card */}
          {(card.spotify?.id || card.spotify?.uri || card.spotify?.url) && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4 bg-green-50 border-b border-green-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                  </svg>
                  Spotify
                </h2>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-3">
                  {card.spotify?.id && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Spotify ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{card.spotify.id}</dd>
                    </div>
                  )}
                  {card.spotify?.uri && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Spotify URI</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{card.spotify.uri}</dd>
                    </div>
                  )}
                  {card.spotify?.url && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Spotify URL</dt>
                      <dd className="mt-1">
                        <a
                          href={card.spotify.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                          {card.spotify.url}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                {card.spotify?.url && (
                  <div className="mt-4">
                    <a
                      href={card.spotify.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Auf Spotify öffnen
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Apple Music Card */}
          {(card.apple?.id || card.apple?.uri) && (
            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <div className="px-6 py-4 bg-pink-50 border-b border-pink-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.994 6.124c0-.738-.034-1.47-.098-2.198-.063-.726-.189-1.45-.394-2.16-.209-.718-.482-1.414-.844-2.076-.36-.66-.796-1.288-1.32-1.835-.524-.547-1.152-.983-1.812-1.343-.662-.362-1.358-.635-2.076-.844-.71-.205-1.434-.331-2.16-.394C14.564.01 13.832 0 13.094 0H10.906c-.738 0-1.47.034-2.198.098-.726.063-1.45.189-2.16.394-.718.209-1.414.482-2.076.844-.66.36-1.288.796-1.835 1.32-.547.524-.983 1.152-1.343 1.812-.362.662-.635 1.358-.844 2.076-.205.71-.331 1.434-.394 2.16C.01 7.436 0 8.168 0 8.906v6.188c0 .738.034 1.47.098 2.198.063.726.189 1.45.394 2.16.209.718.482 1.414.844 2.076.36.66.796 1.288 1.32 1.835.524.547 1.152.983 1.812 1.343.662.362 1.358.635 2.076.844.71.205 1.434.331 2.16.394.728.064 1.46.098 2.198.098h2.188c.738 0 1.47-.034 2.198-.098.726-.063 1.45-.189 2.16-.394.718-.209 1.414-.482 2.076-.844.66-.36 1.288-.796 1.835-1.32.547-.524.983-1.152 1.343-1.812.362-.662.635-1.358.844-2.076.205-.71.331-1.434.394-2.16.064-.728.098-1.46.098-2.198V8.906c0-.738-.034-1.47-.098-2.198zM12 19.2c-4.032 0-7.2-3.168-7.2-7.2 0-4.032 3.168-7.2 7.2-7.2 4.032 0 7.2 3.168 7.2 7.2 0 4.032-3.168 7.2-7.2 7.2zm0-12.735c-3.05 0-5.535 2.485-5.535 5.535S8.95 17.535 12 17.535 17.535 15.05 17.535 12 15.05 6.465 12 6.465z"/>
                  </svg>
                  Apple Music
                </h2>
              </div>
              <div className="px-6 py-4">
                <dl className="space-y-3">
                  {card.apple?.id && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Apple Music ID</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">{card.apple.id}</dd>
                    </div>
                  )}
                  {card.apple?.uri && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Apple Music URI</dt>
                      <dd className="mt-1">
                        <a
                          href={card.apple.uri.startsWith('http') ? card.apple.uri : `https://${card.apple.uri}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline break-all"
                        >
                          {card.apple.uri}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                {card.apple?.uri && (
                  <div className="mt-4">
                    <a
                      href={card.apple.uri.startsWith('http') ? card.apple.uri : `https://${card.apple.uri}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                    >
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.994 6.124c0-.738-.034-1.47-.098-2.198-.063-.726-.189-1.45-.394-2.16-.209-.718-.482-1.414-.844-2.076-.36-.66-.796-1.288-1.32-1.835-.524-.547-1.152-.983-1.812-1.343-.662-.362-1.358-.635-2.076-.844-.71-.205-1.434-.331-2.16-.394C14.564.01 13.832 0 13.094 0H10.906c-.738 0-1.47.034-2.198.098-.726.063-1.45.189-2.16.394-.718.209-1.414.482-2.076.844-.66.36-1.288.796-1.835 1.32-.547.524-.983 1.152-1.343 1.812-.362.662-.635 1.358-.844 2.076-.205.71-.331 1.434-.394 2.16C.01 7.436 0 8.168 0 8.906v6.188c0 .738.034 1.47.098 2.198.063.726.189 1.45.394 2.16.209.718.482 1.414.844 2.076.36.66.796 1.288 1.32 1.835.524.547 1.152.983 1.812 1.343.662.362 1.358.635 2.076.844.71.205 1.434.331 2.16.394.728.064 1.46.098 2.198.098h2.188c.738 0 1.47-.034 2.198-.098.726-.063 1.45-.189 2.16-.394.718-.209 1.414-.482 2.076-.844.66-.36 1.288-.796 1.835-1.32.547-.524.983-1.152 1.343-1.812.362-.662.635-1.358.844-2.076.205-.71.331-1.434.394-2.16.064-.728.098-1.46.098-2.198V8.906c0-.738-.034-1.47-.098-2.198zM12 19.2c-4.032 0-7.2-3.168-7.2-7.2 0-4.032 3.168-7.2 7.2-7.2 4.032 0 7.2 3.168 7.2 7.2 0 4.032-3.168 7.2-7.2 7.2zm0-12.735c-3.05 0-5.535 2.485-5.535 5.535S8.95 17.535 12 17.535 17.535 15.05 17.535 12 15.05 6.465 12 6.465z"/>
                      </svg>
                      Auf Apple Music öffnen
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Streaming Services Available */}
          {!card.spotify?.id && !card.spotify?.uri && !card.spotify?.url && !card.apple?.id && !card.apple?.uri && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Für diese Card sind keine Streaming-Dienst Links verfügbar.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
