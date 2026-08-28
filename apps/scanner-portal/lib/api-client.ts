/**
 * Purpose: Thin fetch wrapper for the scanner portal's calls to the
 * public `/public/tags/*` API surface.
 * Responsibilities: Centralizes the base URL and JSON handling so no
 * component builds a fetch URL by hand.
 * Security: Never attaches credentials/cookies (`credentials: 'omit'`) —
 * this portal has no session concept; every request is either
 * unauthenticated or carries an explicit short-lived token in its body.
 * Related: docs/API.md, services/api public-tag module.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'omit',
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export function getTag(opaqueId: string, signature: string) {
  return request<{
    opaqueId: string;
    status: string;
    vehicleDisplayLabel: string | null;
    vehicleCategory: string | null;
    callbackEnabled: boolean;
    emergencyEnabled: boolean;
  }>(`/public/tags/${opaqueId}?sig=${encodeURIComponent(signature)}`);
}

export function submitAlert(
  opaqueId: string,
  signature: string,
  body: { category: string; note?: string; location?: { latitude: number; longitude: number } },
) {
  return request<{ alertId: string; acknowledged: true }>(`/public/tags/${opaqueId}/alerts?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitEmergency(
  opaqueId: string,
  signature: string,
  body: { note?: string; location?: { latitude: number; longitude: number }; confirmedEmergency: true },
) {
  return request<{ alertId: string; acknowledged: true }>(`/public/tags/${opaqueId}/emergency?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function reportTag(opaqueId: string, signature: string, body: { reason: string; note?: string }) {
  return request<{ received: true }>(`/public/tags/${opaqueId}/report?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function requestCallOtp(opaqueId: string, signature: string, phoneE164: string) {
  return request<{ sent: true; retryAfterSeconds: number }>(`/public/tags/${opaqueId}/call/otp?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify({ phoneE164 }),
  });
}

export function verifyCallOtp(opaqueId: string, signature: string, phoneE164: string, code: string) {
  return request<{ scanSessionToken: string; expiresAt: string }>(`/public/tags/${opaqueId}/call/verify?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify({ phoneE164, code }),
  });
}

export function requestMaskedCall(opaqueId: string, signature: string, scanSessionToken: string) {
  return request<{ callSessionId: string; status: string; expiresAt: string }>(`/public/tags/${opaqueId}/call/request?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify({ scanSessionToken, consentToConnect: true }),
  });
}
