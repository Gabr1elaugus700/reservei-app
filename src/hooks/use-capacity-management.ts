import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from './use-auth';
import CacheService, { CapacityCacheData } from '@/app/lib/cache-service';

export interface WeekdayConfig {
  id: number;
  name: string;
  shortName: string;
  limit: number;
  enabled: boolean;
}

export interface SpecialDateConfig {
  id: string;
  date: string;
  limit: number;
  description?: string;
}

export interface CapacityData {
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

export function useCapacityManagement() {
  const { user } = useAuth();
  const [weeklyLimits, setWeeklyLimits] = useState<WeekdayConfig[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Verificar se o usuário está autenticado
  const isAuthenticated = !!user;
  const tenantId = user?.tenantId || '';

  // Mapear dados do backend para o formato do frontend
  const mapBackendToFrontend = (data: CapacityData) => {
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const shortNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

    const mappedWeekly = data.weeklyCapacities.map(wc => ({
      id: wc.dayOfWeek,
      name: dayNames[wc.dayOfWeek],
      shortName: shortNames[wc.dayOfWeek],
      limit: wc.limit,
      enabled: wc.enabled
    }));

    const mappedSpecial = data.specialDates.map((sd, index) => ({
      id: `${sd.date}-${index}`,
      date: sd.date,
      limit: sd.limit,
      description: sd.description
    }));

    return { weeklyLimits: mappedWeekly, specialDates: mappedSpecial };
  };

  // Mapear dados do frontend para o formato do backend
  const mapFrontendToBackend = (): CapacityData => {
    const weeklyCapacities = weeklyLimits.map(wl => ({
      dayOfWeek: wl.id,
      limit: wl.limit,
      enabled: wl.enabled
    }));

    const specialDatesData = specialDates.map(sd => ({
      date: sd.date,
      limit: sd.limit,
      description: sd.description
    }));

    return {
      weeklyCapacities,
      specialDates: specialDatesData
    };
  };

  // Carregar configurações do cache ou backend
  const loadConfiguration = useCallback(async () => {
    if (!isAuthenticated || !tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Tentar carregar do cache primeiro
      const cachedData = CacheService.getCache<CapacityData>(
        CacheService.KEYS.CAPACITY, 
        tenantId
      );

      if (cachedData) {
        console.log('📦 Carregando configurações do cache');
        const { weeklyLimits: wl, specialDates: sd } = mapBackendToFrontend(cachedData);
        setWeeklyLimits(wl);
        setSpecialDates(sd);
        setLoading(false);
        return;
      }

      // Se não há cache, buscar no backend
      console.log('🌐 Carregando configurações do servidor');
      const response = await fetch('/api/capacity', {
        credentials: 'include',
      });
      
      const result = await response.json();

      if (result.success) {
        const { weeklyLimits: wl, specialDates: sd } = mapBackendToFrontend(result.data);
        setWeeklyLimits(wl);
        setSpecialDates(sd);

        // Salvar no cache por 30 minutos
        CacheService.setCache(
          CacheService.KEYS.CAPACITY, 
          result.data, 
          tenantId,
          30 * 60 * 1000 // 30 minutos
        );
      } else {
        toast.error('Erro ao carregar configurações');
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      toast.error('Erro ao conectar com o servidor');
      
      // Usar dados padrão em caso de erro
      setWeeklyLimits([
        { id: 0, name: 'Domingo', shortName: 'Dom', limit: 20, enabled: true },
        { id: 1, name: 'Segunda-feira', shortName: 'Seg', limit: 30, enabled: true },
        { id: 2, name: 'Terça-feira', shortName: 'Ter', limit: 30, enabled: true },
        { id: 3, name: 'Quarta-feira', shortName: 'Qua', limit: 30, enabled: true },
        { id: 4, name: 'Quinta-feira', shortName: 'Qui', limit: 30, enabled: true },
        { id: 5, name: 'Sexta-feira', shortName: 'Sex', limit: 35, enabled: true },
        { id: 6, name: 'Sábado', shortName: 'Sab', limit: 40, enabled: true }
      ]);
      setSpecialDates([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, tenantId]);

  // Salvar configurações no backend e atualizar cache
  const saveConfiguration = async () => {
    if (!isAuthenticated || !tenantId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      setSaving(true);
      const data = mapFrontendToBackend();
      
      const response = await fetch('/api/capacity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar cache com dados mais recentes
        CacheService.setCache(
          CacheService.KEYS.CAPACITY, 
          data, 
          tenantId,
          30 * 60 * 1000 // 30 minutos
        );
        
        toast.success('Configurações salvas com sucesso');
        return true;
      } else {
        toast.error(result.error || 'Erro ao salvar configurações');
        return false;
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao conectar com o servidor');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Adicionar data especial
  const addSpecialDate = async (date: string, limit: number, description?: string) => {
    if (!isAuthenticated || !tenantId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const response = await fetch('/api/capacity/special-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ date, limit, description }),
      });

      const result = await response.json();

      if (result.success) {
        // Invalidar cache e recarregar
        CacheService.removeCache(CacheService.KEYS.CAPACITY, tenantId);
        await loadConfiguration();
        return true;
      } else {
        toast.error(result.error || 'Erro ao adicionar data especial');
        return false;
      }
    } catch (error) {
      console.error('Erro ao adicionar data especial:', error);
      toast.error('Erro ao conectar com o servidor');
      return false;
    }
  };

  // Remover data especial
  const removeSpecialDate = async (date: string) => {
    if (!isAuthenticated || !tenantId) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const response = await fetch(`/api/capacity/special-dates/${date}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar estado local e invalidar cache
        setSpecialDates(prev => prev.filter(sd => sd.date !== date));
        CacheService.removeCache(CacheService.KEYS.CAPACITY, tenantId);
        toast.success('Data especial removida');
        return true;
      } else {
        toast.error(result.error || 'Erro ao remover data especial');
        return false;
      }
    } catch (error) {
      console.error('Erro ao remover data especial:', error);
      toast.error('Erro ao conectar com o servidor');
      return false;
    }
  };

  // Verificar capacidade para uma data
  const checkCapacityForDate = async (date: string) => {
    if (!isAuthenticated || !tenantId) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      const response = await fetch(`/api/capacity/check/${date}`, {
        credentials: 'include',
      });
      const result = await response.json();

      if (result.success) {
        return result.data;
      } else {
        toast.error(result.error || 'Erro ao verificar capacidade');
        return null;
      }
    } catch (error) {
      console.error('Erro ao verificar capacidade:', error);
      toast.error('Erro ao conectar com o servidor');
      return null;
    }
  };

  // Funções para gerenciar limites semanais localmente
  const updateWeeklyLimit = (dayId: number, newLimit: number) => {
    setWeeklyLimits(prev => 
      prev.map(day => 
        day.id === dayId ? { ...day, limit: Math.max(0, newLimit) } : day
      )
    );
    
    // Invalidar cache para forçar sincronização
    if (tenantId) {
      CacheService.removeCache(CacheService.KEYS.CAPACITY, tenantId);
    }
  };

  const toggleWeekdayEnabled = (dayId: number) => {
    setWeeklyLimits(prev => 
      prev.map(day => 
        day.id === dayId ? { ...day, enabled: !day.enabled } : day
      )
    );
    
    // Invalidar cache para forçar sincronização
    if (tenantId) {
      CacheService.removeCache(CacheService.KEYS.CAPACITY, tenantId);
    }
  };

  // Funções para gerenciar datas especiais localmente
  const updateSpecialDateLocal = (id: string, field: keyof SpecialDateConfig, value: string | number) => {
    setSpecialDates(prev => 
      prev.map(date => 
        date.id === id ? { ...date, [field]: value } : date
      )
    );
    
    // Invalidar cache para forçar sincronização
    if (tenantId) {
      CacheService.removeCache(CacheService.KEYS.CAPACITY, tenantId);
    }
  };

  // Carregar configurações quando usuário mudar ou componente montar
  useEffect(() => {
    if (user) {
      loadConfiguration();
    } else {
      setLoading(false);
      setWeeklyLimits([]);
      setSpecialDates([]);
    }
  }, [user, loadConfiguration]);

  // Limpar cache quando usuário fizer logout
  useEffect(() => {
    if (!user && tenantId) {
      CacheService.clearTenantCache(tenantId);
    }
  }, [user, tenantId]);

  return {
    // Estados
    weeklyLimits,
    specialDates,
    loading,
    saving,
    isAuthenticated,
    tenantId,
    user,

    // Funções de carregamento/salvamento
    loadConfiguration,
    saveConfiguration,

    // Funções para limites semanais
    updateWeeklyLimit,
    toggleWeekdayEnabled,

    // Funções para datas especiais
    addSpecialDate,
    removeSpecialDate,
    updateSpecialDateLocal,

    // Utilitários
    checkCapacityForDate,
  };
}