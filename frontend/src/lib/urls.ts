import { getResolvedApiBaseUrl } from '@/services/api';

// Normalize an absolute or relative URL returned by the backend to be reachable
// from the current client (LAN-safe). This fixes cases where the backend stored
// http://localhost:8000/... by replacing the origin with the active API base.
export function normalizePublicUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  const base = getResolvedApiBaseUrl();

  // If it's already a relative path, just prefix with base
  if (input.startsWith('/')) {
    return `${base}${input}`;
  }

  try {
    const url = new URL(input);
    // If points to localhost/127.0.0.1, rewrite to current API base but keep path/query/hash
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      const target = new URL(base);
      return `${target.origin}${url.pathname}${url.search}${url.hash}`;
    }
    return input; // already a usable absolute URL
  } catch {
    // Not a valid absolute URL, return as-is
    return input;
  }
}
