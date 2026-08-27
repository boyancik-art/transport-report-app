const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

function corsHeaders(request) {
  const origin = request.headers.get('origin');
  return {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function json(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...corsHeaders(request) },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(request),
      });
    }

    if (request.method !== 'GET') {
      return json(request, { error: 'method_not_allowed' }, 405);
    }

    if (url.pathname === '/health') {
      return json(request, {
        status: 'ok',
        service: 'transport-report-app',
        timestamp: new Date().toISOString(),
      });
    }

    if (url.pathname === '/config') {
      if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
        return json(request, {
          error: 'runtime_configuration_unavailable',
        }, 503);
      }

      return json(request, {
        supabaseUrl: env.SUPABASE_URL,
        supabaseAnonKey: env.SUPABASE_ANON_KEY,
      });
    }

    if (url.pathname === '/') {
      return json(request, {
        name: 'Transport Report App',
        platform: 'Flutter for iOS and Android',
        health: '/health',
        configuration: '/config',
      });
    }

    return json(request, { error: 'not_found' }, 404);
  },
};
