// Backward-compatible re-exports to the new centralized API client
// Migrate imports from '@/services/api' without breaking
export { API_URL, apiFetch, apiUpload, getApiUrl } from '@/lib/api';
