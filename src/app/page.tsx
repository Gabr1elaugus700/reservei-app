"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {  Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { BookingCalendar } from "@/components/BookingCalendar";
import { Input } from "@/components/ui/input";

interface Visitor {
  id: string;
  name: string;
  age: string;
}

const Index = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [responsibleName, setResponsibleName] = useState("");
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [showNameField, setShowNameField] = useState(false);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>([
    { id: "1", name: "", age: "" },
  ]);

  const handleWhatsappChange = (value: string) => {
    setWhatsappNumber(value);
    setShowNameField(false);
    setResponsibleName("");
    setIsCustomerFound(false);
    setCustomerId("");
  }

  const handleWhatsappBlur = async () => {
    // Validar Whatsapp (mínimo 10 dígitos)
    const numbersOnly = whatsappNumber.replace(/\D/g, '');
    
    if (numbersOnly.length < 10) {
      toast.error("Número de WhatsApp inválido");
      return;
    }

    setIsLoadingCustomer(true);

    try {
      const response = await fetch(`/api/customer/${whatsappNumber}`);
      console.log('Response:', response);
      const result = await response.json();

      if (result.found) {
        setResponsibleName(result.name);
        setShowNameField(true);
        setIsCustomerFound(true);
        setCustomerId(result.id);
      } else {
        setShowNameField(true);
        setIsCustomerFound(false);
      }
    } catch (error) {
      toast.error("Erro ao buscar cliente" + (error instanceof Error ? `: ${error.message}` : ""));
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  // Gerar horários disponíveis (09:00 às 18:00, intervalos de 30min) -- Alterar para montar via backend return
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 18 && minute > 0) break; // Parar às 18:00
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Simular capacidade por horário (em produção, viria do backend)
  const getTimeSlotCapacity = (time: string) => {
    // Capacidade máxima: 20 pessoas
    // Simulando alguns horários com ocupação
    const occupiedSlots: { [key: string]: number } = {
      "10:00": 20, // Cheio
      "11:00": 18,
      "14:00": 20, // Cheio
      "15:30": 19,
    };
    return {
      occupied: occupiedSlots[time] || 0,
      max: 20,
      isFull: occupiedSlots[time] >= 20
    };
  };

  const addVisitor = () => {
    setVisitors([...visitors, { id: Date.now().toString(), name: "", age: "" }]);
  };

  const updateVisitor = (id: string, field: "name" | "age", value: string) => {
    setVisitors(visitors.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleBooking = () => {
    if (!selectedDate || !selectedTime || !responsibleName || !whatsappNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const filledVisitors = visitors.filter(v => v.name && v.age);
    if (filledVisitors.length === 0) {
      toast.error("Adicione pelo menos um visitante");
      return;
    }

    toast.success("Agendamento realizado com sucesso!");
  };

  return (
    <div className="min-h-screen  from-background to-muted">
      

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Hero Image Card */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
          <Image
            src={"/images/recanto_uva_fina.png"}
            alt="Visita ao Parque"
            width={400}
            height={800}
            className="w-full h-64 sm:h-72 object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-white">
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">Recanto Da Uva Fina</h2>
            <div className="flex justify-between items-end">
              <div>
                <span className="text-sm opacity-90 block mb-1">Valor por Adulto:</span>
                <span className="text-3xl sm:text-4xl font-bold">R$ 10,00</span>
              </div>
              <div>
                <span className="text-sm opacity-90 block mb-1">Valor por Criança (Até 10 anos):</span>
                <span className="text-3xl sm:text-4xl font-bold">R$ 5,00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-1 bg-primary rounded-full" />
            <h3 className="text-xl font-bold">Selecione a Data</h3>
          </div>
          <BookingCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        {/* Time Selection */}
        {selectedDate && (
          <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border animate-in fade-in-50 slide-in-from-top-5 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-1 bg-primary rounded-full" />
              <h3 className="text-xl font-bold">Selecione o Horário</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {timeSlots.map((time) => {
                const capacity = getTimeSlotCapacity(time);
                const isSelected = selectedTime === time;
                const isFull = capacity.isFull;

                return (
                  <button
                    key={time}
                    onClick={() => !isFull && setSelectedTime(time)}
                    disabled={isFull}
                    className={`
                      relative p-3 rounded-xl border-2 transition-all duration-200
                      ${isSelected 
                        ? 'bg-primary border-primary text-primary-foreground shadow-lg scale-105' 
                        : isFull
                        ? 'bg-muted/50 border-muted text-muted-foreground cursor-not-allowed opacity-50'
                        : 'bg-background border-border hover:border-primary hover:bg-primary/5 hover:scale-105'
                      }
                    `}
                  >
                    <div className="font-semibold text-sm">{time}</div>
                    {!isFull && (
                      <div className="text-xs mt-1 opacity-75">
                        {capacity.occupied}/{capacity.max}
                      </div>
                    )}
                    {isFull && (
                      <div className="text-xs mt-1 font-medium">
                        Lotado
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground flex items-center gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span>Selecionado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-background border-2 border-border" />
                  <span>Disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-muted" />
                  <span>Lotado</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Responsible Person */}
        <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-1 bg-primary rounded-full" />
            <h3 className="text-xl font-bold">Responsável pelo Passeio</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                Número de WhatsApp
              </label>
              <Input
                placeholder="(00) 00000-0000"
                value={whatsappNumber}
                onChange={(e) => handleWhatsappChange(e.target.value)}
                onBlur={handleWhatsappBlur}
                className="h-12 bg-background border-border focus:border-primary transition-colors"
              />
            </div>

            {isLoadingCustomer && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Buscando dados...
                </span>
              </div>
            )}

            {showNameField && !isLoadingCustomer && (
              <div className="animate-in fade-in-50 slide-in-from-top-5 duration-300">
                <label className="block text-sm font-medium mb-2 text-muted-foreground">
                  Nome Completo
                  {isCustomerFound && (
                    <span className="ml-2 text-xs text-primary">(Cliente cadastrado)</span>
                  )}
                </label>
                <Input
                  placeholder="Digite seu nome completo"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  disabled={isCustomerFound}
                  className={`h-12 bg-background border-border focus:border-primary transition-colors ${
                    isCustomerFound ? 'opacity-75 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Visitors */}
        <div className="bg-card rounded-2xl shadow-lg p-6 sm:p-8 border border-border">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-1 bg-primary rounded-full" />
            <h3 className="text-xl font-bold">Visitantes</h3>
          </div>
          <div className="space-y-4">
            {visitors.map((visitor, index) => (
              <div key={visitor.id} className="space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Visitante {index + 1}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                      Nome
                    </label>
                    <Input
                      placeholder="Nome do visitante"
                      value={visitor.name}
                      onChange={(e) => updateVisitor(visitor.id, "name", e.target.value)}
                      className="h-11 bg-background border-border focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-muted-foreground">
                      Idade
                    </label>
                    <Input
                      placeholder="0"
                      type="number"
                      value={visitor.age}
                      onChange={(e) => updateVisitor(visitor.id, "age", e.target.value)}
                      className="h-11 bg-background border-border focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              </div>
            ))}
            <Button
              variant="secondary"
              className="w-full h-12 mt-2 font-semibold hover:bg-secondary/80"
              onClick={addVisitor}
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar Visitante
            </Button>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          onClick={handleBooking}
        >
          Confirmar Agendamento
        </Button>
      </main>
    </div>
  );
};

export default Index;