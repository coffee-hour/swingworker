const POKE_INGEST_URL = "https://poke.com/api/v1/inbound/ingest/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4ZjBiMzc5ZC03MjU5LTQxODUtOGM4MC04MzcwNzY4MDdjNDkiLCJqdGkiOiI4MGE5ZWI3ZC01NTUzLTQ5ZDItYjU4OS02ZGVlZDYxZjI4NDkiLCJpYXQiOjE3ODIxNTgyNDIsImV4cCI6MjA5NzUxODI0Mn0.ejwYRs35Zjp1XvWsHufi6-TqvrjIud1lZrHDe_5KSpg";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    // GET /api/messages
    if (request.method === 'GET' && url.pathname === '/api/messages') {
      const after = parseInt(url.searchParams.get('after') || '0');
      const list = await env.chat_messages.list({ prefix: 'message:' });
      
      const messages = [];
      for (const key of list.keys) {
        const id = parseInt(key.name.split(':')[1]);
        if (id > after) {
          const val = await env.chat_messages.get(key.name);
          if (val) messages.push(JSON.parse(val));
        }
      }

      messages.sort((a, b) => a.id - b.id);

      return new Response(JSON.stringify({ messages }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/messages
    if (request.method === 'POST' && url.pathname === '/api/messages') {
      try {
        const payload = await request.json();
        const id = Date.now();
        const message = {
          id,
          ...payload,
          timestamp: new Date().toISOString()
        };

        // 1. Store in KV
        await env.chat_messages.put(`message:${id}`, JSON.stringify(message));

        // 2. Forward to Poke
        await fetch(POKE_INGEST_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });

        return new Response(JSON.stringify({ success: true, id }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
