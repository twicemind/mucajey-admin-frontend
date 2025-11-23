import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importApi, filesApi } from '../lib/api';

export default function ImportTools() {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedService, setSelectedService] = useState<'spotify' | 'apple'>('spotify');
  const [retryMode, setRetryMode] = useState(false);

  const { data: filesData } = useQuery({
    queryKey: ['files'],
    queryFn: () => filesApi.getAll().then(res => res.data),
  });

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['import-status'],
    queryFn: () => importApi.getStatus().then(res => res.data),
    refetchInterval: status?.running ? 2000 : false, // Poll alle 2s wenn Import läuft
  });

  const startImportMutation = useMutation({
    mutationFn: () => importApi.start(selectedFile, selectedService, retryMode),
    onSuccess: () => {
      refetchStatus();
      queryClient.invalidateQueries({ queryKey: ['failed-searches'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleStartImport = () => {
    if (!selectedFile) {
      alert('Bitte wähle eine Datei aus');
      return;
    }
    
    if (confirm(`Import für ${selectedFile} mit ${selectedService.toUpperCase()} starten?${retryMode ? ' (Retry-Modus)' : ''}`)) {
      startImportMutation.mutate();
    }
  };

  return (
    <div className="px-4 sm:px-0">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Import Tools</h2>

      {/* Import Status */}
      {status?.running && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Import läuft...</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p><strong>Datei:</strong> {status.json_file}</p>
                <p><strong>Service:</strong> {status.service}</p>
                <p><strong>Status:</strong> {status.status_message}</p>
                {status.total > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-blue-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all"
                        style={{ width: `${(status.progress / status.total) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1">{status.progress} / {status.total}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Configuration */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Neuen Import starten</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          {/* File Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              JSON-Datei auswählen
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-4 py-2"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              disabled={status?.running}
            >
              <option value="">-- Datei wählen --</option>
              {filesData?.files.map((file) => (
                <option key={file.filename} value={file.filename}>
                  {file.filename} ({file.card_count} Cards)
                  {file.has_failed_searches && ' ⚠️'}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              ⚠️ = Hat Failed Searches (Retry verfügbar)
            </p>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Streaming Service
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="service"
                  value="spotify"
                  checked={selectedService === 'spotify'}
                  onChange={() => setSelectedService('spotify')}
                  disabled={status?.running}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900">Spotify</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="service"
                  value="apple"
                  checked={selectedService === 'apple'}
                  onChange={() => setSelectedService('apple')}
                  disabled={status?.running}
                  className="mr-2"
                />
                <span className="text-sm text-gray-900">Apple Music</span>
              </label>
            </div>
          </div>
        </div>

        {/* Retry Mode */}
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={retryMode}
              onChange={(e) => setRetryMode(e.target.checked)}
              disabled={status?.running}
              className="mr-2"
            />
            <span className="text-sm text-gray-900">
              Retry-Modus (nur Failed Searches neu versuchen)
            </span>
          </label>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartImport}
          disabled={status?.running || !selectedFile}
          className={`w-full md:w-auto px-6 py-2 rounded-md font-medium ${
            status?.running || !selectedFile
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {status?.running ? 'Import läuft...' : 'Import starten'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Hinweise zum Import</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Spotify-Import: Nutzt Spotipy-Library, benötigt API-Credentials</li>
                <li>Apple Music Import: Nutzt iTunes Search API, sehr restriktiv (403 Blocks möglich)</li>
                <li>Import kann jederzeit mit Ctrl+C abgebrochen werden</li>
                <li>Failed Searches werden automatisch gespeichert für späteren Retry</li>
                <li>Retry-Modus verarbeitet nur fehlgeschlagene Einträge</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
