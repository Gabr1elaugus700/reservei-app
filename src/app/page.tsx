"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CircleMinus, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { BookingCalendar } from "@/components/BookingCalendar";
import { Input } from "@/components/ui/input";
import TimeSlot from "@/components/TimeSlot";
import { useTimeSlots } from "@/hooks/use-timeslots";

interface Visitors {
  childrens: number;
  adults: number;
  responsible: Responsible;
}

interface Responsible {
  id: string;
  name: string;
  whatsapp: string;
}

const Index = () => {
  // Date
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState<string>("");
  const [isBookingLoading, setIsBookingLoading] = useState(false);

  // Fetch time slots based on selected date
  const {
    timeSlots,
    loading: timeSlotsLoading,
    error: timeSlotsError,
  } = useTimeSlots(selectedDate);

  // Customer
  const [responsibleName, setResponsibleName] = useState("");
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);
  const [showNameField, setShowNameField] = useState(false);
  const [isCustomerFound, setIsCustomerFound] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [visitors, setVisitors] = useState<Visitors[]>([]);

  // Visitors count
  const [adultsCount, setAdultsCount] = useState(1);
  const [childrensCount, setChildrensCount] = useState(0);

  // Function to add or remove visitors
  const sumAdults = () => setAdultsCount(adultsCount + 1);
  const subtractAdults = () => {
    if (adultsCount > 0) setAdultsCount(adultsCount - 1);
  };

  const sumChildrens = () => setChildrensCount(childrensCount + 1);
  const subtractChildrens = () => {
    if (childrensCount > 0) setChildrensCount(childrensCount - 1);
  };

  const handleWhatsappChange = (value: string) => {
    setWhatsappNumber(value);
    setShowNameField(false);
    setResponsibleName("");
    setIsCustomerFound(false);
    setCustomerId("");
  };

  const handleWhatsappBlur = async () => {
    // Validar Whatsapp (mínimo 10 dígitos)
    const numbersOnly = whatsappNumber.replace(/\D/g, "");

    if (numbersOnly.length < 10) {
      toast.error("Número de WhatsApp inválido");
      return;
    }

    setIsLoadingCustomer(true);

    try {
      const response = await fetch(
        `/api/customer?phone=${encodeURIComponent(whatsappNumber)}`
      );
      const result = await response.json();

      if (response.ok && result.success) {
        // Customer found
        setResponsibleName(result.data.name);
        setShowNameField(true);
        setIsCustomerFound(true);
        setCustomerId(result.data.id);
        toast.success("Cliente encontrado!");
      } else if (response.status === 404) {
        // Customer not found, show name field
        setShowNameField(true);
        setIsCustomerFound(false);
        toast.info("Novo cliente - informe o nome");
      } else {
        throw new Error(result.message || "Erro ao buscar cliente");
      }
    } catch (error) {
      console.error("Error searching customer:", error);
      toast.error(
        "Erro ao buscar cliente" +
          (error instanceof Error ? `: ${error.message}` : "")
      );
    } finally {
      setIsLoadingCustomer(false);
    }
  };

  // Populate visitors data whenever counts or responsible info changes
  useEffect(() => {
    const visitorsData: Visitors = {
      adults: adultsCount,
      childrens: childrensCount,
      responsible: {
        id: customerId,
        name: responsibleName,
        whatsapp: whatsappNumber,
      },
    };

    // Se não houver dados do responsável, limpar lista (opcional)
    if (!responsibleName && !whatsappNumber && !customerId) {
      setVisitors([]);
      return;
    }

    setVisitors([visitorsData]);
  }, [
    adultsCount,
    childrensCount,
    responsibleName,
    whatsappNumber,
    customerId,
  ]);

  const handleBooking = async () => {
    if (!selectedDate || !selectedTimeSlotId || !visitors.length) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!responsibleName || !whatsappNumber) {
      toast.error("Preencha os dados do responsável");
      return;
    }

    try {
      setIsBookingLoading(true);

      // Se não houver customerId, criar novo customer
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        const customerResponse = await fetch("/api/customer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: responsibleName,
            phone: whatsappNumber,
          }),
        });

        const customerResult = await customerResponse.json();

        if (!customerResponse.ok || !customerResult.success) {
          throw new Error(customerResult.message || "Erro ao criar cliente");
        }

        finalCustomerId = customerResult.data.id;
        setCustomerId(finalCustomerId);
      }

      const selectedSlot = timeSlots.find(
        (slot) => slot.id === selectedTimeSlotId
      );
      if (!selectedSlot) {
        toast.error("Slot selecionado inválido");
        return;
      }

      const totalPrice = adultsCount * 10 + childrensCount * 5;

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeSlotId: selectedTimeSlotId,
          customerId: finalCustomerId,
          date: selectedDate.toISOString().split("T")[0],
          time: selectedSlot.startTime,
          adults: adultsCount,
          children: childrensCount,
          totalPrice: totalPrice,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao criar agendamento");
      }

      toast.success("Agendamento realizado com sucesso!");

      // Limpar formulário
      setSelectedDate(null);
      setSelectedTimeSlotId("");
      setAdultsCount(1);
      setChildrensCount(0);
      setWhatsappNumber("");
      setResponsibleName("");
      setCustomerId("");
      setIsCustomerFound(false);
      setShowNameField(false);
    } catch (error) {
      console.error("Error creating booking:", error);
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar agendamento"
      );
    } finally {
      setIsBookingLoading(false);
    }
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
            <h2 className="text-3xl sm:text-4xl font-bold mb-3">
              Recanto Da Uva Fina
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
              <div>
                <span className="text-sm opacity-90 block mb-1">
                Valor por Adulto: (A partir de 10 anos)
                </span>
                <span className="text-3xl sm:text-4xl font-bold">R$ 10,00</span>
              </div>
              <div>
                <span className="text-sm opacity-90 block mb-1">
                Criança de 5 a 9 anos:
                </span>
                <span className="text-3xl sm:text-4xl font-bold">R$ 5,00</span>
              </div>
              </div>
              <div>
              <span className="text-sm opacity-90 block">
                Crianças até 4 anos: <strong>Grátis</strong>
              </span>
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
          <TimeSlot
            timeSlots={timeSlots}
            selectedTimeSlotId={selectedTimeSlotId}
            onSelectTimeSlot={setSelectedTimeSlotId}
            loading={timeSlotsLoading}
          />
        )}

        {/* Error message for time slots */}
        {timeSlotsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {timeSlotsError}
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
                  Nome do Responsável
                  {isCustomerFound && (
                    <span className="ml-2 text-xs text-primary">
                      (Cliente cadastrado)
                    </span>
                  )}
                </label>
                <Input
                  placeholder="Digite seu nome completo"
                  value={responsibleName}
                  onChange={(e) => setResponsibleName(e.target.value)}
                  disabled={isCustomerFound}
                  className={`h-12 bg-background border-border focus:border-primary transition-colors ${
                    isCustomerFound ? "opacity-75 cursor-not-allowed" : ""
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
            <div className="flex items-center justify-between">
              <span className="font-medium">Adultos</span>
              <div className="flex items-center gap-3">
                <Button
                  onClick={subtractAdults}
                  variant="outline"
                  className="h-10 w-10 p-0 grid place-items-center"
                >
                  <CircleMinus />
                </Button>
                <span className="w-12 text-center font-medium">
                  {adultsCount}
                </span>
                <Button
                  onClick={sumAdults}
                  variant="outline"
                  className="h-10 w-10 p-0 grid place-items-center"
                >
                  <Plus />
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Crianças</span>
              <div className="flex items-center gap-3">
                <Button
                  onClick={subtractChildrens}
                  variant="outline"
                  className="h-10 w-10 p-0 grid place-items-center"
                >
                  <CircleMinus />
                </Button>
                <span className="w-12 text-center font-medium">
                  {childrensCount}
                </span>
                <Button
                  onClick={sumChildrens}
                  variant="outline"
                  className="h-10 w-10 p-0 grid place-items-center"
                >
                  <Plus />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          className="w-full h-14 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
          onClick={handleBooking}
          disabled={
            isBookingLoading ||
            !selectedDate ||
            !selectedTimeSlotId ||
            !responsibleName ||
            !whatsappNumber
          }
        >
          {isBookingLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            "Confirmar Agendamento"
          )}
        </Button>
      </main>
    </div>
  );
};

export default Index;
