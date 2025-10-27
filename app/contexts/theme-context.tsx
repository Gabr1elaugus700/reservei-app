'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useTheme } from '../hooks/use-theme';
import { TenantTheme, defaultThemes } from '../lib/theme-manager';

interface ThemeContextType {
  theme: TenantTheme | null;
  isLoading: boolean;
  updateTheme: (newTheme: Partial<TenantTheme>) => void;
  resetTheme: () => void;
  switchPresetTheme: (presetName: keyof typeof defaultThemes) => void;
  availablePresets: (keyof typeof defaultThemes)[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  tenantSlug?: string;
  customTheme?: Partial<TenantTheme>;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  tenantSlug = 'default',
  customTheme,
  storageKey = 'tenant-theme'
}: ThemeProviderProps) {
  const themeData = useTheme({ tenantSlug, customTheme, storageKey });

  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext deve ser usado dentro de um ThemeProvider');
  }
  return context;
}