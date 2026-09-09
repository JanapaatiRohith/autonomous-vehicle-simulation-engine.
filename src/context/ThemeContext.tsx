import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'light' | 'dark';

export interface ChartThemeColors {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  speed: string;
  ttc: string;
  risk: string;
  distance: string;
  safe: string;
}

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isDark: boolean;
  chartColors: ChartThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'adapt_india_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'dark'; // Default theme
  });

  // Apply data-theme attribute on document root whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore
    }
  }, [theme]);

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const isDark = theme === 'dark';

  const chartColors: ChartThemeColors = isDark
    ? {
        grid: '#1c2638',
        axis: '#94a3b8',
        tooltipBg: '#0d121c',
        tooltipBorder: '#2c3b52',
        tooltipText: '#f1f5f9',
        speed: '#0284c7', // refined blue
        ttc: '#0d9488', // teal
        risk: '#f59e0b', // amber
        distance: '#64748b', // slate
        safe: '#10b981', // emerald
      }
    : {
        grid: '#e2e8f0',
        axis: '#64748b',
        tooltipBg: '#ffffff',
        tooltipBorder: '#cbd5e1',
        tooltipText: '#0f172a',
        speed: '#0284c7',
        ttc: '#0f766e',
        risk: '#d97706',
        distance: '#64748b',
        safe: '#059669',
      };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark, chartColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
