// Source for the Netlify Function that backs the front page's counters and comments.
// Bundled into netlify/functions/api.mjs with `npm run build:functions` (committed, so the deploy
// needs no dependency installation). Storage is Netlify Blobs: no database, no extra account.
//
//   GET  /api/count              -> {"visit": n, "helped_yes": n, "helped_some": n, "helped_no": n, "share": n, "comment": n}
//   POST /api/count {event}      -> increments one allowed event, returns the counts
//   POST /api/feedback {...}     -> stores one anonymous comment (helped, where, lang, comment)
//   GET  /api/feedback           -> the stored comments, newest first (anonymous; read this to pick
//                                   the ones to publish in web/data/testimonials.json)
import { getStore } from "@netlify/blobs";

export const EVENTS = ["visit", "helped_yes", "helped_some", "helped_no", "share", "comment"];
export const HELPED = ["yes", "some", "no", ""];
const COUNTERS_KEY = "counters";
const MAX_COMMENT = 600;

const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" } });

async function readBody(req) {
  try { return (await req.json()) || {}; } catch (e) { return {}; }
}

export async function handleCount(req, store) {
  const current = (await store.get(COUNTERS_KEY, { type: "json" })) || {};
  if (req.method === "GET") return json(current);
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const ev = String((await readBody(req)).event || "");
  if (!EVENTS.includes(ev)) return json({ error: "unknown event" }, 400);
  current[ev] = (current[ev] || 0) + 1;
  current.updated = new Date().toISOString();
  await store.setJSON(COUNTERS_KEY, current);
  return json(current);
}

export async function handleFeedback(req, store) {
  if (req.method === "GET") {
    const { blobs } = await store.list({ prefix: "c/" });
    const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 500);
    const items = [];
    for (const k of keys) { const v = await store.get(k, { type: "json" }); if (v) items.push(v); }
    return json({ count: items.length, items });
  }
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const b = await readBody(req);
  if (b.website) return json({ ok: true });                       // honeypot field filled: a bot
  const comment = String(b.comment || "").trim().slice(0, MAX_COMMENT);
  const helped = HELPED.includes(b.helped) ? b.helped : "";
  if (!comment && !helped) return json({ error: "empty" }, 400);
  const entry = { when: new Date().toISOString(), helped, where: String(b.where || "").slice(0, 40), lang: String(b.lang || "").slice(0, 5), comment };
  const key = `c/${entry.when}-${Math.random().toString(36).slice(2, 8)}`;
  await store.setJSON(key, entry);
  return json({ ok: true });
}

export default async (req) => {
  const path = new URL(req.url).pathname;
  if (path.endsWith("/feedback")) return handleFeedback(req, getStore("feedback"));
  return handleCount(req, getStore("counters"));
};

export const config = { path: ["/api/count", "/api/feedback"] };
