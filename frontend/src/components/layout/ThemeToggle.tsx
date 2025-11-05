import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

const THEME_KEY = "theme"; // 'light' | 'dark' | 'system'

function getSystemPrefersDark() {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: "light" | "dark" | "system") {
  const root = document.documentElement;
  const resolved = theme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : theme;
  root.classList.toggle("dark", resolved === "dark");
}

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark" | "system">(() => {
    const saved = localStorage.getItem(THEME_KEY) as "light" | "dark" | "system" | null;
    return saved ?? "system";
  });

  useEffect(() => {
    applyTheme(mode);
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  // Keep in sync with system changes when in 'system'
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, [mode]);

  const cycle = () => {
    setMode((prev) => (prev === "system" ? "light" : prev === "light" ? "dark" : "system"));
  };

  const label = mode === "system" ? "System" : mode === "dark" ? "Dark" : "Light";
  const Icon = mode === "dark" ? Moon : Sun;

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={cycle} title={`Theme: ${label}`}>
        <Icon className="h-5 w-5" />
      </Button>
      <span className="hidden sm:inline text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
