import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light";
function readTheme(): Theme {
  try { return localStorage.getItem("flux.theme") === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}
const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: "dark", toggleTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem("flux.theme", theme); } catch { /* Preference remains usable without storage. */ }
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(value => value === "dark" ? "light" : "dark") }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
