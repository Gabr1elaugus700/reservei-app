"use client";
import {
  Plus,
  Trash2,
  Settings,
  Loader2,
  Coffee,
  Edit,
  Calendar as CalendarIcon,
  Search,
  Users,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAvailabilitySchedule } from "@/hooks/use-capacity-management";
import { useState } from "react";
import { toast } from "sonner";

// Interfaces de tipagem
interface AvailabilityConfig {
  id: string;
  date: string | null;
  dayOfWeek: number | null;
  isException: boolean;
  isActive: boolean;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  capacityPerSlot: number;
}

interface SpecificDateFormData {
  capacityPerSlot: number;
  slotDurationMinutes: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface DateStats {
  totalBookings: number;
  totalPeople: number;
  totalCapacity: number;
  availableSlots: number;
}

interface Booking {
  id: string;
  adults: number;
  children: number;
  date: string;
  time: string;
}

export default function CapacityPage() {
  const {
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
  } = useAvailabilitySchedule();

  // Estado para edição de dia específico
  const [editingSpecificDate, setEditingSpecificDate] = useState(false);
  const [specificDate, setSpecificDate] = useState("");
  const [specificDateConfig, setSpecificDateConfig] =
    useState<AvailabilityConfig | null>(null);
  const [loadingSpecific, setLoadingSpecific] = useState(false);
  const [savingSpecific, setSavingSpecific] = useState(false);
  const [configExists, setConfigExists] = useState(false);
  const [dateStats, setDateStats] = useState<DateStats | null>(null);
  const [specificFormData, setSpecificFormData] =
    useState<SpecificDateFormData>({
      capacityPerSlot: 1,
      slotDurationMinutes: 30,
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    });

  // Calcular capacidade total e slots disponíveis
  const calculateCapacityStats = (formData: SpecificDateFormData) => {
    const start = formData.startTime.split(":");
    const end = formData.endTime.split(":");
    const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
    const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
    const totalMinutes = endMinutes - startMinutes;
    const availableSlots = Math.floor(
      totalMinutes / formData.slotDurationMinutes
    );
    const totalCapacity = availableSlots * formData.capacityPerSlot;

    return { availableSlots, totalCapacity };
  };

  // Buscar configuração de uma data específica
  const searchSpecificDate = async () => {
    if (!specificDate) {
      toast.error("Selecione uma data");
      return;
    }

    setLoadingSpecific(true);
    try {
      // Buscar TODAS as configurações e filtrar no frontend
      const configResponse = await fetch(`/api/availability-configs`);

      if (!configResponse.ok) {
        throw new Error("Erro ao buscar configurações");
      }

      const allConfigs: AvailabilityConfig[] = await configResponse.json();

      console.log(`[searchSpecificDate] Buscando config para data: ${specificDate}`);
      console.log(`[searchSpecificDate] Total de configs no backend: ${allConfigs.length}`);

      // Filtrar por data específica - comparar strings direto
      // Backend retorna date sempre como "YYYY-MM-DD" (sem timezone)
      const configsForDate = allConfigs.filter((config) => {
        if (!config.date) return false;
        // API já retorna date como string "YYYY-MM-DD"
        const configDate = typeof config.date === 'string' 
          ? config.date.split('T')[0]  // Se vier como ISO string (fallback)
          : config.date;                // Se vier como string direta
        const match = configDate === specificDate;
        if (match) {
          console.log(`[searchSpecificDate] ✓ Config encontrada: ID=${config.id}, Date=${configDate}`);
        }
        return match;
      });

      console.log(`[searchSpecificDate] Configs encontradas para ${specificDate}: ${configsForDate.length}`);

      let config: AvailabilityConfig | null = null;
      let formData: SpecificDateFormData = {
        capacityPerSlot: 1,
        slotDurationMinutes: 30,
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      };

      if (configsForDate.length > 0) {
        // Configuração existe
        config = configsForDate[0];
        formData = {
          capacityPerSlot: config.capacityPerSlot,
          slotDurationMinutes: config.slotDurationMinutes,
          startTime: config.startTime,
          endTime: config.endTime,
          isActive: config.isActive ?? true,
        };
        setConfigExists(true);
        toast.success("Configuração encontrada!");
      } else {
        // Não existe configuração
        setConfigExists(false);
        setEditingSpecificDate(true);
        setSpecificDateConfig(null);
        setSpecificFormData(formData);
        setLoadingSpecific(false);
        return; // Não buscar bookings ainda
      }

      setSpecificDateConfig(config);
      setSpecificFormData(formData);

      // Buscar agendamentos do dia
      const bookingsResponse = await fetch(
        `/api/bookings?date=${specificDate}`
      );
      const bookingsResult = await bookingsResponse.json();

      let totalPeople = 0;
      let totalBookings = 0;

      if (bookingsResponse.ok && bookingsResult.success) {
        const bookingsData: Booking[] = bookingsResult.data;
        totalBookings = bookingsData.length;
        totalPeople = bookingsData.reduce(
          (sum: number, booking) => sum + (booking.adults || 0),
          0
        );
      }

      // Calcular capacidade
      const { availableSlots, totalCapacity } =
        calculateCapacityStats(formData);

      setDateStats({
        totalBookings,
        totalPeople,
        totalCapacity,
        availableSlots,
      });

      setEditingSpecificDate(true);
    } catch (error) {
      console.error("Erro ao buscar configuração:", error);
      toast.error("Erro ao buscar configuração da data");
    } finally {
      setLoadingSpecific(false);
    }
  };

  // Atualizar stats quando formData mudar
  const updateFormData = (newData: SpecificDateFormData) => {
    setSpecificFormData(newData);
    if (dateStats) {
      const { availableSlots, totalCapacity } = calculateCapacityStats(newData);
      setDateStats({
        ...dateStats,
        availableSlots,
        totalCapacity,
      });
    }
  };

  // Salvar alterações de data específica
  const saveSpecificDateConfig = async () => {
    if (!specificDate) {
      toast.error("Selecione uma data");
      return;
    }

    setSavingSpecific(true);
    try {
      const payload = {
        date: specificDate,
        isException: true,
        isActive: specificFormData.isActive,
        startTime: specificFormData.startTime,
        endTime: specificFormData.endTime,
        slotDurationMinutes: specificFormData.slotDurationMinutes,
        capacityPerSlot: specificFormData.capacityPerSlot,
      };

      console.log(`[saveSpecificDateConfig] Config ID: ${specificDateConfig?.id || 'NULL'}`);
      console.log(`[saveSpecificDateConfig] Operação: ${specificDateConfig?.id ? 'UPDATE' : 'CREATE'}`);
      console.log(`[saveSpecificDateConfig] Payload:`, payload);

      let response;
      if (specificDateConfig?.id) {
        // Atualizar configuração existente
        console.log(`[saveSpecificDateConfig] → PUT /api/availability-configs/${specificDateConfig.id}`);
        response = await fetch(
          `/api/availability-configs/${specificDateConfig.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
      } else {
        // Criar nova configuração
        console.log(`[saveSpecificDateConfig] → POST /api/availability-configs`);
        response = await fetch("/api/availability-configs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(
          specificDateConfig?.id
            ? "Configuração atualizada!"
            : "Configuração criada!"
        );
        setEditingSpecificDate(false);
        setSpecificDate("");
        setSpecificDateConfig(null);
        setDateStats(null);
        setConfigExists(false);
      } else {
        throw new Error(result.message || "Erro ao salvar");
      }
    } catch (error) {
      console.error("Erro ao salvar configuração:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao salvar configuração"
      );
    } finally {
      setSavingSpecific(false);
    }
  };

  // Mostrar loading enquanto carrega
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">
            Carregando configurações...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resumo */}
        <Card className="mb-8 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumo das Configurações
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {weekConfig.filter((day) => day.enabled).length}
              </div>
              <div className="text-sm text-blue-800">Dias da semana ativos</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {(() => {
                  const enabled = weekConfig.filter((d) => d.enabled);
                  if (enabled.length === 0) return 0;
                  const totalSlots = enabled.reduce((sum, day) => {
                    const duration =
                      parseInt(day.endTime.split(":")[0]) * 60 +
                      parseInt(day.endTime.split(":")[1]) -
                      (parseInt(day.startTime.split(":")[0]) * 60 +
                        parseInt(day.startTime.split(":")[1]));
                    return sum + Math.floor(duration / day.slotDurationMinutes);
                  }, 0);
                  return Math.round(totalSlots / enabled.length);
                })()}
              </div>
              <div className="text-sm text-green-800">Slots médios por dia</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {(() => {
                  const enabled = weekConfig.filter((d) => d.enabled);
                  if (enabled.length === 0) return 0;
                  const avg =
                    enabled.reduce((sum, d) => sum + d.capacityPerSlot, 0) /
                    enabled.length;
                  return Math.round(avg);
                })()}
              </div>
              <div className="text-sm text-purple-800">
                Capacidade média/slot
              </div>
            </div>
          </div>
        </Card>

        {/* Formulário para Editar Data Específica */}
        <Card className="mb-8 p-6 border-2 border-orange-200 bg-linear-to-br from-orange-50 to-amber-50">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-600 rounded-lg">
              <Edit className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Editar Capacidade de Data Específica
              </h2>
              <p className="text-sm text-gray-600">
                Altere a capacidade e horários de um dia já configurado ou
                configure feriados
              </p>
            </div>
          </div>

          {!editingSpecificDate ? (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label
                    htmlFor="specific-date"
                    className="text-sm font-medium mb-2 block"
                  >
                    Selecione a data
                  </Label>
                  <Input
                    id="specific-date"
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    disabled={loadingSpecific || savingSpecific}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={searchSpecificDate}
                    disabled={loadingSpecific || savingSpecific || !specificDate}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {loadingSpecific ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Buscar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-white rounded border border-orange-200">
                <p className="text-sm text-gray-600">
                  💡 <strong>Como usar:</strong> Selecione uma data e clique em
                  &quot;Buscar&quot; para visualizar e editar a configuração daquele dia
                  específico ou inativar em caso de feriado.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Data selecionada */}
              <div className="p-4 bg-white rounded-lg border-2 border-orange-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-5 w-5 text-orange-600" />
                    <div>
                      <div className="text-sm text-gray-600">
                        {configExists
                          ? "Editando configuração de"
                          : "Criando configuração para"}
                      </div>
                      <div className="font-bold text-lg text-gray-900">
                        {new Date(
                          specificDate + "T00:00:00"
                        ).toLocaleDateString("pt-BR", {
                          weekday: "long",
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingSpecificDate(false);
                      setSpecificDate("");
                      setSpecificDateConfig(null);
                      setDateStats(null);
                      setConfigExists(false);
                    }}
                    disabled={savingSpecific}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>

              {/* Alerta se não existir configuração */}
              {!configExists && (
                <div className="p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <div className="font-semibold text-yellow-800 mb-1">
                        Nenhuma configuração encontrada para esta data
                      </div>
                      <div className="text-sm text-yellow-700">
                        Deseja criar uma configuração específica para este dia?
                        Configure os horários e capacidade abaixo e clique em &quot;Criar Configuração&quot;.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Checkbox para inativar o dia */}
              <div className="p-4 bg-white rounded-lg border-2 border-red-200">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="inactivate-day"
                    checked={!specificFormData.isActive}
                    onChange={(e) =>
                      updateFormData({
                        ...specificFormData,
                        isActive: !e.target.checked,
                      })
                    }
                    disabled={savingSpecific}
                    className="h-5 w-5 text-red-600 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="inactivate-day"
                      className="text-base font-semibold text-gray-900 cursor-pointer"
                    >
                      Inativar agendamentos para este dia
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">
                      Marque esta opção para bloquear agendamentos em feriados
                      ou datas especiais. Os slots existentes serão desativados.
                    </p>
                  </div>
                </div>
              </div>

              {/* Estatísticas da data (só mostra se configuração existe) */}
              {configExists && dateStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <div className="text-sm font-medium text-blue-800">
                        Pessoas Agendadas
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {dateStats.totalPeople}
                    </div>
                    <div className="text-xs text-blue-700 mt-1">
                      {dateStats.totalBookings}{" "}
                      {dateStats.totalBookings === 1
                        ? "agendamento"
                        : "agendamentos"}
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <div className="text-sm font-medium text-green-800">
                        Capacidade Total
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {dateStats.totalCapacity}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      pessoas ({dateStats.availableSlots} slots)
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-lg border-2 ${
                      dateStats.totalPeople >= dateStats.totalCapacity
                        ? "bg-red-50 border-red-200"
                        : "bg-purple-50 border-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarIcon
                        className={`h-5 w-5 ${
                          dateStats.totalPeople >= dateStats.totalCapacity
                            ? "text-red-600"
                            : "text-purple-600"
                        }`}
                      />
                      <div
                        className={`text-sm font-medium ${
                          dateStats.totalPeople >= dateStats.totalCapacity
                            ? "text-red-800"
                            : "text-purple-800"
                        }`}
                      >
                        Vagas Disponíveis
                      </div>
                    </div>
                    <div
                      className={`text-3xl font-bold ${
                        dateStats.totalPeople >= dateStats.totalCapacity
                          ? "text-red-600"
                          : "text-purple-600"
                      }`}
                    >
                      {Math.max(
                        0,
                        dateStats.totalCapacity - dateStats.totalPeople
                      )}
                    </div>
                    <div
                      className={`text-xs mt-1 ${
                        dateStats.totalPeople >= dateStats.totalCapacity
                          ? "text-red-700"
                          : "text-purple-700"
                      }`}
                    >
                      {dateStats.totalPeople >= dateStats.totalCapacity
                        ? "Capacidade esgotada!"
                        : `${Math.round(
                            (dateStats.totalPeople / dateStats.totalCapacity) *
                              100
                          )}% ocupado`}
                    </div>
                  </div>
                </div>
              )}

              {/* Formulário de edição (só mostra se estiver ativo) */}
              {specificFormData.isActive && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="spec-start"
                        className="text-sm font-medium"
                      >
                        Horário de Início
                      </Label>
                      <Input
                        id="spec-start"
                        type="time"
                        value={specificFormData.startTime}
                        onChange={(e) =>
                          updateFormData({
                            ...specificFormData,
                            startTime: e.target.value,
                          })
                        }
                        disabled={savingSpecific}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="spec-end" className="text-sm font-medium">
                        Horário de Fim
                      </Label>
                      <Input
                        id="spec-end"
                        type="time"
                        value={specificFormData.endTime}
                        onChange={(e) =>
                          updateFormData({
                            ...specificFormData,
                            endTime: e.target.value,
                          })
                        }
                        disabled={savingSpecific}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="spec-duration"
                        className="text-sm font-medium"
                      >
                        Duração do Slot (minutos)
                      </Label>
                      <Input
                        id="spec-duration"
                        type="number"
                        min="5"
                        step="5"
                        value={specificFormData.slotDurationMinutes}
                        onChange={(e) =>
                          updateFormData({
                            ...specificFormData,
                            slotDurationMinutes: parseInt(e.target.value) || 30,
                          })
                        }
                        disabled={savingSpecific}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="spec-capacity"
                        className="text-sm font-medium"
                      >
                        Capacidade por Slot
                      </Label>
                      <Input
                        id="spec-capacity"
                        type="number"
                        min="1"
                        value={specificFormData.capacityPerSlot}
                        onChange={(e) =>
                          updateFormData({
                            ...specificFormData,
                            capacityPerSlot: parseInt(e.target.value) || 1,
                          })
                        }
                        disabled={savingSpecific}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Alerta se estiver reduzindo capacidade abaixo das reservas */}
                  {dateStats &&
                    dateStats.totalPeople > dateStats.totalCapacity && (
                      <div className="p-4 bg-red-50 border-2 border-red-300 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="text-red-600 text-xl">⚠️</div>
                          <div>
                            <div className="font-semibold text-red-800 mb-1">
                              Atenção: Capacidade insuficiente!
                            </div>
                            <div className="text-sm text-red-700">
                              A nova configuração tem capacidade de{" "}
                              <strong>{dateStats.totalCapacity} pessoas</strong>
                              , mas já existem{" "}
                              <strong>
                                {dateStats.totalPeople} pessoas agendadas
                              </strong>{" "}
                              para este dia. Aumente a capacidade ou os horários
                              disponíveis.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                </>
              )}

              {/* Botão salvar */}
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingSpecificDate(false);
                    setSpecificDate("");
                    setSpecificDateConfig(null);
                    setDateStats(null);
                    setConfigExists(false);
                  }}
                  disabled={savingSpecific}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={saveSpecificDateConfig}
                  disabled={savingSpecific}
                  className={
                    specificFormData.isActive
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-red-600 hover:bg-red-700"
                  }
                >
                  {savingSpecific ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      {configExists
                        ? specificFormData.isActive
                          ? "Atualizar Configuração"
                          : "Inativar Dia"
                        : "Criar Configuração"}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Configuração dos Dias */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Configuração de Horários Semanais
              </h2>
            </div>
            <Button
              onClick={saveWeeklySchedule}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Configuração"
              )}
            </Button>
          </div>

          <div className="space-y-6">
            {weekConfig.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`p-6 rounded-lg border-2 transition-all ${
                  day.enabled
                    ? "bg-white border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                {/* Header do Dia */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => toggleDay(day.dayOfWeek)}
                      disabled={saving}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <div>
                      <div className="font-semibold text-gray-900 text-lg">
                        {day.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {day.shortName}
                      </div>
                    </div>
                  </div>

                  {day.enabled && (
                    <div className="text-sm text-gray-600">
                      ~
                      {Math.floor(
                        (parseInt(day.endTime.split(":")[0]) * 60 +
                          parseInt(day.endTime.split(":")[1]) -
                          (parseInt(day.startTime.split(":")[0]) * 60 +
                            parseInt(day.startTime.split(":")[1]))) /
                          day.slotDurationMinutes
                      )}{" "}
                      slots disponíveis
                    </div>
                  )}
                </div>

                {/* Configurações (só aparece se o dia estiver ativo) */}
                {day.enabled && (
                  <div className="space-y-4 pl-8">
                    {/* Horários */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor={`start-${day.dayOfWeek}`}
                          className="text-sm font-medium"
                        >
                          Horário de Início
                        </Label>
                        <Input
                          id={`start-${day.dayOfWeek}`}
                          type="time"
                          value={day.startTime}
                          onChange={(e) =>
                            updateDayField(
                              day.dayOfWeek,
                              "startTime",
                              e.target.value
                            )
                          }
                          disabled={saving || !day.enabled}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`end-${day.dayOfWeek}`}
                          className="text-sm font-medium"
                        >
                          Horário de Fim
                        </Label>
                        <Input
                          id={`end-${day.dayOfWeek}`}
                          type="time"
                          value={day.endTime}
                          onChange={(e) =>
                            updateDayField(
                              day.dayOfWeek,
                              "endTime",
                              e.target.value
                            )
                          }
                          disabled={saving || !day.enabled}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Duração e Capacidade */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor={`duration-${day.dayOfWeek}`}
                          className="text-sm font-medium"
                        >
                          Duração do Slot (minutos)
                        </Label>
                        <Input
                          id={`duration-${day.dayOfWeek}`}
                          type="number"
                          min="5"
                          step="5"
                          value={day.slotDurationMinutes}
                          onChange={(e) =>
                            updateDayField(
                              day.dayOfWeek,
                              "slotDurationMinutes",
                              parseInt(e.target.value) || 30
                            )
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor={`capacity-${day.dayOfWeek}`}
                          className="text-sm font-medium"
                        >
                          Capacidade por Slot
                        </Label>
                        <Input
                          id={`capacity-${day.dayOfWeek}`}
                          type="number"
                          min="1"
                          value={day.capacityPerSlot}
                          onChange={(e) =>
                            updateDayField(
                              day.dayOfWeek,
                              "capacityPerSlot",
                              parseInt(e.target.value) || 1
                            )
                          }
                          disabled={saving || !day.enabled}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Períodos de Pausa */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">
                          Períodos de Pausa
                        </Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addBreakPeriod(day.dayOfWeek)}
                          disabled={saving}
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Pausa
                        </Button>
                      </div>

                      {day.breakPeriods.length === 0 ? (
                        <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
                          Nenhuma pausa configurada
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {day.breakPeriods.map((breakPeriod) => (
                            <div
                              key={breakPeriod.id}
                              className="flex items-center gap-2 p-3 bg-amber-50 rounded border border-amber-200"
                            >
                              <Coffee className="h-4 w-4 text-amber-600 shrink-0" />
                              <Input
                                type="time"
                                value={breakPeriod.startTime}
                                onChange={(e) =>
                                  updateBreakPeriod(
                                    day.dayOfWeek,
                                    breakPeriod.id,
                                    "startTime",
                                    e.target.value
                                  )
                                }
                                disabled={saving}
                                className="w-32"
                              />
                              <span className="text-gray-500">até</span>
                              <Input
                                type="time"
                                value={breakPeriod.endTime}
                                onChange={(e) =>
                                  updateBreakPeriod(
                                    day.dayOfWeek,
                                    breakPeriod.id,
                                    "endTime",
                                    e.target.value
                                  )
                                }
                                disabled={saving}
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  removeBreakPeriod(
                                    day.dayOfWeek,
                                    breakPeriod.id
                                  )
                                }
                                disabled={saving}
                                className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Como funciona:</strong> Configure os horários de
              funcionamento para cada dia da semana. Os slots de agendamento
              serão gerados automaticamente com base na duração escolhida. Use
              os períodos de pausa para intervalos como almoço ou coffee break.
            </p>
          </div>

          {/* Configuração de período para gerar slots */}
          <div className="mt-6 p-6 bg-linear-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-600 rounded-lg">
                <Settings className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Período de Geração de Slots
                </h3>
                <p className="text-sm text-gray-600">
                  Defina por quantos dias futuros os slots serão criados
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[7, 15, 30, 60, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => setDaysAhead(days)}
                    disabled={saving}
                    className={`p-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      daysAhead === days
                        ? "border-green-600 bg-green-100 text-green-900"
                        : "border-gray-300 bg-white text-gray-700 hover:border-green-400"
                    }`}
                  >
                    <div className="font-bold text-lg">{days}</div>
                    <div className="text-xs">dias</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Label
                  htmlFor="custom-days"
                  className="text-sm font-medium whitespace-nowrap"
                >
                  Ou personalizar:
                </Label>
                <Input
                  id="custom-days"
                  type="number"
                  min="1"
                  max="365"
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
                  disabled={saving}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">dias</span>
              </div>

              <div className="p-3 bg-white rounded border border-green-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    Slots serão gerados até:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {(() => {
                      const futureDate = new Date();
                      futureDate.setDate(futureDate.getDate() + daysAhead);
                      return futureDate.toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      });
                    })()}
                  </span>
                </div>
              </div>

              <div className="text-xs text-gray-500 italic">
                💡 <strong>Dica:</strong> Recomendamos 30 dias para uso regular.
                Para eventos ou períodos especiais, você pode gerar mais dias.
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
