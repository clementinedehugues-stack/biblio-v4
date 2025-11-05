import { getApiUrl } from '@/lib/api';

// Normalize an absolute or relative URL returned by the backend to be reachable
// from the current client (LAN-safe). This fixes cases where the backend stored
// absolute URLs with a different origin by replacing the origin with the active API base.
export function normalizePublicUrl(input?: string | null): string | undefined {
  if (!input) return undefined;
  const base = getApiUrl();
  // If it's a relative path, prefix with API base; otherwise return as-is.
  if (input.startsWith('/')) return `${base}${input}`;
  try {
    // Absolute URL already; keep as-is
    void new URL(input);
    return input;
  } catch {
    return input;
  }
}
