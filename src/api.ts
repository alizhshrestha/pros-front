import type {
  Master,
  Masters,
  Page,
  Transaction,
  TransactionFilters,
  TransactionInput,
} from './types';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code = '',
  ) {
    super(message);
  }
}
const base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/api${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success !== true)
      throw new ApiError(
        body?.error?.message || `Request failed (${response.status}). Please try again.`,
        response.status,
        body?.error?.code,
      );
    return body.data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      controller.signal.aborted
        ? 'The request timed out. Refresh history before retrying a save to avoid duplicates.'
        : 'Cannot reach the backend. Check that Spring Boot is running and try again.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
export const api = {
  masters: async (): Promise<Masters> => {
    const [categories, types, methods] = await Promise.all([
      request<Master[]>('/categories'),
      request<Master[]>('/transaction-types'),
      request<Master[]>('/payment-methods'),
    ]);
    return { categories, types, methods };
  },
  history: (page: number, size: number, filters: TransactionFilters = {}) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    Object.entries(filters).forEach(([key, value]) => {
      const normalized = value?.trim();

      if (normalized) {
        params.set(key, normalized);
      }
    });

    return request<Page<Transaction>>(`/transactions?${params.toString()}`);
  },
  get: (id: string) => request<Transaction>(`/transactions/${encodeURIComponent(id)}`),
  save: (data: TransactionInput, id?: string) =>
    request<Transaction>(`/transactions${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    request<{ _id: string; deleted: boolean }>(`/transactions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),
};
