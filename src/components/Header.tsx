import Link from "next/link";
import { format } from "date-fns";
import { initials } from "@/lib/utils";
import { fromIso } from "@/lib/dates";
import type { Profile } from "@/lib/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { HelpButton } from "@/components/HelpButton";

export function Header({
  me,
  finalDate,
}: {
  me: Profile;
  finalDate?: string | null;
}) {
  return (
    <header className="border-b border-stone-200 bg-white/70 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="font-serif text-lg sm:text-2xl tracking-tight text-stone-900 truncate hover:opacity-80 transition"
            >
              Better Planner
            </Link>
            {finalDate ? (
              <span className="hidden sm:inline text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                💍 {format(fromIso(finalDate), "MMM d")}
              </span>
            ) : (
              <span className="hidden sm:inline text-xs uppercase tracking-widest text-stone-400">
                Jul – Oct 2026
              </span>
            )}
          </div>
          <Link
            href="/wedding-events"
            className="hidden sm:inline-flex items-center text-xs text-stone-500 hover:text-stone-900 transition font-medium"
          >
            Wedding Events
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <HelpButton />
          <ThemeToggle />
          <div className="text-right hidden md:block">
            <div className="text-xs text-stone-500">Signed in as</div>
            <div className="text-sm font-medium text-stone-900">
              {me.display_name}
            </div>
          </div>
          <div
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-medium"
            style={{ backgroundColor: me.avatar_color }}
            aria-label={me.display_name}
            title={me.display_name}
          >
            {initials(me.display_name)}
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-xs text-stone-500 hover:text-stone-900 transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
