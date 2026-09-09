import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Rate limiting
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIP)) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
    );
  }

  try {
    // Verify admin auth — validate JWT and enforce admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate the JWT by creating a client with the user's token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify admin role using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const CLOUDFLARE_ZONE_ID = Deno.env.get('CLOUDFLARE_ZONE_ID');
    const CLOUDFLARE_API_TOKEN = Deno.env.get('CLOUDFLARE_API_TOKEN');

    if (!CLOUDFLARE_ZONE_ID || !CLOUDFLARE_API_TOKEN) {
      return new Response(JSON.stringify({ error: 'Cloudflare credentials not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { period = '24h' } = await req.json().catch(() => ({}));

    // Validate period input
    if (!['24h', '7d', '30d'].includes(period)) {
      return new Response(JSON.stringify({ error: 'Invalid period. Use 24h, 7d, or 30d.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate date range
    const now = new Date();
    let since: Date;
    switch (period) {
      case '7d': since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    }

    const sinceStr = since.toISOString();
    const untilStr = now.toISOString();

    // Fetch traffic analytics from Cloudflare GraphQL API
    const trafficQuery = {
      query: `query {
        viewer {
          zones(filter: { zoneTag: "${CLOUDFLARE_ZONE_ID}" }) {
            httpRequests1dGroups(
              limit: 100
              filter: { date_geq: "${sinceStr.split('T')[0]}", date_leq: "${untilStr.split('T')[0]}" }
            ) {
              dimensions { date }
              sum {
                requests
                threats
                pageViews
                bytes
                cachedBytes
                cachedRequests
                encryptedRequests
                countryMap {
                  clientCountryName
                  requests
                  threats
                }
                browserMap {
                  uaBrowserFamily
                  pageViews
                }
                responseStatusMap {
                  edgeResponseStatus
                  requests
                }
              }
              uniq { uniques }
            }
          }
        }
      }`
    };

    const cfResponse = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(trafficQuery),
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || cfData.errors?.length) {
      console.error('Cloudflare API error:', JSON.stringify(cfData));
      return new Response(JSON.stringify({ 
        error: 'Cloudflare API error', 
        details: cfData.errors || cfData 
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const zones = cfData.data?.viewer?.zones;
    if (!zones || zones.length === 0) {
      return new Response(JSON.stringify({ error: 'No zone data found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const zone = zones[0];
    const httpGroups = zone.httpRequests1dGroups || [];

    // Try fetching firewall data separately (may fail if token lacks permission)
    let firewallEvents: any[] = [];
    try {
      const fwQuery = {
        query: `query {
          viewer {
            zones(filter: { zoneTag: "${CLOUDFLARE_ZONE_ID}" }) {
              firewallEventsAdaptiveGroups(
                limit: 20
                filter: { datetime_geq: "${sinceStr}", datetime_leq: "${untilStr}" }
                orderBy: [count_DESC]
              ) {
                count
                dimensions {
                  action
                  clientCountryName
                  clientIP
                  ruleId
                  source
                }
              }
            }
          }
        }`
      };

      const fwResponse = await fetch('https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fwQuery),
      });

      const fwData = await fwResponse.json();
      if (fwResponse.ok && !fwData.errors?.length) {
        firewallEvents = fwData.data?.viewer?.zones?.[0]?.firewallEventsAdaptiveGroups || [];
      } else {
        console.log('Firewall data unavailable (token may lack permission), skipping.');
      }
    } catch (e) {
      console.log('Firewall query failed, skipping:', e);
    }

    // Aggregate totals
    let totalRequests = 0, totalThreats = 0, totalPageViews = 0;
    let totalBytes = 0, totalCachedBytes = 0, totalUniques = 0;
    const dailyData: any[] = [];
    const countryMap: Record<string, { requests: number; threats: number }> = {};
    const browserMap: Record<string, number> = {};
    const statusMap: Record<string, number> = {};

    for (const group of httpGroups) {
      const s = group.sum || {};
      totalRequests += s.requests || 0;
      totalThreats += s.threats || 0;
      totalPageViews += s.pageViews || 0;
      totalBytes += s.bytes || 0;
      totalCachedBytes += s.cachedBytes || 0;
      totalUniques += group.uniq?.uniques || 0;

      if (group.dimensions?.date) {
        dailyData.push({
          date: group.dimensions.date,
          requests: s.requests || 0,
          threats: s.threats || 0,
          pageViews: s.pageViews || 0,
          uniques: group.uniq?.uniques || 0,
        });
      }

      for (const c of s.countryMap || []) {
        if (!countryMap[c.clientCountryName]) countryMap[c.clientCountryName] = { requests: 0, threats: 0 };
        countryMap[c.clientCountryName].requests += c.requests || 0;
        countryMap[c.clientCountryName].threats += c.threats || 0;
      }

      for (const b of s.browserMap || []) {
        browserMap[b.uaBrowserFamily] = (browserMap[b.uaBrowserFamily] || 0) + (b.pageViews || 0);
      }

      for (const r of s.responseStatusMap || []) {
        const key = String(r.edgeResponseStatus);
        statusMap[key] = (statusMap[key] || 0) + (r.requests || 0);
      }
    }

    // Process firewall events
    const threatActions: Record<string, number> = {};
    const threatSources: Record<string, number> = {};
    const threatIPs: { ip: string; country: string; count: number }[] = [];

    for (const event of firewallEvents) {
      const action = event.dimensions?.action || 'unknown';
      threatActions[action] = (threatActions[action] || 0) + (event.count || 0);
      
      const source = event.dimensions?.source || 'unknown';
      threatSources[source] = (threatSources[source] || 0) + (event.count || 0);

      if (event.dimensions?.clientIP) {
        threatIPs.push({
          ip: event.dimensions.clientIP,
          country: event.dimensions.clientCountryName || 'Unknown',
          count: event.count || 0,
        });
      }
    }

    const result = {
      summary: {
        totalRequests,
        totalThreats,
        totalPageViews,
        totalUniques,
        totalBandwidth: totalBytes,
        cachedBandwidth: totalCachedBytes,
        cacheRate: totalBytes > 0 ? ((totalCachedBytes / totalBytes) * 100).toFixed(1) : '0',
      },
      dailyData: dailyData.sort((a, b) => a.date.localeCompare(b.date)),
      topCountries: Object.entries(countryMap)
        .map(([name, data]) => ({ country: name, ...data }))
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 10),
      browsers: Object.entries(browserMap)
        .map(([name, views]) => ({ browser: name, pageViews: views }))
        .sort((a, b) => b.pageViews - a.pageViews)
        .slice(0, 8),
      statusCodes: Object.entries(statusMap)
        .map(([code, count]) => ({ status: code, count }))
        .sort((a, b) => b.count - a.count),
      threats: {
        actions: threatActions,
        sources: threatSources,
        topIPs: threatIPs.slice(0, 10),
      },
      period,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
