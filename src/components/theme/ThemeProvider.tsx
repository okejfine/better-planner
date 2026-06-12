"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "clang" | "alex";

const THEMES: Theme[] = ["light", "dark", "clang", "alex"];
const STORAGE_KEY = "bp-theme";

interface ThemeContextValue {
  theme: Theme;
  cycle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  cycle: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // On mount, read the value that the anti-flash script already applied to <html>
    const stored = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "light";
    const validated: Theme = THEMES.includes(stored) ? stored : "light";
    setTheme(validated);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  function cycle() {
    setTheme((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, cycle }}>
      {children}
    </ThemeContext.Provider>
  );
}
