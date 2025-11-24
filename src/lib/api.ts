import axios from 'axios';

const resolveBackendBaseUrl = (preferred: string | undefined) => {
  if (typeof window !== 'undefined') {
    const { protocol, host, origin } = window.location;

    if (preferred) {
      try {
        const parsed = new URL(preferred);

        const sameHostname = parsed.hostname === window.location.hostname;
        const preferredPort = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
        const currentPort = window.location.port || (protocol === 'https:' ? '443' : '80');
        const samePort = preferredPort === currentPort;

        if (sameHostname && samePort) {
          // Stick to the current origin when host (including port) matches to avoid mixed-content issues.
          return `${protocol}//${host}${parsed.pathname}${parsed.search}${parsed.hash}`;
        }

        if (protocol === 'https:' && parsed.protocol === 'http:') {
          // Upgrade any other http URL to https when the page itself is served via https.
          parsed.protocol = 'https:';
          return parsed.toString();
        }

        return parsed.toString();
      } catch (error) {
        console.warn('Failed to parse preferred API URL, falling back to window origin.', error);
      }
    }

    return origin;
  }

  return preferred ?? 'http://localhost:8000';
};

const API_BASE_URL = resolveBackendBaseUrl(import.meta.env.VITE_API_URL);

const resolveMucajeyApiUrl = (preferred: string | undefined) => {
  if (preferred) {
    return preferred;
  }

  return 'http://localhost:3000';
};

const MUCAJEY_API_URL = resolveMucajeyApiUrl(import.meta.env.VITE_MUCAJEY_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate API-Instanz für mucajey Backend (Node.js auf Port 3000)
export const mucajeyApi = axios.create({
  baseURL: MUCAJEY_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'mucajey-dev-key-2024', // API-Key für Node.js Backend
  },
});

// Types
export interface Card {
  id: string;
  title: string;
  artist: string;
  year: string;
  spotify?: {
    id: string;
    uri: string;
    url: string;
  };
  apple?: {
    id: string;
    uri: string;
  };
  edition?: string;
  language_short?: string;
  language_long?: string;
  source_file?: string;
}

export interface FailedSearch {
  json_file: string;
  card_id: string;
  artist: string;
  title: string;
  year: string;
  reason: string;
  search_url?: string;
  timestamp: string;
}

export interface FileInfo {
  filename: string;
  path: string;
  size: number;
  card_count?: number;
  edition?: string;
  has_failed_searches: boolean;
}

export interface DashboardStats {
  total_cards: number;
  total_editions: number;
  total_failed_searches: number;
  streaming_coverage: {
    spotify_count: number;
    apple_count: number;
    both_count: number;
    neither_count: number;
    spotify_percentage: number;
    apple_percentage: number;
    both_percentage: number;
  };
  edition_stats: Array<{
    edition: string;
    card_count: number;
    spotify_coverage: number;
    apple_coverage: number;
    failed_searches: number;
  }>;
  recent_failed_searches: FailedSearch[];
}

// API Functions
export const cardsApi = {
  getAll: (params?: {
    json_file?: string;
    year?: string;
    has_spotify?: boolean;
    has_apple?: boolean;
    search?: string;
  }) => api.get<Card[]>('/api/cards', { params }),
  
  getById: (cardId: string, jsonFile?: string) =>
    api.get<Card>(`/api/cards/${cardId}`, { params: { json_file: jsonFile } }),
  
  update: (cardId: string, jsonFile: string, data: Partial<Card>) =>
    mucajeyApi.put<Card>(`/api/files/${jsonFile}/cards/${cardId}`, data),
  
  delete: (cardId: string, jsonFile: string) =>
    api.delete(`/api/cards/${cardId}`, { params: { json_file: jsonFile } }),
  
  create: (data: { filename: string; id: string; title: string; artist: string; year: string; apple?: { id: string; uri: string }; spotify?: { id: string; uri: string; url: string } }) =>
    api.post('/api/cards/', data),
  
  // iTunes Search für einzelne Card
  searchItunes: (title: string, artist: string, country: string = 'de') =>
    mucajeyApi.get('/api/search/itunes', { params: { title, artist, country } }),
};

export const filesApi = {
  getAll: () => api.get<{ total_files: number; total_cards: number; files: FileInfo[] }>('/api/files'),
  
  getContent: (filename: string) => api.get(`/api/files/${filename}`),
  
  create: (data: { edition: string; identifier: string; language_short?: string; language_long?: string }) =>
    api.post('/api/files/', data),
  
  // Spotify & iTunes Sync verwenden das mucajey Backend (Node.js Port 3000)
  syncSpotifyPlaylist: (filename: string) =>
    mucajeyApi.post(`/api/files/${filename}/spotify-sync`),
  
  syncItunesMusic: (filename: string, country: string = 'de') =>
    mucajeyApi.post(`/api/files/${filename}/itunes-sync`, { country }),
};

export const failedSearchesApi = {
  getAll: (jsonFile?: string) =>
    api.get<FailedSearch[]>('/api/failed-searches', { params: { json_file: jsonFile } }),
  
  delete: (jsonFile: string, cardId: string) =>
    api.delete(`/api/failed-searches/${jsonFile}/${cardId}`),
  
  deleteAll: (jsonFile: string) =>
    api.delete(`/api/failed-searches/${jsonFile}`),
  
  retry: (jsonFile: string, service: string) =>
    api.post('/api/failed-searches/retry', { json_file: jsonFile, service }),
};

export const importApi = {
  start: (jsonFile: string, service: string, retryMode: boolean = false) =>
    api.post('/api/import/start', { json_file: jsonFile, service, retry_mode: retryMode }),
  
  getStatus: () => api.get('/api/import/status'),
  
  cancel: () => api.post('/api/import/cancel'),
};

export const statsApi = {
  getDashboard: () => api.get<DashboardStats>('/api/stats/dashboard'),
  
  getCoverage: () => api.get('/api/stats/coverage'),
  
  getEditions: () => api.get<{ editions: Array<{ name: string; file: string; card_count: number }> }>('/api/stats/editions'),
};
