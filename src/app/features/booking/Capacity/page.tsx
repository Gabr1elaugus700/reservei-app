"use client";
import {
  Plus,
  Trash2,
  Settings,
  Loader2,
  Coffee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAvailabilitySchedule } from "@/hooks/use-capacity-management";
import { useSession } from "@/lib/auth-client";

export default function CapacityPage() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !!session?.user;
  
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


  // Mostrar loading enquanto carrega
  if (loading || isPending) {
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

  // Se não está autenticado após o loading, não renderiza nada
  if (!isAuthenticated) {
    return null;
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
                      (parseInt(day.endTime.split(':')[0]) * 60 + parseInt(day.endTime.split(':')[1])) -
                      (parseInt(day.startTime.split(':')[0]) * 60 + parseInt(day.startTime.split(':')[1]));
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
                  const avg = enabled.reduce((sum, d) => sum + d.capacityPerSlot, 0) / enabled.length;
                  return Math.round(avg);
                })()}
              </div>
              <div className="text-sm text-purple-800">Capacidade média/slot</div>
            </div>
          </div>
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
                'Salvar Configuração'
              )}
            </Button>
          </div>

          <div className="space-y-6">
            {weekConfig.map((day) => (
              <div
                key={day.dayOfWeek}
                className={`p-6 rounded-lg border-2 transition-all ${
                  day.enabled
                    ? 'bg-white border-blue-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {/* Header do Dia */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => toggleDay(day.dayOfWeek)}
                      className="h-5 w-5 text-blue-600 rounded border-gray-300"
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
                      ~{Math.floor(
                        ((parseInt(day.endTime.split(':')[0]) * 60 + parseInt(day.endTime.split(':')[1])) -
                         (parseInt(day.startTime.split(':')[0]) * 60 + parseInt(day.startTime.split(':')[1]))) /
                        day.slotDurationMinutes
                      )} slots disponíveis
                    </div>
                  )}
                </div>

                {/* Configurações (só aparece se o dia estiver ativo) */}
                {day.enabled && (
                  <div className="space-y-4 pl-8">
                    {/* Horários */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`start-${day.dayOfWeek}`} className="text-sm font-medium">
                          Horário de Início
                        </Label>
                        <Input
                          id={`start-${day.dayOfWeek}`}
                          type="time"
                          value={day.startTime}
                          onChange={(e) => updateDayField(day.dayOfWeek, 'startTime', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`end-${day.dayOfWeek}`} className="text-sm font-medium">
                          Horário de Fim
                        </Label>
                        <Input
                          id={`end-${day.dayOfWeek}`}
                          type="time"
                          value={day.endTime}
                          onChange={(e) => updateDayField(day.dayOfWeek, 'endTime', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Duração e Capacidade */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`duration-${day.dayOfWeek}`} className="text-sm font-medium">
                          Duração do Slot (minutos)
                        </Label>
                        <Input
                          id={`duration-${day.dayOfWeek}`}
                          type="number"
                          min="5"
                          step="5"
                          value={day.slotDurationMinutes}
                          onChange={(e) => updateDayField(day.dayOfWeek, 'slotDurationMinutes', parseInt(e.target.value) || 30)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`capacity-${day.dayOfWeek}`} className="text-sm font-medium">
                          Capacidade por Slot
                        </Label>
                        <Input
                          id={`capacity-${day.dayOfWeek}`}
                          type="number"
                          min="1"
                          value={day.capacityPerSlot}
                          onChange={(e) => updateDayField(day.dayOfWeek, 'capacityPerSlot', parseInt(e.target.value) || 1)}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    {/* Períodos de Pausa */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-sm font-medium">Períodos de Pausa</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addBreakPeriod(day.dayOfWeek)}
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
                                    'startTime',
                                    e.target.value
                                  )
                                }
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
                                    'endTime',
                                    e.target.value
                                  )
                                }
                                className="w-32"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeBreakPeriod(day.dayOfWeek, breakPeriod.id)}
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
              <strong>Como funciona:</strong> Configure os horários de funcionamento para cada dia da semana. 
              Os slots de agendamento serão gerados automaticamente com base na duração escolhida. 
              Use os períodos de pausa para intervalos como almoço ou coffee break.
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
                    className={`p-3 rounded-lg border-2 transition-all ${
                      daysAhead === days
                        ? 'border-green-600 bg-green-100 text-green-900'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-green-400'
                    }`}
                  >
                    <div className="font-bold text-lg">{days}</div>
                    <div className="text-xs">dias</div>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="custom-days" className="text-sm font-medium whitespace-nowrap">
                  Ou personalizar:
                </Label>
                <Input
                  id="custom-days"
                  type="number"
                  min="1"
                  max="365"
                  value={daysAhead}
                  onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
                  className="w-24"
                />
                <span className="text-sm text-gray-600">dias</span>
              </div>

              <div className="p-3 bg-white rounded border border-green-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Slots serão gerados até:</span>
                  <span className="font-semibold text-gray-900">
                    {(() => {
                      const futureDate = new Date();
                      futureDate.setDate(futureDate.getDate() + daysAhead);
                      return futureDate.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
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
