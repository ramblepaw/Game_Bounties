import "server-only";

const TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const API_URL = "https://api.igdb.com/v4/games";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("IGDB is not configured (missing IGDB_CLIENT_ID / IGDB_CLIENT_SECRET).");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(`${TOKEN_URL}?${params.toString()}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Failed to authenticate with IGDB (${res.status}).`);
  }

  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: body.access_token,
    // Refresh a minute early to avoid edge-of-expiry failures.
    expiresAt: Date.now() + (body.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}

export type IgdbSearchResult = {
  igdbId: number;
  name: string;
  releaseYear: number | null;
  platforms: string[];
  coverImageUrl: string | null;
  summary: string | null;
  genres: string[];
};

type IgdbGameResponse = {
  id: number;
  name: string;
  first_release_date?: number;
  platforms?: { name: string }[];
  cover?: { image_id: string };
  summary?: string;
  genres?: { name: string }[];
};

export async function searchIgdbGames(query: string): Promise<IgdbSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const accessToken = await getAccessToken();
  const clientId = process.env.IGDB_CLIENT_ID!;

  // Apicalypse query language: escape embedded quotes in the search term.
  const escaped = trimmed.replace(/"/g, '\\"');
  const body = `search "${escaped}"; fields name,first_release_date,platforms.name,cover.image_id,summary,genres.name; limit 10;`;

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`IGDB search failed (${res.status}).`);
  }

  const results = (await res.json()) as IgdbGameResponse[];

  return results.map((r) => ({
    igdbId: r.id,
    name: r.name,
    releaseYear: r.first_release_date
      ? new Date(r.first_release_date * 1000).getUTCFullYear()
      : null,
    platforms: r.platforms?.map((p) => p.name) ?? [],
    coverImageUrl: r.cover
      ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${r.cover.image_id}.jpg`
      : null,
    summary: r.summary ?? null,
    genres: r.genres?.map((g) => g.name) ?? [],
  }));
}
