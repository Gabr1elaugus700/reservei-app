/**
 * Serviço de cache para armazenamento local no navegador
 * Gerencia configurações de capacidade, temas e dados do usuário
 */

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface CapacityCacheData {
  weeklyCapacities: Array<{
    dayOfWeek: number;
    limit: number;
    enabled: boolean;
  }>;
  specialDates: Array<{
    date: string;
    limit: number;
    description?: string;
  }>;
}

export interface ThemeCacheData {
  [key: string]: string | number | boolean;
}

class CacheService {
  private static readonly CACHE_PREFIX = 'app-reservei:';
  private static readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutos

  // Chaves de cache
  static readonly KEYS = {
    CAPACITY: 'capacity',
    THEME: 'theme',
    USER_PREFERENCES: 'user-preferences',
  } as const;

  private static getKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Armazena dados no cache com TTL
   */
  static setCache<T>(
    key: string, 
    data: T, 
    ttl: number = this.DEFAULT_TTL
  ): void {
    try {
      const cacheKey = this.getKey(key);
      const cacheItem: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + ttl,
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheItem));
    } catch (error) {
      console.warn('Erro ao salvar no cache:', error);
    }
  }

  /**
   * Recupera dados do cache se ainda válidos
   */
  static getCache<T>(key: string): T | null {
    try {
      const cacheKey = this.getKey(key);
      const cached = localStorage.getItem(cacheKey);
      
      if (!cached) return null;

      const cacheItem: CacheItem<T> = JSON.parse(cached);
      
      // Verificar se expirou
      if (Date.now() > cacheItem.expiry) {
        this.removeCache(key);
        return null;
      }

      return cacheItem.data;
    } catch (error) {
      console.warn('Erro ao ler cache:', error);
      return null;
    }
  }

  /**
   * Remove item específico do cache
   */
  static removeCache(key: string): void {
    try {
      const cacheKey = this.getKey(key);
      localStorage.removeItem(cacheKey);
    } catch (error) {
      console.warn('Erro ao remover cache:', error);
    }
  }

  /**
   * Limpa todo o cache do tenant
   */
  // clearTenantCache removido (aplicação single-tenant)

  /**
   * Limpa todo o cache da aplicação
   */
  static clearAllCache(): void {
    try {
      const keysToRemove: string[] = [];

      // Encontrar todas as chaves da aplicação
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }

      // Remover as chaves encontradas
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Erro ao limpar todo o cache:', error);
    }
  }

  /**
   * Verifica se existe cache válido para uma chave
   */
  static hasValidCache(key: string): boolean {
    return this.getCache(key) !== null;
  }

  /**
   * Obtém informações sobre o cache (para debugging)
   */
  static getCacheInfo(): {
    keys: string[];
    totalSize: number;
    items: Array<{
      key: string;
      size: number;
      timestamp: number;
      expiry: number;
      isExpired: boolean;
    }>;
  } {
    const info = {
      keys: [] as string[],
      totalSize: 0,
      items: [] as Array<{
        key: string;
        size: number;
        timestamp: number;
        expiry: number;
        isExpired: boolean;
      }>,
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.CACHE_PREFIX)) {
          const value = localStorage.getItem(key) || '';
          const size = new Blob([value]).size;
          
          try {
            const cacheItem = JSON.parse(value);
            const isExpired = Date.now() > cacheItem.expiry;
            
            info.keys.push(key);
            info.totalSize += size;
            info.items.push({
              key: key.replace(this.CACHE_PREFIX, ''),
              size,
              timestamp: cacheItem.timestamp,
              expiry: cacheItem.expiry,
              isExpired,
            });
          } catch {
            // Item não é um cache válido, ignorar
          }
        }
      }
    } catch (error) {
      console.warn('Erro ao obter informações do cache:', error);
    }

    return info;
  }

  /**
   * Limpa cache expirado automaticamente
   */
  static cleanExpiredCache(): number {
    let cleaned = 0;

    try {
      const prefix = this.CACHE_PREFIX;

      const keysToRemove: string[] = [];

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const cacheItem = JSON.parse(value);
              if (Date.now() > cacheItem.expiry) {
                keysToRemove.push(key);
              }
            }
          } catch {
            // Item corrompido, remover também
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        cleaned++;
      });
    } catch (error) {
      console.warn('Erro ao limpar cache expirado:', error);
    }

    return cleaned;
  }
}

// Hooks para usar o cache
export function useCache() {
  return {
    setCache: CacheService.setCache,
    getCache: CacheService.getCache,
    removeCache: CacheService.removeCache,
    clearAllCache: CacheService.clearAllCache,
    hasValidCache: CacheService.hasValidCache,
    getCacheInfo: CacheService.getCacheInfo,
    cleanExpiredCache: CacheService.cleanExpiredCache,
    KEYS: CacheService.KEYS,
  };
}

export default CacheService;
