import { API_BASE_URL, DEMO_MODE } from '@/utils/config';
import { seedDemoData } from '@/utils/demoSeed';
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

const SIMULATE_DELAY = 0;
const CACHE_TTL = 60000; // 60 seconds — [PERF] increased for instant tab switching

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
  // [ISOLATION] Skip token refresh network call entirely in DEMO_MODE.
  // Demo environment has no production backend — attempting a token refresh
  // would make an outbound request to the production server, leaking session data.
  if (!DEMO_MODE) {
    try {
      const accessToken = await getValidAccessToken(API_BASE_URL);
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    } catch { /* ignore — fallback to session cookie / X-Admin-Token */ }
  }

  // ── PRIORITY 2: X-Admin-Token + X-Autoflow-Auth (Autoflow admin bypass) ──
  const isAuthCheckEndpoint = url.includes('ai_org_auth') &&
    (url.includes('action=check') || url.includes('action=auto_login_group_admin'));

  if (!isAuthCheckEndpoint) {
    try {
      const savedUser = JSON.parse(
        localStorage.getItem('user') || localStorage.getItem('currentUser') || 'null'
      );
      const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

      // Check admin by id=1 OR by role field (secondary admins have role='admin' but id!=1)
      const isAdminById = savedUser && (savedUser.id === 1 || savedUser.id === '1');
      const isAdminByRole = savedUser && (
        savedUser.role === 'admin' ||
        savedUser.role === 'super_admin' ||
        savedUser.is_admin == 1 ||
        savedUser.isAdmin === true
      );
      const isAnyAdmin = isAdminById || isAdminByRole;

      // [FIX] Send X-Admin-Token for ALL admins (not just id=1).
      // db_connect.php PRIORITY 4 maps any valid X-Admin-Token to admin-001 session,
      // so secondary admins no longer get 401 on protected endpoints.
      if (isAnyAdmin) {
        headers['X-Admin-Token'] = 'autoflow-admin-001';
      }

      // Send X-Autoflow-Auth for any authenticated user (even non-admin roles)
      // so db_connect.php PRIORITY 3 can set session from $_SESSION['role']
      if (isAuthenticated || isAnyAdmin) {
        headers['X-Autoflow-Auth'] = '1';
      }

      if (isLocal && savedUser && savedUser.id) {
        headers['X-Local-Dev-User'] = String(savedUser.id);
      }

      if (isLocal && isAnyAdmin) {
        console.log('[Auth] Admin headers active for user:', savedUser?.id, 'role:', savedUser?.role);
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

// [SECURITY FIX] withAdminToken() was removed — it appended admin_token as a URL query param.
// URL params appear in server/nginx/CDN/proxy access logs → token exposure risk.
// The X-Admin-Token header in executeRequest() already handles admin bypass securely.

async function request<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  options?: { signal?: AbortSignal }
): Promise<ApiResponse<T>> {
  if (DEMO_MODE && typeof window !== 'undefined' && !(window as any).__demo_seeded) {
      // Clear ALL stale demo caches so fresh data always loads on F5 / Page Refresh
      ['mailflow_flows','mailflow_campaigns','mailflow_templates','mailflow_subscribers',
       'mailflow_lists','mailflow_tags','mailflow_segments','mailflow_vouchers',
       'mailflow_surveys','demo_version'].forEach(k => localStorage.removeItem(k));
      await seedDemoData();
      (window as any).__demo_seeded = true;
  }

  if (method === 'GET') {
    const cached = apiCache[endpoint];
    const isStaticEndpoint = typeof endpoint === 'string' && (endpoint.startsWith('tags') || endpoint.startsWith('segments') || endpoint.startsWith('flows') || endpoint.startsWith('integrations') || endpoint.startsWith('lists') || endpoint.startsWith('templates') || endpoint.startsWith('settings'));
    
    // [PERF] Tăng TTL cho báo cáo/danh sách lên 15s. Dữ liệu hạ tầng tĩnh là 60s
    // Cache cực kỳ an toàn vì hàm này tự động flush TOÀN BỘ cache khi có bất kỳ POST/PUT/DELETE
    const ttl = isStaticEndpoint ? 60000 : 15000;
    
    // Bỏ qua Bộ nhớ đệm nếu Endpoint chứa các tham số Bộ Lọc CÓ GIÁ TRỊ (search, sort khác newest, v.v)
    const hasActiveFilters = 
      /search=[^&]+/.test(endpoint) ||
      (/sort=[^&]+/.test(endpoint) && !endpoint.includes('sort=newest')) || 
      (/status=[^&]+/.test(endpoint) && !endpoint.includes('status=all')) ||
      /tag=[^&]+/.test(endpoint);
      
    if (!hasActiveFilters && cached && Date.now() - cached.timestamp < ttl) {
      if (isLocal) console.log(`[⚡ API CACHE] ${endpoint} - Served instantly`);
      return cached.data;
    }
  } else {
    // [FIX P38-SA] SMART cache invalidation: only clear keys matching the mutated resource.
    // Old behavior: full wipe on every POST/PUT/DELETE (tags, flows, campaigns all cleared
    // just because user updated a subscriber — causing N unnecessary API round-trips).
    // New: extract resource prefix from endpoint and only clear matching cache entries.
    const mutatedResource = endpoint.split('?')[0].split('/')[0].replace(/\.php$/, '');
    const relatedPrefixes: Record<string, string[]> = {
      subscribers: ['subscribers', 'segments', 'audience_report', 'overview_stats'],
      campaigns:   ['campaigns', 'overview_stats'],
      flows:       ['flows', 'overview_stats'],
      segments:    ['segments', 'subscribers'],
      lists:       ['lists', 'subscribers'],
      tags:        ['tags', 'subscribers'],
      templates:   ['templates'],
      vouchers:    ['vouchers'],
      surveys:     ['surveys'],
      // [FIX CACHE-GAP] purchase_events and custom_events were missing — Flows page
      // loads both via api.get() and caches them for 60s. After creating/updating an event,
      // the old cached list was shown until TTL expired. Also invalidate 'flows' since
      // flow triggers reference these event IDs.
      purchase_events: ['purchase_events', 'flows'],
      custom_events:   ['custom_events', 'flows'],
      // forms are loaded by both Flows and Templates — invalidate all 3 on change
      forms:           ['forms', 'flows', 'templates'],
    };
    const toInvalidate = relatedPrefixes[mutatedResource] ?? [mutatedResource];
    Object.keys(apiCache).forEach(key => {
      if (toInvalidate.some(prefix => key.startsWith(prefix))) {
        delete apiCache[key];
      }
    });
    if (isLocal) console.log(`[⚡ CACHE] Invalidated prefixes: [${toInvalidate.join(', ')}] after ${method} on ${mutatedResource}`);
  }

  // Force production API URL
  const baseUrl = DEMO_MODE ? null : API_BASE_URL;
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

      const url = `${API_BASE_URL}/${phpFile}.php${finalQueryParams}`;

      // ── First attempt ──────────────────────────────────────────────────────
      const startTime = performance.now();
      let response = await executeRequest(url, method, body, options?.signal);
      const latency = ((performance.now() - startTime) / 1000).toFixed(2);

      if (isLocal) {
        console.log(`[⚡ API ${method}] ${url} - Took ${latency}s`);
      }

      // ── Auto-retry on 401: token expired mid-flight ───────────────────────
      if (response.status === 401) {
        try {
          const refreshToken = getRawRefreshToken();
          if (refreshToken) {
            const refreshRes = await fetch(`${API_BASE_URL}/ai_org_auth.php?action=refresh_token`, {
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
                response = await executeRequest(url, method, body, options?.signal);
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

  // [ISOLATION] DEMO_MODE: serve from localStorage + demoMocks only.
  // NEVER reached in production — if baseUrl is set (production), all
  // errors are returned as-is; mock data is never substituted for real failures.
  if (!DEMO_MODE) {
    // Production had an error (baseUrl was set but something went wrong before reaching here).
    // Return connection error — do NOT fall through to mock data.
    if (isDeleteAction) updateDeleteState(false);
    return { success: false, data: {} as T, message: 'Connection Error.' };
  }

  try {
    // DEMO MODE: Serve from localStorage + dynamic mocks
    await delay(SIMULATE_DELAY);
    const [pathString] = endpoint.split('?');
    const parts = pathString.split('/');
    const resource = parts[0];
    const id = parts[1];

    let storedDataRaw = localStorage.getItem(`mailflow_${resource}`);
    let storedData = storedDataRaw ? JSON.parse(storedDataRaw) : [];

    // --- INTERCEPT DYNAMIC REPORTS ---
    const { getDynamicReport } = await import('../utils/demoMocks');
    const dynamicReport = getDynamicReport(resource, endpoint, id);
    if (dynamicReport) {
        return { success: true, data: dynamicReport as T };
    }
  // ---------------------------------

  switch (method) {
    case 'GET':
      if (id) {
        const item = Array.isArray(storedData) ? storedData.find((x: any) => x.id === id) : null;
        return { success: !!item, data: item || null };
      }
      return { success: true, data: storedData as T };
    case 'POST':
      const targetId = id || (body && body.id);
      if (targetId) {
          const index = storedData.findIndex((x: any) => x.id === targetId);
          if (index >= 0) {
              storedData[index] = { ...storedData[index], ...body };
              localStorage.setItem(`mailflow_${resource}`, JSON.stringify(storedData));
              return { success: true, data: storedData[index] as T };
          }
      }
      const newItem = { id: targetId || crypto.randomUUID(), createdAt: new Date().toISOString(), ...body };
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

export const clearApiCache = (prefix?: string) => {
  if (prefix) {
    Object.keys(apiCache).forEach(k => { if (k.startsWith(prefix)) delete apiCache[k]; });
  } else {
    Object.keys(apiCache).forEach(k => delete apiCache[k]);
  }
};

// [PERF UX-3] Tab Visibility Cache Invalidation
// When user returns to this tab after being away >30s, purge stale cache entries
// so they see fresh data instead of up-to-60s stale data.
if (typeof document !== 'undefined') {
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      hiddenAt = Date.now();
    } else if (hiddenAt > 0) {
      const awayMs = Date.now() - hiddenAt;
      if (awayMs > 30000) {
        // Purge cache entries older than the time we were away
        const staleThreshold = Date.now() - awayMs;
        Object.keys(apiCache).forEach(key => {
          if (apiCache[key].timestamp < staleThreshold) {
            delete apiCache[key];
          }
        });
      }
      hiddenAt = 0;
    }
  });
}

export const api = {
  get: <T>(endpoint: string, options?: { signal?: AbortSignal }) => request<T>(endpoint, 'GET', undefined, options),
  post: <T>(endpoint: string, data: any, options?: { signal?: AbortSignal }) => request<T>(endpoint, 'POST', data, options),
  put: <T>(endpoint: string, data: any) => request<T>(endpoint, 'PUT', data),
  delete: <T>(endpoint: string, data?: any) => request<T>(endpoint, 'DELETE', data),
  baseUrl: API_BASE_URL,
  clearCache: clearApiCache
};
