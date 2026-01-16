/**
 * API Utility for authenticated requests
 *
 * Automatically includes the Supabase auth token in all requests.
 */

import { supabase } from '@/config/supabase'
import { API_BASE_URL } from '@/config/api'

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Makes an authenticated fetch request to the API
 *
 * @param endpoint - The API endpoint (e.g., '/api/metrics/overview')
 * @param options - Fetch options (method, body, etc.)
 * @returns The fetch response
 */
export async function apiFetch(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchOptions } = options

  const headers = new Headers(fetchOptions.headers)

  // Set default content type for JSON requests
  if (!headers.has('Content-Type') && fetchOptions.body) {
    headers.set('Content-Type', 'application/json')
  }

  // Add auth token if available and not skipped
  if (!skipAuth) {
    const { data: { session } } = await supabase.auth.getSession()

    if (session?.access_token) {
      headers.set('Authorization', `Bearer ${session.access_token}`)
    }
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`

  return fetch(url, {
    ...fetchOptions,
    headers,
  })
}

/**
 * Makes an authenticated GET request
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Makes an authenticated POST request
 */
export async function apiPost<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Makes an authenticated PUT request
 */
export async function apiPut<T>(endpoint: string, data?: unknown): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

/**
 * Makes an authenticated DELETE request
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}
