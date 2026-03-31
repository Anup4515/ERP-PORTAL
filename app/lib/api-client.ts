"use client";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const json: ApiResponse<T> = await res.json();

    if (!res.ok) {
      return {
        error: json.error || json.message || `Request failed (${res.status})`,
      };
    }

    return json;
  } catch {
    return { error: "Network error. Please try again." };
  }
}

export function get<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: "GET" });
}

export function post<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>(url, { method: "POST", body: JSON.stringify(body) });
}

export function put<T>(url: string, body: unknown): Promise<ApiResponse<T>> {
  return request<T>(url, { method: "PUT", body: JSON.stringify(body) });
}

export function del<T>(url: string): Promise<ApiResponse<T>> {
  return request<T>(url, { method: "DELETE" });
}
