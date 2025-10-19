
import * as Sentry from '@sentry/react-native';
import AuthService from '../src/api/authService';

// Simple in-memory cache for GET requests
const apiCache = new Map();
const CACHE_TTL = 1000 * 60 * 2; // 2 minutes

function getCacheKey(input, init) {
  const url = typeof input === 'string' ? input : input.url;
  const method = (init?.method || 'GET').toUpperCase();
  if (method !== 'GET') return null;
  // Exclude reports and emergency alert endpoints from caching
  if (/\/reports\//.test(url) || /emergency|alert/i.test(url)) return null;
  return url;
}

export async function apiFetch(input: RequestInfo, init: any = {}): Promise<Response> {
  const startTime = Date.now();
  const url = typeof input === 'string' ? input : input.url;
  const method = (init.method || 'GET').toUpperCase();

  console.log(`🚀 ApiClient Request [${method}]:`, {
    url: url,
    method: method,
    timestamp: new Date().toISOString()
  });

  if (init.body) {
    console.log(`   Body:`, typeof init.body === 'string' ? 
      (() => { try { return JSON.parse(init.body); } catch { return init.body; } })() : 
      init.body
    );
  }

  // Only cache GET requests
  const cacheKey = getCacheKey(input, init);
  if (cacheKey) {
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`💾 Cache HIT for ${url} (${Date.now() - startTime}ms)`);
      // Return a new Response object to avoid body stream issues
      return new Response(JSON.stringify(cached.data), cached.responseInit);
    } else if (cached) {
      apiCache.delete(cacheKey);
    }
  }

  try {
    const headers = new Headers(init.headers || {});
    const token = await AuthService.ensureFreshToken().catch(() => null);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (
      !headers.has('Content-Type') &&
      init.body &&
      !(init.body instanceof FormData)
    ) {
      headers.set('Content-Type', 'application/json');
    }

    const doFetch = () => fetch(input, { ...init, headers });

    let res = await doFetch();
    const duration = Date.now() - startTime;

    console.log(`📨 ApiClient Response [${method} ${url}]:`, {
      status: res.status,
      statusText: res.statusText,
      duration: `${duration}ms`,
      ok: res.ok,
      headers: Object.fromEntries(res.headers.entries())
    });

    if ((res.status === 401 || res.status === 403) && !init.skipAuthRetry) {
      console.log(`🔄 Attempting token refresh for ${url}`);
      const refreshed = await AuthService.refreshToken();
      if (refreshed) {
        console.log(`✅ Token refreshed, retrying request to ${url}`);
        const retryHeaders = new Headers(init.headers || {});
        retryHeaders.set('Authorization', `Bearer ${refreshed}`);
        if (
          !retryHeaders.has('Content-Type') &&
          init.body &&
          !(init.body instanceof FormData)
        ) {
          retryHeaders.set('Content-Type', 'application/json');
        }
        res = await fetch(input, {
          ...init,
          headers: retryHeaders,
          skipAuthRetry: true,
        });
        
        const retryDuration = Date.now() - startTime;
        console.log(`📨 ApiClient Retry Response [${method} ${url}]:`, {
          status: res.status,
          statusText: res.statusText,
          duration: `${retryDuration}ms`,
          ok: res.ok
        });
      } else {
        console.log(`❌ Token refresh failed, logging out user`);
        await AuthService.logout();
      }
    }

    // Add Sentry breadcrumb for response (success or HTTP error)
    Sentry.addBreadcrumb({
      category: 'network',
      message: `${method} ${url}`,
      data: {
        status: res.status,
        statusText: res.statusText,
        duration: Date.now() - startTime,
        url: url
      },
      level: res.ok ? 'info' : 'warning'
    });

    if (res.status === 401 || res.status === 403) {
      const err: any = new Error('Unauthorized');
      err.status = res.status;
      // Capture unauthorized errors in Sentry
      Sentry.captureException(err, {
        tags: {
          api_endpoint: url,
          http_status: res.status
        },
        extra: {
          method: method,
          duration: Date.now() - startTime
        }
      });
      throw err;
    }

    // Cache successful GET responses
    if (cacheKey && res.ok) {
      // Clone the response so we can read the body
      const data = await res.clone().json().catch(() => null);
      if (data !== null) {
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          responseInit: {
            status: res.status,
            statusText: res.statusText,
            headers: res.headers,
          },
        });
        // Return a new Response object with the cached data
        return new Response(JSON.stringify(data), {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }
    }

    return res;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error(`💥 ApiClient Error [${method} ${url}]:`, {
      error: error.message,
      duration: `${duration}ms`,
      type: error.constructor.name,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });

    // Capture network failures and other errors in Sentry
    Sentry.addBreadcrumb({
      category: 'network',
      message: `${method} ${url} - Failed`,
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime,
        url: url
      },
      level: 'error'
    });

    // Capture the exception with additional context
    Sentry.captureException(error, {
      tags: {
        api_endpoint: url,
        error_type: 'network_failure'
      },
      extra: {
        method: method,
        duration: Date.now() - startTime,
        requestBody: init.body ? 'Present' : 'None',
        hasAuth: init.headers?.Authorization ? 'Yes' : 'No'
      }
    });

    throw error;
  }
}