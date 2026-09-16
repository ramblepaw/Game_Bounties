"use server";

import { cookies } from "next/headers";

export type GamesView = "carousel" | "shelves";

/**
 * Kept in a cookie rather than browser storage so the server renders the right
 * view on the first pass. Reading a stored preference on the client instead
 * makes its initial render disagree with the server's HTML, which is a
 * hydration error.
 */
export async function setGamesView(view: GamesView): Promise<void> {
  const store = await cookies();
  store.set("games-view", view, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
