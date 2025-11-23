import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { failedSearchesApi } from '../lib/api';

export default function FailedSearches() {
  const [selectedFile, setSelectedFile] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: failedSearches, isLoading } = useQuery({
    queryKey: ['failed-searches', selectedFile],
    queryFn: () => failedSearchesApi.getAll(selectedFile || undefined).then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ jsonFile, cardId }: { jsonFile: string; cardId: string }) =>
      failedSearchesApi.delete(jsonFile, cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-searches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: (jsonFile: string) => failedSearchesApi.deleteAll(jsonFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['failed-searches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // Gruppiere nach json_file
  const groupedFailedSearches = failedSearches?.reduce((acc, fs) => {
    if (!acc[fs.json_file]) {
      acc[fs.json_file] = [];
    }
    acc[fs.json_file].push(fs);
    return acc;
  }, {} as Record<string, typeof failedSearches>);

  return (
    <div className="px-4 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Failed Searches</h2>
        {selectedFile && (
          <button
            onClick={() => {
              if (confirm(`Alle Failed Searches für ${selectedFile} löschen?`)) {
                deleteAllMutation.mutate(selectedFile);
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Alle für {selectedFile} löschen
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Lade Failed Searches...</div>
        </div>
      ) : !failedSearches || failedSearches.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">Keine Failed Searches gefunden! 🎉</p>
        </div>
      ) : (
        <>
          {/* File Filter */}
          <div className="bg-white shadow rounded-lg p-4 mb-6">
            <select
              className="border border-gray-300 rounded-md px-4 py-2 w-full md:w-auto"
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
            >
              <option value="">Alle Dateien ({failedSearches.length})</option>
              {groupedFailedSearches && Object.keys(groupedFailedSearches).map(file => (
                <option key={file} value={file}>
                  {file} ({groupedFailedSearches[file].length})
                </option>
              ))}
            </select>
          </div>

          {/* Failed Searches Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Card ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Artist - Title (Year)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Link
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {failedSearches.map((fs) => (
                    <tr key={`${fs.json_file}-${fs.card_id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {fs.json_file}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fs.card_id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium">{fs.artist}</div>
                        <div className="text-gray-500">{fs.title} ({fs.year})</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {fs.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {fs.search_url ? (
                          <a
                            href={fs.search_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Link testen →
                          </a>
                        ) : (
                          <span className="text-gray-400">–</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(fs.timestamp).toLocaleString('de-DE')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            if (confirm(`Failed Search für Card ${fs.card_id} löschen?`)) {
                              deleteMutation.mutate({
                                jsonFile: fs.json_file,
                                cardId: fs.card_id
                              });
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
