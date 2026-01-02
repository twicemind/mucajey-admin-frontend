import axios, { type InternalAxiosRequestConfig } from 'axios';

declare global {
  interface Window {
    __APP_CONFIG__?: {
      apiBaseUrl?: string;
      mucajeyApiUrl?: string;
      mucajeyApiKey?: string;
    };
  }
}

const normalizePreferredUrl = (preferred: string | undefined) => {
  if (!preferred) {
    return undefined;
  }

  const trimmed = preferred.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizePreferredValue = (value: string | undefined) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

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
const enforceHttpsOnSameOrigin = (url: string | undefined) => {
  if (!url || typeof window === 'undefined') {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (window.location.protocol === 'https:' && parsed.protocol === 'http:' && parsed.hostname === window.location.hostname) {
      parsed.protocol = 'https:';
      return parsed.toString();
    }
    return url;
  } catch (error) {
    console.warn('Failed to enforce https on URL, leaving as is.', error, url);
    return url;
  }
};
const runtimeApiUrl = typeof window !== 'undefined' ? normalizePreferredUrl(window.__APP_CONFIG__?.apiBaseUrl) : undefined;
const API_BASE_URL = enforceHttpsOnSameOrigin(resolveBackendBaseUrl(runtimeApiUrl ?? normalizePreferredUrl(import.meta.env.VITE_API_URL)));

const resolveMucajeyApiUrl = (preferred: string | undefined) => {
  if (preferred) {
    return preferred;
  }

  return 'http://localhost:3000';
};
const runtimeMucajeyUrl = typeof window !== 'undefined' ? normalizePreferredUrl(window.__APP_CONFIG__?.mucajeyApiUrl) : undefined;
const MUCAJEY_API_URL = enforceHttpsOnSameOrigin(resolveMucajeyApiUrl(runtimeMucajeyUrl ?? normalizePreferredUrl(import.meta.env.VITE_MUCAJEY_API_URL)));
const runtimeMucajeyApiKey = typeof window !== 'undefined' ? normalizePreferredValue(window.__APP_CONFIG__?.mucajeyApiKey) : undefined;
const MUCAJEY_API_KEY = runtimeMucajeyApiKey ?? normalizePreferredValue(import.meta.env.VITE_MUCAJEY_API_KEY) ?? 'mucajey-dev-key-2024';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Separate API-Instanz für mucajey Backend (Node.js auf Port 3000)
export const mucajeyApi = axios.create({
  baseURL: MUCAJEY_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': MUCAJEY_API_KEY, // API-Key für Node.js Backend
  },
  withCredentials: true,
});

// Session-bound API uses the admin server's origin so /auth routes stay on the same host.
export const sessionApi = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

const createRequestNormalizer = (baseUrl: string | undefined) => (config: InternalAxiosRequestConfig) => {
  if (typeof window === 'undefined') {
    return config;
  }

  const inputUrl = config.url ?? '';

  if (!baseUrl) {
    return config;
  }

  try {
    const combined = new URL(inputUrl, baseUrl);
    config.baseURL = undefined;
    config.url = combined.toString();
  } catch (error) {
    console.warn('[mucajey-admin] Failed to normalize request URL', { inputUrl, apiBase: baseUrl, error });
  }

  return config;
};

api.interceptors.request.use(createRequestNormalizer(API_BASE_URL));

if (typeof window !== 'undefined') {
  console.info('[mucajey-admin] API base URLs resolved', {
    API_BASE_URL,
    MUCAJEY_API_URL,
    runtimeApiUrl,
    runtimeMucajeyUrl,
  });
}

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
  edition_id?: string;
  language_short?: string;
  language_long?: string;
  edition_name?: string;
}

export interface CardCreatePayload {
  edition_id: string;
  edition?: string;
  id: string;
  title: string;
  artist: string;
  year: string;
  apple?: {
    id?: string;
    uri?: string;
  } | null;
  spotify?: {
    id?: string;
    uri?: string;
    url?: string;
  } | null;
}

export type CardUpdatePayload = Partial<{
  title: string;
  artist: string;
  year: string;
  apple: CardCreatePayload['apple'];
  spotify: CardCreatePayload['spotify'];
}>;

export interface ItunesTrack {
  id?: string;
  uri?: string;
  name?: string;
  artist?: string;
}

export interface FailedSearch {
  edition: string;
  card_id: string;
  artist: string;
  title: string;
  year: string;
  reason: string;
  search_url?: string;
  timestamp: string;
}

