export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    credentials: options.credentials ?? "include",
    headers: {
      "X-Namoz-Client": "app",
      ...(!(options.body instanceof FormData) && options.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...options.headers,
    },
    signal: options.signal ?? AbortSignal.timeout(25_000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.details?.join("\n") || data.error || `HTTP ${response.status}`,
    );
  return data;
}
export const send = (path: string, body: unknown, method = "POST") =>
  api(path, { method, body: JSON.stringify(body) });
export function mediaUrl(path: string) {
  return path.startsWith("/media/") ? `${API_BASE}${path}` : path;
}
