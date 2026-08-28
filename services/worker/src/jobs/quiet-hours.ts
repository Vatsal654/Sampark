/**
 * Purpose: Decides whether "now" (owner's local Nepal time) falls inside
 * the owner's configured quiet hours window.
 * Responsibilities: Nepal Standard Time is a fixed UTC+05:45 offset (no
 * DST), so this is a pure offset calculation rather than a full timezone
 * library dependency.
 * Related: notification-delivery.processor.ts.
 */
const NEPAL_UTC_OFFSET_MINUTES = 5 * 60 + 45;

export function isWithinQuietHours(startHHMM: string | null, endHHMM: string | null, now: Date = new Date()): boolean {
  if (!startHHMM || !endHHMM) return false;

  const nepalMinutes = ((now.getUTCHours() * 60 + now.getUTCMinutes() + NEPAL_UTC_OFFSET_MINUTES) % (24 * 60) + 24 * 60) % (24 * 60);
  const [startH, startM] = startHHMM.split(':').map(Number);
  const [endH, endM] = endHHMM.split(':').map(Number);
  const startMinutes = (startH ?? 0) * 60 + (startM ?? 0);
  const endMinutes = (endH ?? 0) * 60 + (endM ?? 0);

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nepalMinutes >= startMinutes && nepalMinutes < endMinutes;
  }
  // Window wraps past midnight, e.g. 22:00 -> 07:00.
  return nepalMinutes >= startMinutes || nepalMinutes < endMinutes;
}
