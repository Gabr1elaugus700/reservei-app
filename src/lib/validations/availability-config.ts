import { z } from "zod";

export const availabilityConfigSchema = z.object({
  dayOfWeek: z.number().min(0).max(6).optional(), // 0 (Sunday) to 6 (Saturday)
  startTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  endTime: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM format
  slotDurationMinutes: z.number().min(1).default(30),
  capacityPerSlot: z.number().min(1).default(1),
  isException: z.boolean().default(false),
  isActive: z.boolean().default(true),
  date: z.string().optional(),
});

// Type inference para TypeScript
export type AvailabilityConfigInput = z.infer<typeof availabilityConfigSchema>;

// Schemas adicionais úteis
export const updateAvailabilityConfigSchema = availabilityConfigSchema.partial();
export type UpdateAvailabilityConfigInput = z.infer<typeof updateAvailabilityConfigSchema>;