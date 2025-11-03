"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Booking {
  id: string;
  name: string;
  phone: string;
  people: number;
  time: string;
}

const BookingsList = () => {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 6, 5)); // July 5, 2024

  const bookings: Booking[] = [
    { id: "1", name: "Ana Silva", phone: "(11) 98765-4321", people: 2, time: "10:00" },
    { id: "2", name: "Carlos Mendes", phone: "(21) 91234-5678", people: 4, time: "11:30" },
    { id: "3", name: "Beatriz Costa", phone: "(31) 99876-5432", people: 3, time: "14:00" },
    { id: "4", name: "Ricardo Lima", phone: "(41) 98765-1234", people: 5, time: "16:00" },
  ];

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const previousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const nextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
    
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={previousDay}
              className="h-10 w-10"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center">
              <h2 className="text-xl font-bold">
                {weekDays[currentDate.getDay()]}-feira
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
        </div>

        <div>
          <h3 className="text-lg font-bold mb-4">Agendamentos do dia</h3>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => redirect("/reservation-details")}
                className="w-full bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-base mb-1">{booking.name}</h4>
                    <p className="text-sm text-muted-foreground mb-1">{booking.phone}</p>
                    <p className="text-sm text-muted-foreground">{booking.people} pessoas</p>
                  </div>
                  <span className="text-lg font-bold text-primary">{booking.time}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingsList;
