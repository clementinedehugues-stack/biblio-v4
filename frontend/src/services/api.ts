import axios from 'axios';

// Determine API base URL safely for both localhost and LAN usage:
// - If VITE_API_BASE_URL is defined and not pointing to localhost while we are on localhost, use it.
// - If VITE_API_BASE_URL points to localhost but we're on a LAN hostname/IP, ignore it and use the current host with port 8000.
// - Otherwise fallback to current host with backend default port (8000).
function resolveApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const hostname = window.location.hostname;
  const isLocalHostName = hostname === 'localhost' || hostname === '127.0.0.1';
  const isEnvLocal = !!envUrl && /^(http:\/\/)?(localhost|127\.0\.0\.1)/.test(envUrl);

  if (envUrl && (!isEnvLocal || isLocalHostName)) {
    return envUrl;
  }
  return `${window.location.protocol}//${hostname}:8000`;
}

const resolvedBaseUrl = resolveApiBaseUrl();

// Exported getter so other modules (e.g., URL helpers) can reuse the same base
export function getResolvedApiBaseUrl(): string {
  return resolvedBaseUrl;
}

const api = axios.create({
  baseURL: resolvedBaseUrl,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
