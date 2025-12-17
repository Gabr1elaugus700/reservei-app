"use client";
import { useState } from "react";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Loader2, Check, Edit2, X, DollarSign, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/bookingsHook";
import { Input } from "@/components/ui/input";
import { NewBookingForm } from "@/components/NewBookingForm";

const BookingsList = () => {
  const {
    currentDate,
    slotGroups,
    totalDayRevenue,
    loading,
    error,
    previousDay,
    nextDay,
    goToToday,
    updateBooking,
    deleteBooking,
    refreshData,
  } = useBookings();

  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [editAdults, setEditAdults] = useState(0);
  const [editChildren, setEditChildren] = useState(0);
  const [saving, setSaving] = useState(false);
  const [addingToSlotId, setAddingToSlotId] = useState<string | null>(null);

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: "bg-yellow-100 text-yellow-800",
      CONFIRMED: "bg-blue-100 text-blue-800",
      CANCELLED: "bg-red-100 text-red-800",
      COMPLETED: "bg-green-100 text-green-800",
    };
    const labels = {
      PENDING: "Pendente",
      CONFIRMED: "Confirmado",
      CANCELLED: "Cancelado",
      COMPLETED: "Concluído",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const isToday = () => {
    const today = new Date();
    return currentDate.toDateString() === today.toDateString();
  };

  const startEdit = (bookingId: string, adults: number, children: number) => {
    setEditingBookingId(bookingId);
    setEditAdults(adults);
    setEditChildren(children);
  };

  const cancelEdit = () => {
    setEditingBookingId(null);
    setEditAdults(0);
    setEditChildren(0);
  };

  const saveEdit = async (bookingId: string) => {
    try {
      setSaving(true);
      await updateBooking(bookingId, {
        adults: editAdults,
        children: editChildren,
      });
      setEditingBookingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const confirmVisit = async (bookingId: string) => {
    try {
      await updateBooking(bookingId, { status: "COMPLETED" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao confirmar visita");
    }
  };

  const handleDelete = async (bookingId: string, customerName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o agendamento de ${customerName}?`)) {
      return;
    }

    try {
      await deleteBooking(bookingId);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir agendamento");
    }
  };

  const handleNewBookingSuccess = () => {
    setAddingToSlotId(null);
    refreshData();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const totalBookings = slotGroups.reduce((sum, group) => sum + group.bookings.length, 0);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header com Faturamento Total */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 mb-6 shadow-lg text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90 mb-1">Faturamento Total do Dia</p>
              <h1 className="text-4xl font-bold">{formatCurrency(totalDayRevenue)}</h1>
            </div>
            <DollarSign className="h-16 w-16 opacity-20" />
          </div>
        </div>

        {/* Date Navigator */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousDay}
              disabled={loading}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <div className="text-center flex-1">
              <h2 className="text-xl font-bold">
                {weekDays[currentDate.getDay()]}{currentDate.getDay() !== 0 && currentDate.getDay() !== 6 ? '-feira' : ''}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentDate.getDate()} de {monthNames[currentDate.getMonth()]} de {currentDate.getFullYear()}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={nextDay}
              disabled={loading}
              className="h-10 w-10"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick action: Go to today */}
          {!isToday() && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Voltar para hoje
            </Button>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Slots e Bookings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              Agendamentos do dia ({totalBookings})
            </h3>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>

          {slotGroups.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum horário disponível para este dia
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {slotGroups.map((group) => (
                <div key={group.slot.id} className="bg-card rounded-2xl p-5 shadow-sm">
                  {/* Cabeçalho do Slot */}
                  <div className="border-b pb-3 mb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 rounded-lg p-2">
                          <span className="text-lg font-bold text-primary">
                            {group.slot.startTime}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Capacidade: {group.slot.availableCapacity}/{group.slot.totalCapacity}
                          </p>
                          <p className="text-sm font-semibold text-green-600">
                            Faturamento: {formatCurrency(group.totalRevenue)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {group.bookings.length} {group.bookings.length === 1 ? 'agendamento' : 'agendamentos'}
                          </p>
                        </div>
                        {group.slot.availableCapacity > 0 && (
                          <Button
                            size="sm"
                            onClick={() => setAddingToSlotId(group.slot.id)}
                            disabled={addingToSlotId !== null}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Adicionar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Formulário de Novo Agendamento */}
                  {addingToSlotId === group.slot.id && (
                    <div className="mb-4">
                      <NewBookingForm
                        slotId={group.slot.id}
                        slotTime={group.slot.startTime}
                        date={currentDate}
                        onSuccess={handleNewBookingSuccess}
                        onCancel={() => setAddingToSlotId(null)}
                      />
                    </div>
                  )}

                  {/* Lista de Bookings do Slot */}
                  {group.bookings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum agendamento neste horário
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {group.bookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="bg-background rounded-lg p-4 border hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-bold text-base">{booking.name}</h4>
                                {getStatusBadge(booking.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {booking.phone}
                              </p>
                              
                              {/* Modo de edição */}
                              {editingBookingId === booking.id ? (
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">Adultos:</label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={editAdults}
                                      onChange={(e) => setEditAdults(parseInt(e.target.value) || 0)}
                                      className="w-20 h-8"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <label className="text-sm font-medium">Crianças:</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={editChildren}
                                      onChange={(e) => setEditChildren(parseInt(e.target.value) || 0)}
                                      className="w-20 h-8"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {booking.adults} {booking.adults === 1 ? 'Adulto' : 'Adultos'}, {booking.children} {booking.children === 1 ? 'Criança' : 'Crianças'}
                                </p>
                              )}

                              <p className="text-sm font-semibold text-green-600">
                                {formatCurrency(booking.totalPrice)}
                              </p>
                            </div>

                            {/* Botões de ação */}
                            <div className="flex flex-col gap-2 ml-4">
                              {editingBookingId === booking.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => saveEdit(booking.id)}
                                    disabled={saving}
                                    className="gap-1"
                                  >
                                    <Check className="h-4 w-4" />
                                    Salvar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={cancelEdit}
                                    disabled={saving}
                                    className="gap-1"
                                  >
                                    <X className="h-4 w-4" />
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEdit(booking.id, booking.adults, booking.children)}
                                    className="gap-1"
                                  >
                                    <Edit2 className="h-4 w-4" />
                                    Editar
                                  </Button>
                                  {booking.status !== "COMPLETED" && (
                                    <Button
                                      size="sm"
                                      onClick={() => confirmVisit(booking.id)}
                                      className="gap-1 bg-green-600 hover:bg-green-700"
                                    >
                                      <Check className="h-4 w-4" />
                                      Confirmar
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDelete(booking.id, booking.name)}
                                    className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    Excluir
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BookingsList;
