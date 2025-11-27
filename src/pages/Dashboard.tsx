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
        <div className="text-gray-500">Lade Statistiken...</div>
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
    <div className="px-4 sm:px-0">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🎵</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Cards</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{summary.total_cards}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📚</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Editionen</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{summary.total_editions}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🗂️</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Files</dt>
                  <dd className="text-2xl font-semibold text-gray-900">{summary.total_files}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Cards with Streaming</dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {summary.cards_with_any_streaming}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Streaming Coverage</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Spotify IDs</span>
              <span className="text-sm text-gray-500">
                {summary.cards_with_spotify_id} Cards ({spotifyPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${spotifyPercentage}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Apple IDs</span>
              <span className="text-sm text-gray-500">
                {summary.cards_with_apple_id} Cards ({applePercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-red-600 h-2.5 rounded-full"
                style={{ width: `${applePercentage}%` }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Both Services</span>
              <span className="text-sm text-gray-500">
                {summary.cards_with_both_streaming} Cards ({bothPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${bothPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Editions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identifier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cards
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {editions.map((edition) => (
                <tr key={edition.file}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {edition.edition_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {edition.identifier || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {edition.language_long || edition.language_short || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {edition.file}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {edition.cardCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
