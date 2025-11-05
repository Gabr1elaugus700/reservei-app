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
}

export function useBookings(initialDate: Date = new Date()) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);

      const dateString = currentDate.toISOString().split("T")[0];
      const response = await fetch(`/api/bookings?date=${dateString}`);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error fetching bookings");
      }

      setBookings(result.data);
    } catch (err) {
      console.error("Error loading bookings:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

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

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const goToDate = (date: Date) => {
    setCurrentDate(date);
  };

  return {
    currentDate,
    bookings,
    loading,
    error,
    previousDay,
    nextDay,
    goToToday,
    goToDate,
  };
}
