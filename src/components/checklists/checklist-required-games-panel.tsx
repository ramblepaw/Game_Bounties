interface RequiredGame {
  id: string;
  title: string;
  url: string | null;
}

/** Read-only display of the games needed to run a checklist -- editing happens in the designer. */
export function ChecklistRequiredGamesPanel({ requiredGames }: { requiredGames: RequiredGame[] }) {
  if (requiredGames.length === 0) {
    return <p className="text-sm text-neutral-500">No games listed yet — add some in the editor.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {requiredGames.map((game) => (
        <li
          key={game.id}
          className="rounded-lg border border-neutral-200 px-4 py-3 text-sm dark:border-neutral-700"
        >
          {game.url ? (
            <a
              href={game.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-700 hover:underline dark:text-violet-400"
            >
              {game.title} ↗
            </a>
          ) : (
            <span className="font-medium text-neutral-900 dark:text-violet-100">{game.title}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
