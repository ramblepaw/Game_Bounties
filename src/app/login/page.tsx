import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-violet-600 via-fuchsia-600 to-rose-500 px-4">
      <div className="w-full max-w-sm rounded-xl border border-white/20 bg-white p-6 shadow-xl dark:border-violet-800 dark:bg-neutral-900">
        <h1 className="mb-6 text-xl font-bold text-violet-950 dark:text-violet-100">🎮 Game Bounties</h1>
        <LoginForm />
      </div>
    </main>
  );
}
