"use client";

import { useTheme, type Theme } from "./ThemeProvider";

const THEME_META: Record<
  Theme,
  { label: string; icon: string; title: string }
> = {
  light: { label: "Light", icon: "☀️", title: "Light mode — click for Dark" },
  dark:  { label: "Dark",  icon: "🌙", title: "Dark mode — click for Clang" },
  clang: { label: "Clang", icon: "🌹", title: "Clang mode — click for Alex" },
  alex:  { label: "Alex",  icon: "✦",  title: "Alex mode — click for Light" },
};

export function ThemeToggle() {
  const { theme, cycle } = useTheme();
  const meta = THEME_META[theme];

  return (
    <button
      type="button"
      onClick={cycle}
      title={meta.title}
      aria-label={meta.title}
      className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition select-none"
    >
      <span aria-hidden className="text-sm leading-none">{meta.icon}</span>
      <span className="hidden sm:inline">{meta.label}</span>
    </button>
  );
}
