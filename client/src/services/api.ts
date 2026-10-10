import axios, { AxiosError } from 'axios';

export class ApiError extends Error {
  constructor(message: string, public errorCode: string, public status: number, public details?: unknown) { super(message); }
}

export const http = axios.create({ baseURL: '/api', withCredentials: true, timeout: 150_000 });

http.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ message?: string; errorCode?: string; details?: unknown }>) => {
    const status = error.response?.status ?? 0;
    const code = error.response?.data?.errorCode ?? (error.response ? 'HTTP_ERROR' : 'NETWORK_ERROR');
    const message = error.response?.data?.message ?? (error.code === 'ECONNABORTED' ? 'The request timed out' : 'Network error. Please check your connection.');
    if (status === 401 && ['SESSION_EXPIRED', 'UNAUTHENTICATED', 'INVALID_TOKEN'].includes(code)) {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { code } }));
    }
    return Promise.reject(new ApiError(message, code, status, error.response?.data?.details));
  },
);

export const isNetworkError = (e: unknown) => e instanceof ApiError && (e.errorCode === 'NETWORK_ERROR' || e.status >= 502);
export const errorMessage = (e: unknown, fallback = 'Something went wrong') => (e instanceof Error ? e.message : fallback);

/** All endpoints return { success, data }; these helpers unwrap `data`. */
export const get = async <T>(url: string, params?: object) => (await http.get<{ data: T }>(url, { params })).data.data;
export const post = async <T>(url: string, body?: unknown) => (await http.post<{ data: T }>(url, body)).data.data;
export const put = async <T>(url: string, body?: unknown) => (await http.put<{ data: T }>(url, body)).data.data;
export const patch = async <T>(url: string, body?: unknown) => (await http.patch<{ data: T }>(url, body)).data.data;
export const del = async <T>(url: string) => (await http.delete<{ data: T }>(url)).data.data;

export async function download(url: string, params: object, fallbackName: string) {
  const res = await http.get(url, { params, responseType: 'blob' });
  const name = /filename="?([^";]+)"?/.exec(String(res.headers['content-disposition'] ?? ''))?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href; a.download = name; a.click();
  URL.revokeObjectURL(href);
}
