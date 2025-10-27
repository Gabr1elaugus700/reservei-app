import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

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
  const [weeklyLimits, setWeeklyLimits] = useState<WeekdayConfig[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Carregar configurações do backend
  const loadConfiguration = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/capacity');
      const result = await response.json();

      if (result.success) {
        const { weeklyLimits: wl, specialDates: sd } = mapBackendToFrontend(result.data);
        setWeeklyLimits(wl);
        setSpecialDates(sd);
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
  }, []);

  // Salvar configurações no backend
  const saveConfiguration = async () => {
    try {
      setSaving(true);
      const data = mapFrontendToBackend();
      
      const response = await fetch('/api/capacity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
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
    try {
      const response = await fetch('/api/capacity/special-dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, limit, description }),
      });

      const result = await response.json();

      if (result.success) {
        // Recarregar configurações
        await loadConfiguration();
        toast.success('Data especial adicionada com sucesso');
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
    try {
      const response = await fetch(`/api/capacity/special-dates/${date}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Atualizar estado local
        setSpecialDates(prev => prev.filter(sd => sd.date !== date));
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
    try {
      const response = await fetch(`/api/capacity/check/${date}`);
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

  // Funções para gerenciar limites semanais
  const updateWeeklyLimit = (dayId: number, newLimit: number) => {
    setWeeklyLimits(prev => 
      prev.map(day => 
        day.id === dayId ? { ...day, limit: Math.max(0, newLimit) } : day
      )
    );
  };

  const toggleWeekdayEnabled = (dayId: number) => {
    setWeeklyLimits(prev => 
      prev.map(day => 
        day.id === dayId ? { ...day, enabled: !day.enabled } : day
      )
    );
  };

  // Funções para gerenciar datas especiais localmente
  const updateSpecialDateLocal = (id: string, field: keyof SpecialDateConfig, value: string | number) => {
    setSpecialDates(prev => 
      prev.map(date => 
        date.id === id ? { ...date, [field]: value } : date
      )
    );
  };

  // Carregar configurações ao montar o componente
  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  return {
    // Estados
    weeklyLimits,
    specialDates,
    loading,
    saving,

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