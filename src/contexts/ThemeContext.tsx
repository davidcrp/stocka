import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "light" | "dark";

type ThemeColors = {
  primary: string;
  accent: string;
};

type ThemeContextType = {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  setColors: (colors: ThemeColors) => void;
  toggleMode: () => void;
};

const defaultColors: ThemeColors = { primary: "142 71% 45%", accent: "38 92% 50%" };

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  colors: defaultColors,
  setMode: () => {},
  setColors: () => {},
  toggleMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function applyColors(colors: ThemeColors) {
  const root = document.documentElement;
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--ring", colors.primary);
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-ring", colors.primary);
  root.style.setProperty("--accent", colors.accent);
}

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("dp-theme-mode");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  const [colors, setColorsState] = useState<ThemeColors>(() => {
    try {
      const saved = localStorage.getItem("dp-theme-colors");
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultColors;
  });

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem("dp-theme-mode", m);
  };

  const toggleMode = () => setMode(mode === "dark" ? "light" : "dark");

  const setColors = (c: ThemeColors) => {
    setColorsState(c);
    localStorage.setItem("dp-theme-colors", JSON.stringify(c));
    applyColors(c);
  };

  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
  }, [mode]);

  useEffect(() => {
    applyColors(colors);
  }, [colors]);

  return (
    <ThemeContext.Provider value={{ mode, colors, setMode, setColors, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
