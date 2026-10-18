// Shared counters for the front page: families who ran a calculation, who said it helped, shares.
// Stored in Netlify Blobs (no database, no account beyond Netlify). GET returns the counts,
// POST {event} increments one of the allowed events. Counts are public and approximate: two
// visitors incrementing in the same instant can lose one count, which is fine for this purpose.
import { getStore } from "@netlify/blobs";

export const EVENTS = ["calc", "helped_yes", "helped_no", "share", "feedback"];
const KEY = "counters";

export async function handle(req, store) {
  const headers = { "content-type": "application/json", "cache-control": "no-store", "access-control-allow-origin": "*" };
  const current = (await store.get(KEY, { type: "json" })) || {};
  if (req.method === "GET") {
    return new Response(JSON.stringify(current), { headers });
  }
  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch (e) { /* empty body */ }
    const ev = String(body.event || "");
    if (!EVENTS.includes(ev)) return new Response(JSON.stringify({ error: "unknown event" }), { status: 400, headers });
    current[ev] = (current[ev] || 0) + 1;
    current.updated = new Date().toISOString();
    await store.setJSON(KEY, current);
    return new Response(JSON.stringify(current), { headers });
  }
  return new Response("", { status: 405, headers });
}

export default async (req) => handle(req, getStore("counters"));

export const config = { path: "/api/count" };
