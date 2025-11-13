import { useState, useEffect } from "react";
import { toast } from "sonner";
import { availabilityConfigSchema } from "@/lib/validations/availability-config";

/**
 * Configuração retornada pela API
 */
interface AvailabilityConfigResponse {
  id: string;
  dayOfWeek?: number;
  date?: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  capacityPerSlot: number;
  isException: boolean;
  isActive: boolean;
  breakPeriods?: BreakPeriod[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Configuração de um dia da semana
 */
interface DayConfig {
  dayOfWeek: number; // 0 (Domingo) a 6 (Sábado)
  name: string; // "Segunda-feira"
  shortName: string; // "Seg"
  enabled: boolean; // Dia ativo para agendamentos?
  startTime: string; // Horário de início (ex: "09:00")
  endTime: string; // Horário de fim (ex: "18:00")
  slotDurationMinutes: number; // Duração de cada slot em minutos (ex: 30)
  capacityPerSlot: number; // Quantas pessoas por slot (ex: 20)
  breakPeriods: BreakPeriod[]; // Períodos de pausa/indisponibilidade
}

/**
 * Período de pausa dentro de um dia
 * Durante a pausa, os slots não ficam disponíveis para agendamento
 */
interface BreakPeriod {
  id: string; // ID único local (gerado no client)
  startTime: string; // Início da pausa (ex: "12:00")
  endTime: string; // Fim da pausa (ex: "13:00")
}

const WEEKDAYS = [
  { dayOfWeek: 0, name: "Domingo", shortName: "Dom" },
  { dayOfWeek: 1, name: "Segunda-feira", shortName: "Seg" },
  { dayOfWeek: 2, name: "Terça-feira", shortName: "Ter" },
  { dayOfWeek: 3, name: "Quarta-feira", shortName: "Qua" },
  { dayOfWeek: 4, name: "Quinta-feira", shortName: "Qui" },
  { dayOfWeek: 5, name: "Sexta-feira", shortName: "Sex" },
  { dayOfWeek: 6, name: "Sábado", shortName: "Sáb" },
];

/**
 * Hook para gerenciar configuração de horários semanais
 * 
 * Fluxo:
 * 1. Usuário configura dias da semana (checkbox para ativar/desativar)
 * 2. Para cada dia ativo, define horário início/fim, duração do slot e capacidade
 * 3. Pode adicionar períodos de pausa (almoço, intervalos, etc)
 * 4. Salva configuração que gera TimeSlots automaticamente no backend
 */
export function useAvailabilitySchedule() {
  const [weekConfig, setWeekConfig] = useState<DayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daysAhead, setDaysAhead] = useState(30); // Padrão: 30 dias

  useEffect(() => {
    loadWeeklySchedule();
  }, []);

  // Carrega configuração da semana
  const loadWeeklySchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/availability-configs");
      
      if (!response.ok) throw new Error("Erro ao carregar configurações");
      
      const configs = await response.json();

      const weekData: DayConfig[] = WEEKDAYS.map((day) => {
        const config = configs.find(
          (c: AvailabilityConfigResponse) => c.dayOfWeek === day.dayOfWeek && !c.isException
        );

        return {
          dayOfWeek: day.dayOfWeek,
          name: day.name,
          shortName: day.shortName,
          enabled: config?.isActive ?? false,
          startTime: config?.startTime ?? "09:00",
          endTime: config?.endTime ?? "18:00",
          slotDurationMinutes: config?.slotDurationMinutes ?? 30,
          capacityPerSlot: config?.capacityPerSlot ?? 20,
          breakPeriods: config?.breakPeriods ?? [],
        };
      });

      setWeekConfig(weekData);
    } catch (error) {
      console.error("Erro ao carregar configurações:", error);
      toast.error("Erro ao carregar configurações semanais");
    } finally {
      setLoading(false);
    }
  };

  // Salva toda a configuração semanal
  const saveWeeklySchedule = async () => {
    try {
      setSaving(true);

      const payload = weekConfig.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        startTime: day.startTime,
        endTime: day.endTime,
        slotDurationMinutes: day.slotDurationMinutes,
        capacityPerSlot: day.capacityPerSlot,
        breakPeriods: day.breakPeriods,
        isActive: day.enabled,
        isException: false,
      }));

      // Validar todos os payloads
      payload.forEach((p) => availabilityConfigSchema.parse(p));

      const response = await fetch("/api/availability-configs/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          configs: payload,
          daysAhead, // Enviar quantos dias gerar
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar");
      }

      const result = await response.json();
      toast.success(
        `Configurações salvas! ${result.data?.totalSlots || 0} slots gerados para os próximos ${daysAhead} dias.`
      );
      await loadWeeklySchedule(); // Recarrega dados atualizados
      return true;
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Toggle dia ativo/inativo
  const toggleDay = (dayOfWeek: number) => {
    setWeekConfig((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, enabled: !day.enabled }
          : day
      )
    );
  };

  // Atualiza um campo específico do dia (horários, duração, capacidade)
  const updateDayField = (
    dayOfWeek: number,
    field: keyof Omit<DayConfig, 'dayOfWeek' | 'name' | 'shortName' | 'breakPeriods'>,
    value: string | number | boolean
  ) => {
    setWeekConfig((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
      )
    );
  };

  // Adiciona período de pausa
  const addBreakPeriod = (dayOfWeek: number) => {
    setWeekConfig((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breakPeriods: [
                ...day.breakPeriods,
                {
                  id: `break-${Date.now()}`,
                  startTime: "12:00",
                  endTime: "13:00",
                },
              ],
            }
          : day
      )
    );
  };

  // Remove período de pausa
  const removeBreakPeriod = (dayOfWeek: number, breakId: string) => {
    setWeekConfig((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breakPeriods: day.breakPeriods.filter((b) => b.id !== breakId),
            }
          : day
      )
    );
  };

  // Atualiza período de pausa
  const updateBreakPeriod = (
    dayOfWeek: number,
    breakId: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setWeekConfig((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              breakPeriods: day.breakPeriods.map((b) =>
                b.id === breakId ? { ...b, [field]: value } : b
              ),
            }
          : day
      )
    );
  };

  return {
    weekConfig,
    loading,
    saving,
    daysAhead,
    setDaysAhead,
    saveWeeklySchedule,
    toggleDay,
    updateDayField,
    addBreakPeriod,
    removeBreakPeriod,
    updateBreakPeriod,
  };
}