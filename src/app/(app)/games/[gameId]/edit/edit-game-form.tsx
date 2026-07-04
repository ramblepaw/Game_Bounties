"use client";

import { useActionState, useState, useTransition } from "react";
import { updateGame, type GameFormState } from "@/server/actions/games";
import { searchGamesOnIgdb } from "@/server/actions/igdb";
import type { IgdbSearchResult } from "@/lib/igdb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: GameFormState = { error: null };

type EditableGame = {
  id: string;
  title: string;
  platform: string | null;
  releaseYear: number | null;
  notes: string | null;
  coverImageUrl: string | null;
};

export function EditGameForm({ game }: { game: EditableGame }) {
  const action = updateGame.bind(null, game.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [isSearching, startSearch] = useTransition();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IgdbSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<IgdbSearchResult | null>(null);

  const [title, setTitle] = useState(game.title);
  const [platform, setPlatform] = useState(game.platform ?? "");
  const [releaseYear, setReleaseYear] = useState(game.releaseYear ? String(game.releaseYear) : "");

  function runSearch() {
    if (!query.trim()) return;
    startSearch(async () => {
      const { results, error } = await searchGamesOnIgdb(query);
      setResults(results);
      setSearchError(error);
    });
  }

  function pickResult(result: IgdbSearchResult) {
    setSelected(result);
    setTitle(result.name);
    setPlatform(result.platforms.join(", "));
    setReleaseYear(result.releaseYear ? String(result.releaseYear) : "");
    setResults([]);
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-neutral-300 p-3 dark:border-neutral-700">
        <label htmlFor="igdbQuery" className="text-sm font-medium">
          Re-search IGDB (optional — refreshes summary/genres/cover)
        </label>
        <div className="flex gap-2">
          <Input
            id="igdbQuery"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runSearch();
              }
            }}
            placeholder="Search for a game…"
          />
          <Button type="button" size="sm" variant="secondary" disabled={isSearching} onClick={runSearch}>
            {isSearching ? "Searching…" : "Search"}
          </Button>
        </div>
        {searchError && <p className="text-sm text-red-600">{searchError}</p>}
        {results.length > 0 && (
          <ul className="flex flex-col gap-1">
            {results.map((r) => (
              <li key={r.igdbId}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="flex w-full items-center gap-3 rounded-md p-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {r.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverImageUrl} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-9 shrink-0 rounded bg-neutral-200 dark:bg-neutral-700" />
                  )}
                  <span>
                    {r.name}
                    {r.releaseYear && <span className="text-neutral-500 dark:text-neutral-400"> ({r.releaseYear})</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <div className="flex items-center justify-between rounded-md bg-neutral-100 px-3 py-2 text-sm dark:bg-neutral-800">
            <span>
              Selected: <strong>{selected.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      <input type="hidden" name="igdbId" value={selected?.igdbId ?? ""} />
      <input type="hidden" name="summary" value={selected?.summary ?? ""} />
      <input type="hidden" name="genres" value={selected?.genres.join(", ") ?? ""} />
      <input type="hidden" name="igdbCoverImageUrl" value={selected?.coverImageUrl ?? ""} />

      <div className="flex flex-col gap-1">
        <label htmlFor="title" className="text-sm font-medium">
          Title
        </label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="platform" className="text-sm font-medium">
          Platform
        </label>
        <Input
          id="platform"
          name="platform"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="Switch, PS5, PC…"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="releaseYear" className="text-sm font-medium">
          Release year
        </label>
        <Input
          id="releaseYear"
          name="releaseYear"
          type="number"
          value={releaseYear}
          onChange={(e) => setReleaseYear(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="coverImage" className="text-sm font-medium">
          Cover art {selected?.coverImageUrl && "(overrides the IGDB cover above)"}
        </label>
        {game.coverImageUrl && !selected?.coverImageUrl && (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            Current:
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={game.coverImageUrl} alt="" className="h-16 w-12 rounded object-cover" />
          </div>
        )}
        <input id="coverImage" name="coverImage" type="file" accept="image/*" className="text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={game.notes ?? ""}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
