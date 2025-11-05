"use client";
// import { useState } from "react";
import { AlertCircle, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/bookingsHook";

interface Booking {
  id: string;
  name: string;
  phone: string;
  people: number;
  time: string;
}

const BookingsList = () => {
  const {
    currentDate,
    bookings,
    loading,
    error,
    previousDay,
    nextDay,
    goToToday,
    goToDate,
  } = useBookings();

  // const bookings: Booking[] = [
  //   { id: "1", name: "Ana Silva", phone: "(11) 98765-4321", people: 2, time: "10:00" },
  //   { id: "2", name: "Carlos Mendes", phone: "(21) 91234-5678", people: 4, time: "11:30" },
  //   { id: "3", name: "Beatriz Costa", phone: "(31) 99876-5432", people: 3, time: "14:00" },
  //   { id: "4", name: "Ricardo Lima", phone: "(41) 98765-1234", people: 5, time: "16:00" },
  // ];

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
    }
    const labels = {
      PENDING: "Pendente",
      CONFIRMED: "Confirmado",
      CANCELLED: "Cancelado",
      COMPLETED: "Concluído",
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  const isToday = () => {
    const today = new Date();
    return ( currentDate.toDateString() === today.toDateString() )
  };

  return (
<div className="min-h-screen bg-background flex flex-col">
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Date Navigator */}
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousDay}
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

        {/* Bookings list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">
              Agendamentos do dia ({bookings.length})
            </h3>
            {loading && (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
          </div>

          {bookings.length === 0 ? (
            <div className="bg-card rounded-2xl p-8 text-center shadow-sm">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum agendamento para este dia
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => redirect(`/reservation-details/${booking.id}`)}
                  className="w-full bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-bold text-base">{booking.name}</h4>
                        {getStatusBadge(booking.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {booking.phone}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {booking.adults} {booking.adults === 1 ? 'Adulto' : 'Adultos'}, {booking.children} {booking.children === 1 ? 'criança' : 'Crianças'}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      {booking.time}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default BookingsList;
