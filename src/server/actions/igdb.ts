"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { searchIgdbGames, type IgdbSearchResult } from "@/lib/igdb";

export type IgdbSearchState = { results: IgdbSearchResult[]; error: string | null };

export async function searchGamesOnIgdb(query: string): Promise<IgdbSearchState> {
  const session = await getSession();
  if (!session) redirect("/login");

  try {
    const results = await searchIgdbGames(query);
    return { results, error: null };
  } catch (err) {
    return { results: [], error: err instanceof Error ? err.message : "IGDB search failed." };
  }
}
