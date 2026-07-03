import Link from "next/link";
import { cookies } from "next/headers";
import { logout } from "@/server/actions/auth";
import { getTokenBalance } from "@/lib/token-ledger";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { MobileNav } from "@/components/layout/mobile-nav";

const NAV_LINKS = [
  { href: "/", label: "Overview" },
  { href: "/games", label: "Games" },
  { href: "/purchases", label: "Purchases" },
  { href: "/approvals", label: "Approvals" },
  { href: "/sessions", label: "Sessions" },
  { href: "/stats", label: "Stats" },
];

export async function NavBar({ displayName }: { displayName: string }) {
  const [balance, cookieStore] = await Promise.all([getTokenBalance(), cookies()]);
  const theme = cookieStore.get("theme")?.value === "light" ? "light" : "dark";

  return (
    <header className="relative bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8 2xl:max-w-[1600px]">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-white drop-shadow-sm">
            🎮 Game Bounties
          </Link>
          <nav className="hidden items-center gap-4 text-sm font-medium text-violet-100 md:flex">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden items-center gap-4 text-sm md:flex">
          <span className="rounded-full bg-amber-400 px-3 py-1 font-bold text-amber-950 shadow-sm">
            🪙 {balance}
          </span>
          <Link href="/profile" className="text-violet-100 transition-colors hover:text-white">
            {displayName}
          </Link>
          <ThemeToggle theme={theme} />
          <form action={logout}>
            <button type="submit" className="text-violet-100 transition-colors hover:text-white">
              Sign out
            </button>
          </form>
        </div>
        <MobileNav links={NAV_LINKS}>
          <span className="w-fit rounded-full bg-amber-400 px-3 py-1 text-sm font-bold text-amber-950 shadow-sm">
            🪙 {balance}
          </span>
          <Link href="/profile" className="py-1 text-sm text-violet-100 hover:text-white">
            {displayName}
          </Link>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-violet-100">Dark mode</span>
            <ThemeToggle theme={theme} />
          </div>
          <form action={logout}>
            <button type="submit" className="py-1 text-left text-sm text-violet-100 hover:text-white">
              Sign out
            </button>
          </form>
        </MobileNav>
      </div>
    </header>
  );
}
