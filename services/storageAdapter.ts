import { ApiResponse } from '../types';
import { getValidAccessToken, getRawRefreshToken, clearTokens, updateAccessToken } from './tokenManager';

const isLocal = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.startsWith('192.168.') ||
  window.location.hostname.startsWith('10.') ||
  window.location.hostname.startsWith('172.') ||
  window.location.port !== ''
);
const DEFAULT_API_URL = isLocal ? '/mail_api' : 'https://automation.ideas.edu.vn/mail_api';

const SIMULATE_DELAY = 400;
const CACHE_TTL = 5000; // 5 seconds

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const apiCache: { [key: string]: { data: any; timestamp: number } } = {};

type DeleteListener = (isDeleting: boolean) => void;
const deleteListeners: DeleteListener[] = [];
let deleteRequestCount = 0;

export const apiEvents = {
  onDeleteStateChange: (listener: DeleteListener) => {
    deleteListeners.push(listener);
    return () => {
      const idx = deleteListeners.indexOf(listener);
      if (idx > -1) deleteListeners.splice(idx, 1);
    };
  }
};

function updateDeleteState(isDeleting: boolean) {
  if (isDeleting) deleteRequestCount++;
  else deleteRequestCount = Math.max(0, deleteRequestCount - 1);
  const newState = deleteRequestCount > 0;
  deleteListeners.forEach(fn => fn(newState));
}

/**
 * Build headers and execute a single HTTP request.
 * Attaches Authorization: Bearer <token> if a valid token is available.
 * Also sends X-Admin-Token for Autoflow admin fallback (session-less dev).
 */
async function executeRequest(url: string, method: string, body?: any, signal?: AbortSignal): Promise<Response> {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};

  if (!isFormData && body !== undefined && body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  // ── PRIORITY 1: Bearer Token (AI Space JWT-style token auth) ─────────────
  try {
    const accessToken = await getValidAccessToken(DEFAULT_API_URL);
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  } catch { /* ignore — fallback to session cookie / X-Admin-Token */ }

  // ── PRIORITY 2: X-Admin-Token + X-Autoflow-Auth (Autoflow admin bypass) ──
  const isAuthCheckEndpoint = url.includes('ai_org_auth') &&
    (url.includes('action=check') || url.includes('action=auto_login_group_admin'));

  if (!isAuthCheckEndpoint) {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null'
      );
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
      const isAdminById = savedUser && (
        savedUser.id === 1 || savedUser.id === '1' ||
        savedUser.role === 'admin' || savedUser.is_admin ||
        savedUser.isAdmin || savedUser.admin === true ||
        savedUser.type === 'admin' || savedUser.user_type === 'admin'
      );

      if (isAdminById) {
        headers['X-Admin-Token'] = 'autoflow-admin-001';
      }

      if (isAuthenticated || isAdminById) {
        headers['X-Autoflow-Auth'] = '1';
      }

      if (isLocal) {
        console.log('[Auth Headers]', {
          hasUser: !!savedUser,
          userId: savedUser?.id,
          userRole: savedUser?.role,
          isAuthenticated,
          isAdminById,
          headers: Object.keys(headers)
        });
      }
    } catch { /* ignore */ }
  }

  return fetch(url, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    credentials: 'include',
    signal, // Forward AbortSignal for cancellation support
  });
}

