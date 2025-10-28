'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from './use-auth';
import CacheService from '@/app/lib/cache-service';

export interface TenantTheme {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
}

const DEFAULT_THEME: TenantTheme = {
  primary: '#3b82f6',
  primaryForeground: '#ffffff',
  secondary: '#f1f5f9',
  secondaryForeground: '#0f172a',
  accent: '#f1f5f9',
  accentForeground: '#0f172a',
  background: '#ffffff',
  foreground: '#0f172a',
  muted: '#f1f5f9',
  mutedForeground: '#64748b',
  border: '#e2e8f0',
  input: '#e2e8f0',
  ring: '#3b82f6',
  destructive: '#ef4444',
  destructiveForeground: '#ffffff',
  success: '#10b981',
  successForeground: '#ffffff',
  warning: '#f59e0b',
  warningForeground: '#ffffff',
};

export function useTenantTheme() {
  const { user } = useAuth();
  const [theme, setTheme] = useState<TenantTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!user;
  const tenantId = user?.tenantId || '';
  const tenantSlug = user?.tenant?.slug || '';

  // Aplicar tema ao CSS
  const applyTheme = (themeData: TenantTheme) => {
    const root = document.documentElement;
    
    // Converter hex para oklch se necessário ou aplicar diretamente
    Object.entries(themeData).forEach(([key, value]) => {
      const cssVarName = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVarName, value);
    });

    setTheme(themeData);
  };

  // Carregar tema do cache ou servidor
  const loadTheme = useCallback(async () => {
    if (!isAuthenticated || !tenantId || !tenantSlug) {
      applyTheme(DEFAULT_THEME);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Tentar carregar do cache primeiro
      const cachedTheme = CacheService.getCache<TenantTheme>(
        CacheService.KEYS.THEME,
        tenantId
      );

      if (cachedTheme) {
        console.log('🎨 Carregando tema do cache para tenant:', tenantSlug);
        applyTheme(cachedTheme);
        setLoading(false);
        return;
      }

      // Se não há cache, buscar no servidor
      console.log('🌐 Carregando tema do servidor para tenant:', tenantSlug);
      const response = await fetch(`/api/tenants/${tenantSlug}/theme`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.theme) {
          const tenantTheme = { ...DEFAULT_THEME, ...result.theme };
          
          // Salvar no cache por 1 hora
          CacheService.setCache(
            CacheService.KEYS.THEME,
            tenantTheme,
            tenantId,
            60 * 60 * 1000 // 1 hora
          );

          applyTheme(tenantTheme);
        } else {
          console.warn('Tema não encontrado, usando padrão');
          applyTheme(DEFAULT_THEME);
        }
      } else {
        console.warn('Erro ao carregar tema, usando padrão');
        applyTheme(DEFAULT_THEME);
      }
    } catch (error) {
      console.error('Erro ao carregar tema:', error);
      applyTheme(DEFAULT_THEME);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, tenantId, tenantSlug]);

  // Atualizar tema quando usuário mudar
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // Limpar cache do tema quando usuário fizer logout
  useEffect(() => {
    if (!user && tenantId) {
      CacheService.removeCache(CacheService.KEYS.THEME, tenantId);
      applyTheme(DEFAULT_THEME);
    }
  }, [user, tenantId]);

  // Forçar recarregamento do tema
  const refreshTheme = async () => {
    if (tenantId) {
      CacheService.removeCache(CacheService.KEYS.THEME, tenantId);
    }
    await loadTheme();
  };

  return {
    theme,
    loading,
    isAuthenticated,
    tenantSlug,
    loadTheme,
    refreshTheme,
    applyTheme,
  };
}

export default useTenantTheme;