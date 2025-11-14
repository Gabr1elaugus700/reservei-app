import { useState, useEffect } from "react";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  availableCapacity: number;
  date: Date;
}

export function useTimeSlots(selectedDate: Date | null) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) {
      setTimeSlots([]);
      return;
    }

    loadTimeSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const loadTimeSlots = async () => {
    if (!selectedDate) return;

    try {
      setLoading(true);
      setError(null);

      const dateString = selectedDate.toISOString().split("T")[0];
      const response = await fetch(`/api/timeslots?date=${dateString}`);

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Error fetching time slots");
      }

      setTimeSlots(result.data);
    } catch (err) {
      console.error("Error loading time slots:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    timeSlots,
    loading,
    error,
    reload: loadTimeSlots,
  };
}
