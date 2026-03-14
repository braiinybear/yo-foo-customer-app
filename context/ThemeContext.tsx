import React, { createContext, useContext } from "react";
import { useTheme as useThemeHook } from "@/hooks/useTheme";

interface ThemeContextType {
  isDark: boolean;
  themeMode: "light" | "dark" | "system";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDark, themeMode } = useThemeHook();

  return (
    <ThemeContext.Provider value={{ isDark, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
}
