import type { TokenResponse } from "../types/api";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

type JsonBody = Record<string, unknown> | Array<unknown>;
type ApiOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | JsonBody | null;
};

export function getToken(): string | null {
  return localStorage.getItem("kultur_token");
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem("kultur_token", token);
  } else {
    localStorage.removeItem("kultur_token");
  }
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let body: BodyInit | null | undefined = options.body as BodyInit | null | undefined;
  if (body && !(body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers, body });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? "تعذر تنفيذ الطلب");
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const body = new URLSearchParams({ username: email, password });
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail ?? "بيانات الدخول غير صحيحة");
  }
  return response.json() as Promise<TokenResponse>;
}
