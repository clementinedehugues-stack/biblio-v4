// Centralized API client for BIBLIO V4 (fetch-based)
// - Single base URL controlled by VITE_API_URL
// - Automatic JSON headers and JWT Authorization
// - Helper for uploads with progress

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
  || 'https://biblio-h6ji.onrender.com';

export function getApiUrl(): string {
  return API_URL;
}

function buildHeaders(options?: RequestInit): HeadersInit {
  const base: Record<string, string> = {};
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  // Only set JSON header if body is not FormData and header not already provided
  const isFormData = options && 'body' in options && options.body instanceof FormData;
  if (!isFormData) {
    base['Content-Type'] = 'application/json';
  }
  if (token) base['Authorization'] = `Bearer ${token}`;
  return { ...base, ...(options?.headers || {}) };
}

export async function apiFetch<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: buildHeaders(options),
  });
  if (!res.ok) {
    let errorText: string;
    try { errorText = await res.text(); } catch { errorText = 'Unknown error'; }
    console.error('API error', res.status, errorText);
    throw new Error(`API error: ${res.status} - ${errorText}`);
  }
  // Try to parse JSON; return void for 204
  if (res.status === 204) return undefined as unknown as T;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return (await res.json()) as T;
  // Fallback to text when not JSON
  return (await res.text()) as unknown as T;
}

// File uploads with optional progress using XHR (fetch lacks upload progress)
export function apiUpload<T = unknown>(endpoint: string, formData: FormData, opts?: { onProgress?: (percent: number) => void }): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}${endpoint}`, true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (!opts?.onProgress) return;
      if (e.lengthComputable && e.total > 0) {
        const percent = Math.round((e.loaded / e.total) * 100);
        opts.onProgress(percent);
      }
    };
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== 4) return;
      if (xhr.status >= 200 && xhr.status < 300) {
        try { resolve(JSON.parse(xhr.responseText) as T); }
        catch { resolve(xhr.responseText as unknown as T); }
      } else {
        const err = xhr.responseText || 'Upload failed';
        reject(new Error(`API error: ${xhr.status} - ${err}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
