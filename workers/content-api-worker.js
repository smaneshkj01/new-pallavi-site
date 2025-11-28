/**
 * Cloudflare Worker for New Pallavi Boat Club Content API
 * 
 * This worker handles:
 * - GET /content - Retrieve all content from KV store
 * - POST /content/update - Update specific section in KV store
 * 
 * Required KV Namespace Binding: CONTENT_STORE
 */

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders
      });
    }

    try {
      // GET /content - Retrieve all content
      if (url.pathname === '/content' && request.method === 'GET') {
          // Allow short CDN caching for content GETs; adjust as needed.
          const res = await handleGetContent(env);
          // If handleGetContent returned a Response, clone and add cache headers
          if (res instanceof Response) {
            const headers = new Headers(res.headers);
            // short TTL for client, longer for CDNs
            headers.set('Cache-Control', 'public, max-age=60, s-maxage=300');
            return new Response(res.body, { status: res.status, headers });
          }
          return res;
      }

      // POST /content/update - Update specific section
      if (url.pathname === '/content/update' && request.method === 'POST') {
        return await handleUpdateContent(request, env);
      }

      // 404 for unknown routes
      return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ 
        error: 'Internal Server Error',
        message: error.message 
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }
  }
};

/**
 * Handle GET /content
 * Returns all stored content from KV
 */
async function handleGetContent(env) {
  try {
    // Get all sections from KV
    const sections = ['general', 'about', 'events', 'gallery', 'team'];
    const content = {};

    for (const section of sections) {
      const data = await env.CONTENT_STORE.get(section, { type: 'json' });
      if (data) {
        content[section] = data;
      }
    }

    // If no content exists, return empty object
    if (Object.keys(content).length === 0) {
      return new Response(JSON.stringify({}), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    return new Response(JSON.stringify(content), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error getting content:', error);
    throw error;
  }
}

/**
 * Handle POST /content/update
 * Updates a specific section in KV
 * 
 * Expected body:
 * {
 *   "section": "team",
 *   "data": { ... }
 * }
 */
async function handleUpdateContent(request, env) {
  try {
    // --- Authorization: require admin token when configured ---
    const authHeader = request.headers.get('x-admin-token') || request.headers.get('authorization');
    let providedToken = null;
    if (authHeader) {
      if (authHeader.toLowerCase().startsWith('bearer ')) {
        providedToken = authHeader.slice(7);
      } else {
        providedToken = authHeader;
      }
    }

    // If an ADMIN_TOKEN is bound to the Worker, require it for update operations
    if (env.ADMIN_TOKEN) {
      if (!providedToken || providedToken !== env.ADMIN_TOKEN) {
        return new Response(JSON.stringify({
          error: 'Unauthorized',
          message: 'Missing or invalid admin token'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
    }

    const body = await request.json();
    
    // Validate request
    if (!body.section || !body.data) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'Missing required fields: section and data'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    const { section, data } = body;

    // Validate section name
    const validSections = ['general', 'about', 'events', 'gallery', 'team'];
    if (!validSections.includes(section)) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: `Invalid section. Must be one of: ${validSections.join(', ')}`
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Store in KV
    await env.CONTENT_STORE.put(section, JSON.stringify(data));

    console.log(`Successfully updated section: ${section}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Section '${section}' updated successfully`,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('Error updating content:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}
