export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      return new Response('Hello from SwingWorker GET!');
    }
    if (request.method === 'POST') {
      const body = await request.text();
      return new Response(`Received POST message: ${body}`);
    }
    return new Response('Method not allowed', { status: 405 });
  },
};
