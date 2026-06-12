import { initials } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Header({ me }: { me: Profile }) {
  return (
    <header className="border-b border-stone-200 bg-white/70 backdrop-blur sticky top-0 z-30">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-baseline gap-2 sm:gap-3 min-w-0">
          <h1 className="font-serif text-lg sm:text-2xl tracking-tight text-stone-900 truncate">
            Better Planner
          </h1>
          <span className="hidden sm:inline text-xs uppercase tracking-widest text-stone-400">
            Jul – Oct 2026
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
