"use client";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Calendar,
  Settings,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useCapacityManagement } from "@/hooks/use-capacity-management";
import { useSession } from "@/lib/auth-client";
import { formatDate } from "@/lib/format-date";

export default function CapacityPage() {
  const { data: session, isPending } = useSession();
  const isAuthenticated = !!session?.user;
  const {
    weeklyLimits,
    specialDates,
    loading,
    saveConfiguration,
    updateWeeklyLimit,
    toggleWeekdayEnabled,
    addSpecialDate,
    removeSpecialDate,
    updateSpecialDateLocal,
  } = useCapacityManagement(isAuthenticated);                                                                                        

  // Estados para formulário de nova data especial
  const [newSpecialDate, setNewSpecialDate] = useState({
    date: "",
    limit: "",
    description: "",
  });
  // Função para adicionar data especial
  const handleAddSpecialDate = async () => {
    if (!newSpecialDate.date || !newSpecialDate.limit) {
      return;
    }

    const limit = parseInt(newSpecialDate.limit);
    if (isNaN(limit) || limit < 0) {
      return;
    }

    const success = await addSpecialDate(
      newSpecialDate.date,
      limit,
      newSpecialDate.description
    );

    if (success) {
      setNewSpecialDate({ date: "", limit: "", description: "" });
    }
  };

  // Função para salvar configurações
  const handleSaveConfiguration = async () => {
    await saveConfiguration();
  };


  // Mostrar loading enquanto carrega
  if (loading || isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">
            Verificando autenticação...
          </span>
        </div>
      </div>
    );
  }

  // Se não está autenticado após o loading, não renderiza nada (vai redirecionar)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Limites Padrão por Dia da Semana */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <Settings className="h-5 w-5 mr-2 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Limites Padrão por Dia da Semana
              </h2>
            </div>

            <div className="space-y-4">
              {weeklyLimits.map((day) => (
                <div
                  key={day.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={day.enabled}
                      onChange={() => toggleWeekdayEnabled(day.id)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    />
                    <div>
                      <div className="font-medium text-gray-900">
                        {day.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {day.shortName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label
                      htmlFor={`limit-${day.id}`}
                      className="text-sm text-gray-600"
                    >
                      Limite:
                    </Label>
                    <Input
                      id={`limit-${day.id}`}
                      type="number"
                      min="0"
                      value={day.limit}
                      onChange={(e) =>
                        updateWeeklyLimit(day.id, parseInt(e.target.value) || 0)
                      }
                      className="w-20 text-center"
                      disabled={!day.enabled}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Dica:</strong> Os limites padrão serão aplicados
                automaticamente para todos os dias. Use as configurações de
                datas específicas abaixo para exceções.
              </p>
            </div>
          </Card>

          {/* Datas Específicas */}
          <Card className="p-6">
            <div className="flex items-center mb-6">
              <Calendar className="h-5 w-5 mr-2 text-green-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Configurações de Datas Específicas
              </h2>
            </div>

            {/* Formulário para nova data especial */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 mb-4">
                Adicionar Nova Data
              </h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="new-date">Data</Label>
                  <Input
                    id="new-date"
                    type="date"
                    value={newSpecialDate.date}
                    onChange={(e) =>
                      setNewSpecialDate((prev) => ({
                        ...prev,
                        date: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new-limit">Limite de Capacidade</Label>
                  <Input
                    id="new-limit"
                    type="number"
                    min="0"
                    placeholder="Ex: 0 para fechado, 50 para capacidade especial"
                    value={newSpecialDate.limit}
                    onChange={(e) =>
                      setNewSpecialDate((prev) => ({
                        ...prev,
                        limit: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="new-description">Descrição (opcional)</Label>
                  <Input
                    id="new-description"
                    placeholder="Ex: Feriado, Evento especial, Manutenção"
                    value={newSpecialDate.description}
                    onChange={(e) =>
                      setNewSpecialDate((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <Button onClick={handleAddSpecialDate} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Data Especial
                </Button>
              </div>
            </div>

            {/* Lista de datas especiais */}
            <div className="space-y-3">
              <h3 className="text-md font-medium text-gray-900">
                Datas Configuradas
              </h3>
              {specialDates.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhuma data especial configurada
                </p>
              ) : (
                specialDates.map((specialDate) => (
                  <div
                    key={specialDate.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {formatDate(specialDate.date)}
                      </div>
                      {specialDate.description && (
                        <div className="text-sm text-gray-500">
                          {specialDate.description}
                        </div>
                      )}
                      <div className="text-sm">
                        <span
                          className={`font-medium ${
                            specialDate.limit === 0
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {specialDate.limit === 0
                            ? "Fechado"
                            : `Limite: ${specialDate.limit}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        min="0"
                        value={specialDate.limit}
                        onChange={(e) =>
                          updateSpecialDateLocal(
                            specialDate.id,
                            "limit",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="w-20 text-center"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSpecialDate(specialDate.date)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {specialDates.length > 0 && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Total:</strong> {specialDates.length} data(s)
                  especial(is) configurada(s). Essas configurações
                  sobrescreverão os limites padrão da semana.
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Resumo das Configurações */}
        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Resumo das Configurações
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {weeklyLimits.filter((day) => day.enabled).length}
              </div>
              <div className="text-sm text-blue-800">Dias da semana ativos</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {specialDates.length}
              </div>
              <div className="text-sm text-green-800">Datas especiais</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {(() => {
                  const enabled = weeklyLimits.filter((d) => d.enabled);
                  const total = weeklyLimits.reduce(
                    (sum, day) => sum + (day.enabled ? day.limit : 0),
                    0
                  );
                  return enabled.length ? Math.round(total / enabled.length) : 0;
                })()}
              </div>
              <div className="text-sm text-yellow-800">
                Limite médio semanal
              </div>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {specialDates.filter((date) => date.limit === 0).length}
              </div>
              <div className="text-sm text-red-800">Dias fechados</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
