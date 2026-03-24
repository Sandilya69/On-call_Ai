// ============================================
// OnCall Maestro — Dashboard API Client
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("maestro_token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || error.message || `API Error: ${res.status}`);
  }

  return res.json();
}

// ── Incidents ────────────────────────
export const fetchIncidents = () => apiFetch<{ items: any[]; total: number }>("/incidents");
export const fetchIncident = (id: string) => apiFetch<any>(`/incidents/${id}`);
export const ackIncident = (id: string) => apiFetch<any>(`/incidents/${id}/ack`, { method: "PATCH" });
export const resolveIncident = (id: string, notes?: string) =>
  apiFetch<any>(`/incidents/${id}/resolve`, { method: "PATCH", body: JSON.stringify({ notes }) });

// ── Engineers ────────────────────────
export const fetchEngineers = () => apiFetch<{ items: any[] }>("/engineers");

// ── Rota ─────────────────────────────
export const fetchRota = (teamId?: string) =>
  apiFetch<{ items: any[] }>(`/rota${teamId ? `?teamId=${teamId}` : ""}`);

// ── Handovers ────────────────────────
export const fetchHandovers = () => apiFetch<{ items: any[] }>("/handovers");

// ── Audit Log ────────────────────────
export const fetchAuditLog = () => apiFetch<{ items: any[] }>("/audit-log");

// ── Health ───────────────────────────
export const fetchHealth = () => apiFetch<any>("/health");

// ── Availability ─────────────────────
export const fetchAvailability = () => apiFetch<{ items: any[] }>("/availability");

// ── Billing ──────────────────────────
export const fetchBillingPlans = () => apiFetch<{ plans: any[] }>("/billing/plans");
export const fetchBillingStatus = () => apiFetch<any>("/billing/status");

// ── Auth ─────────────────────────────
export function setToken(token: string) {
  localStorage.setItem("maestro_token", token);
}

export function clearToken() {
  localStorage.removeItem("maestro_token");
}

export function getToken(): string | null {
  return localStorage.getItem("maestro_token");
}
