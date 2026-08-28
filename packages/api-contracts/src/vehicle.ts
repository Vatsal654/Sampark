/**
 * Purpose: Owner-facing vehicle and tag lifecycle contracts.
 * Responsibilities: Create/update vehicle schemas, tag activation
 * request, and owner-safe view models.
 * Security: `plateNumber` is accepted here (owner-authenticated context
 * only) but is never echoed back in a public/scanner-facing schema — see
 * public.ts's publicTagViewSchema, which has no plate field at all.
 * Related: enums.ts, services/api vehicles + tags modules, apps/mobile.
 */
import { z } from 'zod';
import { VEHICLE_CATEGORIES } from './enums';

export const createVehicleSchema = z.object({
  displayLabel: z
    .string()
    .min(1)
    .max(60)
    .refine((v) => !/\d{4,}/.test(v), 'Display label must not resemble a plate number'),
  category: z.enum(VEHICLE_CATEGORIES),
  plateNumber: z.string().min(4).max(12),
  make: z.string().max(40).optional(),
  model: z.string().max(40).optional(),
  color: z.string().max(30).optional(),
});
export type CreateVehicle = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;

export const vehicleViewSchema = z.object({
  id: z.string().uuid(),
  displayLabel: z.string(),
  category: z.enum(VEHICLE_CATEGORIES),
  plateNumberMasked: z.string(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  color: z.string().nullable(),
  tagId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});
export type VehicleView = z.infer<typeof vehicleViewSchema>;

export const activateTagSchema = z.object({
  opaqueId: z.string().regex(/^[0-9a-f]{32}$/),
  activationPin: z.string().min(6).max(12),
  vehicleId: z.string().uuid(),
});
export type ActivateTag = z.infer<typeof activateTagSchema>;

export const reassignTagSchema = z.object({
  tagId: z.string().uuid(),
  newVehicleId: z.string().uuid(),
  reauthToken: z.string().min(20),
});
export type ReassignTag = z.infer<typeof reassignTagSchema>;
