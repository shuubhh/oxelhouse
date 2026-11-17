/**
 * Oxel House Goa — Cloudflare Worker.
 *
 * The villa site is fully static; enquiries go straight to WhatsApp from the
 * browser (see src/App.tsx — WHATSAPP_NUMBER + wa.me deep link). This Worker
 * intentionally exposes only a health endpoint. Re-add API routes here later
 * if the site ever needs them (e.g. a future Supabase-backed enquiry store).
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/healthz") {
      return new Response(JSON.stringify({ status: "ok" }), {
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: JSON_HEADERS,
    });
  },
};
