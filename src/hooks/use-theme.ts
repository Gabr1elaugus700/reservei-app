'use client';

import { useEffect, useState } from 'react';
import { TenantTheme, getTenantTheme, applyTenantTheme, defaultThemes } from '../lib/theme-manager';

interface UseThemeOptions {
  tenantSlug?: string;
  customTheme?: Partial<TenantTheme>;
  storageKey?: string;
}

export function useTheme({ 
  tenantSlug = 'default', 
  customTheme,
  storageKey = 'tenant-theme' 
}: UseThemeOptions = {}) {
  const [currentTheme, setCurrentTheme] = useState<TenantTheme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadTheme = () => {
      try {
        // Tentar carregar tema personalizado do localStorage
        const stored = localStorage.getItem(`${storageKey}-${tenantSlug}`);
        let theme: TenantTheme;

        if (stored && customTheme) {
          const parsedStored = JSON.parse(stored);
          theme = getTenantTheme(tenantSlug, { ...parsedStored, ...customTheme });
        } else if (customTheme) {
          theme = getTenantTheme(tenantSlug, customTheme);
        } else if (stored) {
          const parsedStored = JSON.parse(stored);
          theme = getTenantTheme(tenantSlug, parsedStored);
        } else {
          theme = getTenantTheme(tenantSlug);
        }

        setCurrentTheme(theme);
        applyTenantTheme(theme);
        setIsLoading(false);
      } catch (error) {
        console.error('Erro ao carregar tema:', error);
        const fallbackTheme = getTenantTheme('default');
        setCurrentTheme(fallbackTheme);
        applyTenantTheme(fallbackTheme);
        setIsLoading(false);
      }
    };

    loadTheme();
  }, [tenantSlug, customTheme, storageKey]);

  const updateTheme = async (newTheme: Partial<TenantTheme>) => {
    if (!currentTheme) return;

    const updatedTheme = { ...currentTheme, ...newTheme };
    setCurrentTheme(updatedTheme);
    applyTenantTheme(updatedTheme);

    // Salvar no localStorage
    try {
      localStorage.setItem(
        `${storageKey}-${tenantSlug}`, 
        JSON.stringify(newTheme)
      );
    } catch (error) {
      console.error('Erro ao salvar tema no localStorage:', error);
    }

    // Tentar salvar no banco de dados também
    try {
      const response = await fetch(`/api/tenants/${tenantSlug}/theme`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ theme: updatedTheme }),
      });

      if (!response.ok) {
        console.warn('Não foi possível salvar tema no servidor:', response.statusText);
      }
    } catch (error) {
      console.warn('Erro ao salvar tema no servidor:', error);
    }
  };

  const resetTheme = () => {
    const defaultTheme = getTenantTheme(tenantSlug);
    setCurrentTheme(defaultTheme);
    applyTenantTheme(defaultTheme);

    try {
      localStorage.removeItem(`${storageKey}-${tenantSlug}`);
    } catch (error) {
      console.error('Erro ao remover tema:', error);
    }
  };

  const switchPresetTheme = async (presetName: keyof typeof defaultThemes) => {
    const newTheme = defaultThemes[presetName];
    if (newTheme) {
      setCurrentTheme(newTheme);
      applyTenantTheme(newTheme);
      
      try {
        localStorage.setItem(
          `${storageKey}-${tenantSlug}`, 
          JSON.stringify(newTheme)
        );
      } catch (error) {
        console.error('Erro ao salvar tema no localStorage:', error);
      }

      // Salvar no banco de dados também
      try {
        const response = await fetch(`/api/tenants/${tenantSlug}/theme`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: newTheme }),
        });

        if (!response.ok) {
          console.warn('Não foi possível salvar tema no servidor:', response.statusText);
        }
      } catch (error) {
        console.warn('Erro ao salvar tema no servidor:', error);
      }
    }
  };

  return {
    theme: currentTheme,
    isLoading,
    updateTheme,
    resetTheme,
    switchPresetTheme,
    availablePresets: Object.keys(defaultThemes) as (keyof typeof defaultThemes)[]
  };
}