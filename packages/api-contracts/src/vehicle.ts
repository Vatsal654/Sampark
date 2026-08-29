/**
 * Purpose: Owner-facing vehicle and tag lifecycle contracts.
 * Responsibilities: Create/update vehicle schemas, tag activation
 * request, and owner-safe view models.
 * Security: `plateNumber` is accepted on write AND returned in full on
 * `vehicleViewSchema` (owner-authenticated context only, ownership
 * enforced server-side in VehiclesService) — it is never echoed back in
 * a public/scanner-facing schema — see public.ts's publicTagViewSchema,
 * which has no plate field, masked or otherwise, at all.
 * Related: enums.ts, services/api vehicles + tags modules, apps/mobile.
 */
import { z } from 'zod';
import { FUEL_TYPES, TAG_STATUSES, VEHICLE_CATEGORIES } from './enums';

const currentYear = new Date().getFullYear();

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
  variant: z.string().max(40).optional(),
  manufacturingYear: z.number().int().min(1980).max(currentYear + 1).optional(),
  fuelType: z.enum(FUEL_TYPES).optional(),
  color: z.string().max(30).optional(),
  vinNumber: z.string().min(4).max(32).optional(),
  engineNumber: z.string().min(2).max(32).optional(),
});
export type CreateVehicle = z.infer<typeof createVehicleSchema>;

export const updateVehicleSchema = createVehicleSchema.partial();
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;

export const vehicleViewSchema = z.object({
  id: z.string().uuid(),
  displayLabel: z.string(),
  category: z.enum(VEHICLE_CATEGORIES),
  /** Full plate — safe here because this schema is owner-authenticated only (never returned by
   * any scanner-facing endpoint). Kept alongside plateNumberMasked for callers (e.g. a list view)
   * that prefer the shorter masked form for display. */
  plateNumber: z.string(),
  plateNumberMasked: z.string(),
  make: z.string().nullable(),
  model: z.string().nullable(),
  variant: z.string().nullable(),
  manufacturingYear: z.number().int().nullable(),
  fuelType: z.enum(FUEL_TYPES).nullable(),
  color: z.string().nullable(),
  vinNumber: z.string().nullable(),
  engineNumber: z.string().nullable(),
  tagId: z.string().uuid().nullable(),
  tagStatus: z.enum(TAG_STATUSES).nullable(),
  createdAt: z.string().datetime(),
});
export type VehicleView = z.infer<typeof vehicleViewSchema>;

export const activateTagSchema = z.object({
  opaqueId: z.string().regex(/^[0-9a-f]{32}$/),
  activationPin: z.string().min(6).max(12),
  vehicleId: z.string().uuid(),
  /** Set when this activation is replacing a tag the owner already reported lost — see
   * TagsService.activate()'s validation. Never a substitute for this tag's own PIN. */
  replacesTagId: z.string().uuid().optional(),
});
export type ActivateTag = z.infer<typeof activateTagSchema>;

export const reassignTagSchema = z.object({
  tagId: z.string().uuid(),
  newVehicleId: z.string().uuid(),
  reauthToken: z.string().min(20),
});
export type ReassignTag = z.infer<typeof reassignTagSchema>;
