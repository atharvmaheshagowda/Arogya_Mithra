import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";
interface ThemeContextValue { theme: Theme; setTheme: (theme: Theme) => void; toggleTheme: () => void; }
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("aarogya-mithra-theme") ?? localStorage.getItem("colossus-theme");
  if (stored === "light" || stored === "dark") return stored;
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("aarogya-mithra-theme", theme);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme((current) => current === "light" ? "dark" : "light") }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error("useTheme must be used within ThemeProvider"); return context; }
export function ThemeSwitcher({ className }: { className?: string }) { const { theme, toggleTheme } = useTheme(); return <Button aria-label="Switch colour theme" title="Switch colour theme" variant="ghost" size="icon" className={className} onClick={toggleTheme}>{theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>; }
