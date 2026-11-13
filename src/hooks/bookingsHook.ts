import { useState, useEffect } from "react";

export interface Booking {
  id: string;
  name: string;
  phone: string;
  adults: number;
  children: number;
  time: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
  date: string;
  totalPrice: number;
  notes?: string;
  timeSlotId?: string;
  isCounter?: boolean;
}

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  totalCapacity: number;
  availableCapacity: number;
  isAvailable: boolean;
}

export interface SlotWithBookings {
  slot: TimeSlot;
  bookings: Booking[];
  totalRevenue: number;
}

export function useBookings(initialDate?: Date) {
  const [currentDate, setCurrentDate] = useState(() => {
    const date = initialDate || new Date();
    // Sempre criar com hora zerada (meia-noite local)
    date.setHours(0, 0, 0, 0);
    return date;
  });
  const [slotGroups, setSlotGroups] = useState<SlotWithBookings[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalDayRevenue, setTotalDayRevenue] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    loadBookingsAndSlots();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const loadBookingsAndSlots = async () => {
    try {
      console.log('[loadBookingsAndSlots] Iniciando...');
      setLoading(true); 
      setError(null);

      // Formatar data como YYYY-MM-DD sem conversão de timezone
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      
      // Buscar slots e bookings em paralelo
      const [slotsResponse, bookingsResponse] = await Promise.all([
        fetch(`/api/timeslots?date=${dateString}`),
        fetch(`/api/bookings?date=${dateString}`),
      ]);

      const slotsResult = await slotsResponse.json();
      const bookingsResult = await bookingsResponse.json();

      if (!slotsResponse.ok || !slotsResult.success) {
        throw new Error(slotsResult.message || "Error fetching slots");
      }

      if (!bookingsResponse.ok || !bookingsResult.success) {
        throw new Error(bookingsResult.message || "Error fetching bookings");
      }

      const slots: TimeSlot[] = slotsResult.data;
      const bookingsData: Booking[] = bookingsResult.data;

      console.log(`[loadBookingsAndSlots] Recebidos ${slots.length} slots da API`);
      console.log('[loadBookingsAndSlots] Slot IDs:', slots.map(s => s.id));

      // Detectar e remover duplicatas
      const ids = slots.map(s => s.id);
      const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
      if (duplicateIds.length > 0) {
        console.error('❌ API retornou slots duplicados:', duplicateIds);
      }

      // Deduplica slots por ID
      const uniqueSlots = slots.filter((slot, index, self) => 
        index === self.findIndex(s => s.id === slot.id)
      );

      if (uniqueSlots.length < slots.length) {
        console.warn(`🚨 ${slots.length - uniqueSlots.length} slots duplicados removidos da API`);
      }

      // Agrupar bookings por slot
      // IMPORTANTE: Mostrar todos os slots que têm agendamentos, mesmo que estejam cheios
      const grouped = uniqueSlots
        .map((slot) => {
          // CORREÇÃO: Associar por timeSlotId ao invés de startTime
          // para evitar que bookings apareçam em slots duplicados
          const slotBookings = bookingsData.filter(
            (booking) => {
              // Se booking tem timeSlotId, usar ele (método preferencial)
              if (booking.timeSlotId) {
                return booking.timeSlotId === slot.id;
              }
              // Fallback para bookings antigos sem timeSlotId
              return booking.time === slot.startTime;
            }
          );
          const revenue = slotBookings.reduce(
            (sum, booking) => sum + (booking.totalPrice || 0),
            0
          );
          return {
            slot,
            bookings: slotBookings,
            totalRevenue: revenue,
          };
        })
        // Filtrar apenas slots que têm agendamentos OU que têm capacidade disponível
        .filter((group) => group.bookings.length > 0 || group.slot.availableCapacity > 0);

      // Calcular faturamento total do dia
      const dayRevenue = grouped.reduce(
        (sum, group) => sum + group.totalRevenue,
        0
      );

      console.log(`[loadBookingsAndSlots] Setando ${grouped.length} grupos`);
      setSlotGroups(grouped);
      setBookings(bookingsData);
      setTotalDayRevenue(dayRevenue);

      // Se for o carregamento inicial e não houver slots, buscar próximo dia com slots
      if (isInitialLoad && slots.length === 0) {
        setIsInitialLoad(false);
        const nextDate = await findNextDayWithSlots("forward");
        if (nextDate) {
          setCurrentDate(nextDate);
        } else {
          // Tentar para trás se não encontrar para frente
          const prevDate = await findNextDayWithSlots("backward");
          if (prevDate) {
            setCurrentDate(prevDate);
          }
        }
      } else {
        setIsInitialLoad(false);
      }
    } catch (err) {
      console.error("Error loading bookings and slots:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setSlotGroups([]);
      setBookings([]);
      setTotalDayRevenue(0);
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const updateBooking = async (
    bookingId: string,
    updates: { adults?: number; children?: number; status?: string }
  ) => {
    try {
      console.log('[updateBooking] Atualizando booking:', bookingId, updates);
      
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error updating booking");
      }

      console.log('[updateBooking] Booking atualizado com sucesso, recarregando dados...');
      
      // Recarregar os dados
      await loadBookingsAndSlots();
      return result.data;
    } catch (err) {
      console.error("Error updating booking:", err);
      throw err;
    }
  };

  const deleteBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error deleting booking");
      }

      // Recarregar os dados
      await loadBookingsAndSlots();
      return result;
    } catch (err) {
      console.error("Error deleting booking:", err);
      throw err;
    }
  };

  const findNextDayWithSlots = async (direction: "forward" | "backward") => {
    // Criar nova data a partir de currentDate
    const testDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    let attempts = 0;
    const maxAttempts = 30; // Evitar loop infinito

    while (attempts < maxAttempts) {
      testDate.setDate(
        testDate.getDate() + (direction === "forward" ? 1 : -1)
      );
      attempts++;

      // Formatar data como YYYY-MM-DD sem conversão de timezone
      const year = testDate.getFullYear();
      const month = String(testDate.getMonth() + 1).padStart(2, '0');
      const day = String(testDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const response = await fetch(`/api/timeslots?date=${dateString}`);
      const result = await response.json();

      if (result.success && result.data.length > 0) {
        return testDate;
      }
    }

    return null;
  };

  const previousDay = async () => {
    const prevDate = await findNextDayWithSlots("backward");
    if (prevDate) {
      setCurrentDate(prevDate);
    } else {
      setError("Nenhum dia com slots disponíveis nos últimos 30 dias");
    }
  };

  const nextDay = async () => {
    const nextDate = await findNextDayWithSlots("forward");
    if (nextDate) {
      setCurrentDate(nextDate);
    } else {
      setError("Nenhum dia com slots disponíveis nos próximos 30 dias");
    }
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  const goToDate = (date: Date) => {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    setCurrentDate(newDate);
  };

  const updateSlotCapacity = async (slotId: string, newCapacity: number) => {
    try {
      console.log('[updateSlotCapacity] Atualizando capacidade do slot:', slotId, newCapacity);
      
      const response = await fetch(`/api/timeslots/${slotId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ totalCapacity: newCapacity }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Erro ao atualizar capacidade");
      }

      console.log('[updateSlotCapacity] Capacidade atualizada com sucesso, recarregando dados...');
      
      // Recarregar os dados
      await loadBookingsAndSlots();
      return result.data;
    } catch (err) {
      console.error("Error updating slot capacity:", err);
      throw err;
    }
  };

  return {
    currentDate,
    slotGroups,
    bookings,
    totalDayRevenue,
    loading,
    error,
    previousDay,
    nextDay,
    goToToday,
    goToDate,
    updateBooking,
    deleteBooking,
    updateSlotCapacity,
    refreshData: loadBookingsAndSlots,
  };
}
