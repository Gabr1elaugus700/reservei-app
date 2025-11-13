import { z } from "zod";

/**
 * Schema para período de pausa dentro de um dia
 */
export const breakPeriodSchema = z.object({
  id: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
});

/**
 * Schema principal para configuração de disponibilidade
 * Usado tanto no front quanto no back
 */
export const availabilityConfigSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 (Domingo) a 6 (Sábado)
  date: z.string().optional(), // Data específica (YYYY-MM-DD) para exceções
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato deve ser HH:MM"),
  slotDurationMinutes: z.number().min(1).default(30),
  capacityPerSlot: z.number().min(1).default(1),
  isException: z.boolean().default(false),
  isActive: z.boolean().default(true),
  breakPeriods: z.array(breakPeriodSchema).optional().default([]),
}).refine(
  (data) => {
    // Deve ter dayOfWeek OU date, não ambos
    return (data.dayOfWeek !== undefined) !== (data.date !== undefined);
  },
  {
    message: "Deve especificar dayOfWeek (config semanal) OU date (exceção)",
  }
).refine(
  (data) => {
    // Validar que endTime é depois de startTime
    const [startHour, startMin] = data.startTime.split(':').map(Number);
    const [endHour, endMin] = data.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes > startMinutes;
  },
  {
    message: "Horário de fim deve ser depois do horário de início",
  }
);

/**
 * Schema para salvar múltiplas configurações de uma vez
 */
export const bulkAvailabilityConfigSchema = z.object({
  configs: z.array(availabilityConfigSchema).min(1, "Deve haver pelo menos uma configuração"),
});

/**
 * Schema para atualização parcial
 */
export const updateAvailabilityConfigSchema = availabilityConfigSchema.partial();

/**
 * Type inference para TypeScript
 */
export type BreakPeriodInput = z.infer<typeof breakPeriodSchema>;
export type AvailabilityConfigInput = z.infer<typeof availabilityConfigSchema>;
export type BulkAvailabilityConfigInput = z.infer<typeof bulkAvailabilityConfigSchema>;
export type UpdateAvailabilityConfigInput = z.infer<typeof updateAvailabilityConfigSchema>;
