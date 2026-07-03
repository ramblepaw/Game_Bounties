import { NewGameForm } from "./new-game-form";

export default function NewGamePage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-lg font-bold text-violet-950 dark:text-violet-100">Add a game</h1>
      <NewGameForm />
    </div>
  );
}
