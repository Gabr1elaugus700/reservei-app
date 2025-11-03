import { useState, useEffect } from 'react';


interface WeeklyLimit {
  id: number;
  name: string;
  shortName: string;
  dayOfWeek: number;
  limit: number;
  enabled: boolean;
}

interface SpecialDate {
  id: string;
  date: string;
  limit: number;
  description?: string;
}

const WEEKDAYS = [
  { id: 0, name: 'Domingo', shortName: 'Dom', dayOfWeek: 0 },
  { id: 1, name: 'Segunda-feira', shortName: 'Seg', dayOfWeek: 1 },
  { id: 2, name: 'Terça-feira', shortName: 'Ter', dayOfWeek: 2 },
  { id: 3, name: 'Quarta-feira', shortName: 'Qua', dayOfWeek: 3 },
  { id: 4, name: 'Quinta-feira', shortName: 'Qui', dayOfWeek: 4 },
  { id: 5, name: 'Sexta-feira', shortName: 'Sex', dayOfWeek: 5 },
  { id: 6, name: 'Sábado', shortName: 'Sáb', dayOfWeek: 6 },
];

export function useCapacityManagement(isAuthenticated: boolean) {
  const [weeklyLimits, setWeeklyLimits] = useState<WeeklyLimit[]>([]);
  const [specialDates, setSpecialDates] = useState<SpecialDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadConfiguration();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/capacity');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar configurações');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        // Mapear capacidades semanais
        const weeklyData = WEEKDAYS.map((day) => {
          const capacity = result.data.weeklyCapacities.find(
            (wc: { dayOfWeek: number; limit: number; enabled: boolean }) => 
              wc.dayOfWeek === day.dayOfWeek
          );
          return {
            ...day,
            limit: capacity?.limit ?? 30,
            enabled: capacity?.enabled ?? true,
          };
        });
        setWeeklyLimits(weeklyData);

        // Mapear datas especiais
        const specialData = result.data.specialDates.map(
          (sd: { date: string; limit: number; description?: string }, index: number) => ({
            id: `special-${index}`,
            date: sd.date,
            limit: sd.limit,
            description: sd.description,
          })
        );
        setSpecialDates(specialData);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);

      const payload = {
        weeklyCapacities: weeklyLimits.map((day) => ({
          dayOfWeek: day.dayOfWeek,
          limit: day.limit,
          enabled: day.enabled,
        })),
        specialDates: specialDates.map((sd) => ({
          date: sd.date,
          limit: sd.limit,
          description: sd.description,
        })),
      };

      const response = await fetch('/api/capacity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao salvar configurações');
      }

      alert('Configurações salvas com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateWeeklyLimit = (id: number, newLimit: number) => {
    setWeeklyLimits((prev) =>
      prev.map((day) => (day.id === id ? { ...day, limit: newLimit } : day))
    );
  };

  const toggleWeekdayEnabled = (id: number) => {
    setWeeklyLimits((prev) =>
      prev.map((day) => (day.id === id ? { ...day, enabled: !day.enabled } : day))
    );
  };

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

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao adicionar data especial');
      }

      // Adicionar localmente
      const newSpecialDate: SpecialDate = {
        id: `special-${Date.now()}`,
        date,
        limit,
        description,
      };
      setSpecialDates((prev) => [...prev, newSpecialDate]);
      
      alert('Data especial adicionada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao adicionar data especial:', error);
      alert('Erro ao adicionar data especial. Tente novamente.');
      return false;
    }
  };

  const removeSpecialDate = async (date: string) => {
    try {
      const response = await fetch(`/api/capacity/special-dates/${date}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Erro ao remover data especial');
      }

      // Remover localmente
      setSpecialDates((prev) => prev.filter((sd) => sd.date !== date));
      
      return true;
    } catch (error) {
      console.error('Erro ao remover data especial:', error);
      alert('Erro ao remover data especial. Tente novamente.');
      return false;
    }
  };

  const updateSpecialDateLocal = (id: string, field: keyof SpecialDate, value: string | number) => {
    setSpecialDates((prev) =>
      prev.map((sd) => (sd.id === id ? { ...sd, [field]: value } : sd))
    );
  };

  return {
    weeklyLimits,
    specialDates,
    loading,
    saving,
    isAuthenticated,
    saveConfiguration,
    updateWeeklyLimit,
    toggleWeekdayEnabled,
    addSpecialDate,
    removeSpecialDate,
    updateSpecialDateLocal,
  };
}