/** Append admin_token query param as fallback when headers may be blocked by proxy */
function withAdminToken(url: string): string {
  try {
    const savedUser = JSON.parse(
      localStorage.getItem('user') || localStorage.getItem('currentUser') ||
      localStorage.getItem('authUser') || localStorage.getItem('admin_user') || 'null'
    );
    const isAdmin = savedUser && (
      savedUser.id === 1 || savedUser.id === '1' ||
      savedUser.role === 'admin' || savedUser.is_admin ||
      savedUser.isAdmin || savedUser.admin === true ||
      savedUser.type === 'admin' || savedUser.user_type === 'admin'
    );
    if (isAdmin) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}admin_token=autoflow-admin-001`;
    }
  } catch { /* ignore */ }
  return url;
}

async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options?: { signal?: AbortSignal }
): Promise<ApiResponse<T>> {
  if (method === 'GET') {
    const cached = apiCache[endpoint];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  } else {
    // Clear cache on mutations
    Object.keys(apiCache).forEach(key => delete apiCache[key]);
  }

  // Force production API URL
  const baseUrl = DEFAULT_API_URL;
  const isDeleteAction = method === 'DELETE' || (method === 'POST' && endpoint.includes('delete'));
  
  if (isDeleteAction) updateDeleteState(true);

  if (baseUrl) {
    try {
      // Split query params first
      const [pathString, queryString] = endpoint.split('?');

      const parts = pathString.split('/');
      let resource = parts[0];
      const id = parts[1];

      // Remove .php extension if already present in resource name
      let phpFile = resource.replace(/\.php$/, '');
      let finalQueryParams = queryString ? `?${queryString}` : '';

      if (resource === 'subscribers_bulk') {
        phpFile = 'subscribers';
        finalQueryParams = '?route=subscribers_bulk';
      } else {
        if (id) {
          finalQueryParams += (finalQueryParams ? '&' : '?') + `id=${id}`;
        }
      }

      const url = withAdminToken(`${baseUrl}/${phpFile}.php${finalQueryParams}`);

      if (isLocal) {
        console.log(`[API REQUEST] ${method} ${url}`);
      }

      // ── First attempt ──────────────────────────────────────────────────────
      let response = await executeRequest(url, method, body, options?.signal);

      // ── Auto-retry on 401: token expired mid-flight ───────────────────────
      if (response.status === 401) {
        try {
          const refreshToken = getRawRefreshToken();
          if (refreshToken) {
            const refreshRes = await fetch(`${baseUrl}/ai_org_auth.php?action=refresh_token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ refresh_token: refreshToken }),
              signal: options?.signal, // Also abort refresh if cancelled
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.success && refreshData.data?.access_token) {
                updateAccessToken(refreshData.data.access_token, refreshData.data.expires_in ?? 900);
                // Retry the original request with the fresh token
                response = await executeRequest(url, method, body);
              }
            } else {
              // Refresh token is expired — force logout
              clearTokens();
            }
          }
        } catch (refreshErr) {
          console.error('[API] Token refresh failed on 401 retry:', refreshErr);
        }
      }

      const text = await response.text();

      if (!response.ok) {
        return { success: false, data: {} as T, message: `Server error ${response.status}: ${text.substring(0, 100)}` };
      }

      if (!text || text.trim() === '') {
        return { success: true, data: {} as T };
      }

      try {
        const result = JSON.parse(text);
        if (method === 'GET' && result.success) {
          apiCache[endpoint] = { data: result, timestamp: Date.now() };
        }
        return result;
      } catch (e) {
        console.error('JSON Parse Error. Raw response:', text);
        return { success: false, data: {} as T, message: 'Invalid JSON response from server.' };
      }

    } catch (error) {
      console.error('API Request Failed', error);
      return { success: false, data: {} as T, message: 'Connection Error.' };
    } finally {
      if (isDeleteAction) updateDeleteState(false);
    }
  }

  try {
    // FALLBACK LOCALSTORAGE (Mock Data)
  await delay(SIMULATE_DELAY);
  const [pathString] = endpoint.split('?');
  const parts = pathString.split('/');
  const resource = parts[0];
  const id = parts[1];

  let storedData = JSON.parse(localStorage.getItem(`mailflow_${resource}`) || '[]');

  switch (method) {
    case 'GET':
      if (id) {
        const item = storedData.find((x: any) => x.id === id);
        return { success: !!item, data: item || null };
      }
      return { success: true, data: storedData as T };
    case 'POST':
      const newItem = { id: body.id || crypto.randomUUID(), createdAt: new Date().toISOString(), ...body };
      storedData = [newItem, ...storedData];
      localStorage.setItem(`mailflow_${resource}`, JSON.stringify(storedData));
      return { success: true, data: newItem as T };
    case 'PUT':
      if (!id) return { success: false, data: {} as T, message: 'ID required' };
      storedData = storedData.map((item: any) => item.id === id ? { ...item, ...body } : item);
      localStorage.setItem(`mailflow_${resource}`, JSON.stringify(storedData));
      return { success: true, data: { id, ...body } as T };
    case 'DELETE':
      storedData = storedData.filter((item: any) => item.id !== id);
      localStorage.setItem(`mailflow_${resource}`, JSON.stringify(storedData));
      return { success: true, data: { id } as T };
  }
  return { success: false, data: {} as T };
  } finally {
    if (isDeleteAction) updateDeleteState(false);
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, 'GET'),
  post: <T>(endpoint: string, data: any, options?: { signal?: AbortSignal }) => request<T>(endpoint, 'POST', data, options),
  put: <T>(endpoint: string, data: any) => request<T>(endpoint, 'PUT', data),
  delete: <T>(endpoint: string, data?: any) => request<T>(endpoint, 'DELETE', data),
  baseUrl: DEFAULT_API_URL
};
