// Lightweight typed fetch wrapper for the CRM frontend.
// All requests use relative URLs + credentials (cookies) so the httpOnly
// session cookie is sent automatically.

export class ApiError extends Error {
  status: number
  details?: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

async function request<T>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...init } = options ?? {}
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
  let body = init.body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }
  const res = await fetch(url, {
    ...init,
    headers,
    body,
    credentials: 'same-origin',
    cache: 'no-store',
  })
  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) {
    const message =
      (data && typeof data === 'object' && 'error' in data && String((data as Record<string, unknown>).error)) ||
      res.statusText ||
      'Request failed'
    throw new ApiError(message, res.status, (data as Record<string, unknown>)?.details)
  }
  return data as T
}

export const api = {
  get: <T>(url: string, init?: RequestInit) => request<T>(url, { ...init, method: 'GET' }),
  post: <T>(url: string, json?: unknown, init?: RequestInit) =>
    request<T>(url, { ...init, method: 'POST', json }),
  patch: <T>(url: string, json?: unknown, init?: RequestInit) =>
    request<T>(url, { ...init, method: 'PATCH', json }),
  put: <T>(url: string, json?: unknown, init?: RequestInit) =>
    request<T>(url, { ...init, method: 'PUT', json }),
  del: <T>(url: string, init?: RequestInit) => request<T>(url, { ...init, method: 'DELETE' }),
}