export interface StatsSummary {
  total_cards: number;
  total_editions: number;
  cards_with_apple_id: number;
  cards_with_apple_uri: number;
  cards_with_spotify_id: number;
  cards_with_spotify_uri: number;
  cards_with_both_streaming: number;
  cards_with_any_streaming: number;
  cards_missing_streaming: number;
  cards_without_identifier: number;
  average_cards_per_edition: number;
  language_distribution: Record<string, number>;
  cards_by_year: Record<string, number>;
  cards_by_genre: Record<string, number>;
  cards_per_edition: Record<string, number>;
}

export interface EditionStatsEntry {
  edition_id: string;
  edition_name: string;
  edition?: string;
  language_short: string;
  language_long: string;
  identifier: string;
  cardCount: number;
}

export interface DashboardStats {
  summary: StatsSummary;
  editions: EditionStatsEntry[];
}

export interface EditionEntry {
  edition_id: string;
  edition_name: string;
  language_short: string;
  language_long: string;
  identifier: string;
  spotify_playlist: string;
  cardCount: number;
  playlistId?: string;
  playlistUrl?: string;
  country?: string;
  playlistTracks?: number;
  image?: {
    href: string;
    exists: boolean;
    filename?: string;
  };
}

type ResultMessage<T extends Record<string, unknown>> = {
  docs: {
    method: string;
    path: string;
    description?: string;
  };
  message: string;
} & T;

export type ItunesSearchResponse = ResultMessage<{ track?: ItunesTrack }>;

// API Functions
const encodeSegment = (value: string) => encodeURIComponent(value);

export const cardsApi = {
  getAll: () =>
    mucajeyApi
      .get<ResultMessage<{ cards: Card[] }>>('/card/all')
      .then(res => res.data.cards ?? []),
  create: (payload: CardCreatePayload) =>
    mucajeyApi
      .post<ResultMessage<{ card: Card }>>('/card', payload)
      .then(res => res.data.card),
  update: (edition: string, cardId: string, data: CardUpdatePayload) =>
    mucajeyApi
      .patch<ResultMessage<{ card: Card }>>(
        `/card/${encodeSegment(edition)}/${encodeSegment(cardId)}`,
        data
      )
      .then(res => res.data.card),
  delete: (edition: string, cardId: string) =>
    mucajeyApi.delete(`/card/${encodeSegment(edition)}/${encodeSegment(cardId)}`),
  mapApple: (edition: string, cardId: string) =>
    mucajeyApi
      .post<ResultMessage<{ card: Card; apple?: Card['apple'] }>>(
        `/card/${encodeSegment(edition)}/${encodeSegment(cardId)}/apple/search`
      )
      .then((res) => res.data.card),
  // iTunes Search für einzelne Card
  searchItunes: (title: string, artist: string, country: string = 'de') =>
    mucajeyApi.get<ItunesSearchResponse>('/v1/search/itunes', { params: { title, artist, country } }),
};

export const editionsApi = {
  getAll: () =>
    mucajeyApi
      .get<ResultMessage<{ editions: EditionEntry[] }>>('/edition/all')
      .then(res => res.data.editions ?? []),

  get: (editionId: string) =>
    mucajeyApi
      .get<ResultMessage<{ edition: EditionEntry }>>(`/edition/${encodeSegment(editionId)}`)
      .then(res => res.data.edition),

  delete: (editionId: string) =>
    mucajeyApi.delete(`/edition/${encodeSegment(editionId)}`),

  update: (data: {
    edition_id: string;
    edition_name: string;
    identifier: string;
    language_short: string;
    language_long: string;
    spotify_playlist: string;
  }) => mucajeyApi.post('/edition', data)
      .then(res => res.data.edition),

  create: (data: {
    edition_id: string;
    edition_name: string;
    identifier: string;
    language_short?: string;
    language_long?: string;
    spotify_playlist?: string;
  }) => mucajeyApi.put('/edition', data),

  // Spotify & iTunes Sync über das mucajey Backend (Node.js Port 3000)
  syncSpotifyPlaylist: (filename: string) =>
    mucajeyApi.post(`/api/files/${filename}/spotify-sync`),

  syncItunesMusic: (filename: string, country: string = 'de') =>
    mucajeyApi.post(`/api/files/${filename}/itunes-sync`, { country }),
};

export const statsApi = {
  getDashboard: () => mucajeyApi.get<DashboardStats>('/stats'),
};

export const authApi = {
  changePassword: (payload: { currentPassword?: string; newPassword: string }) =>
    sessionApi.post('/auth/users/password', payload),
  resetPassword: (username: string, password: string) =>
    sessionApi.post(`/auth/users/${encodeSegment(username)}/password`, { password }),
  deleteUser: (username: string) => sessionApi.delete(`/auth/users/${encodeSegment(username)}`),
};
