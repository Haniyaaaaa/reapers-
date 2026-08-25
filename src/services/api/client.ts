export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.reapers.local';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}
