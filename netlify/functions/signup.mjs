// POST /api/signup  ->  one row in Neon public.signups
// Body (JSON): { name, email, phone, show_at, company? (honeypot) }
// No Instagram handle on purpose: people might think we looked at their page before calling on them.
// No prayer need either: a word of knowledge has to land as something we had no way of knowing (Sherman, Oct 28).
import { neon } from "@neondatabase/serverless";
import { requestEmail, sendOne } from "../lib/email.mjs";

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async (req) => {
  // GET /api/signup?check=1: health check. Runs SELECT 1, writes nothing, never returns secrets.
  if (req.method === "GET" && new URL(req.url).searchParams.has("check")) {
    const u = (Netlify.env.get("DATABASE_URL") || "").trim();
    const c = !u ? "config-missing" : /PASTE_|placeholder/i.test(u) ? "config-placeholder" : !/^postgres(ql)?:\/\//.test(u) ? "config-format" : "";
    if (c) return json(500, { db: c });
    try { await neon(u)`SELECT 1`; return json(200, { db: "ok" }); }
    catch (e) { return json(500, { db: "db-" + String((e && (e.code || e.name)) || "unknown").replace(/[^\w-]/g, "").slice(0, 24) }); }
  }
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let b;
  try { b = await req.json(); } catch { return json(400, { error: "That didn't go through. Try again." }); }

  // honeypot: bots fill every field; people never see this one. Pretend it worked.
  if (clean(b.company, 200)) return json(200, { ok: true });

  const name = clean(b.name, 120);
  const email = clean(b.email, 254).toLowerCase();
  const phone = clean(b.phone, 32);
  const showAt = new Date(b.show_at);

  if (!name) return json(400, { error: "Add your name." });
  if (!EMAIL.test(email)) return json(400, { error: "That email doesn't look right." });
  if (phone.replace(/\D/g, "").length < 7) return json(400, { error: "Add a phone number we can reach." });
  // the page sends the next broadcast; refuse anything absurd (more than a day back or 60 days out)
  const now = Date.now();
  if (isNaN(showAt) || showAt < now - 864e5 || showAt > now + 60 * 864e5) return json(400, { error: "Refresh the page and try again." });

  // config check first: the first live test 500'd with an empty log, and "something broke" told us nothing.
  // Codes are safe to show (no secrets): config-missing / config-placeholder / config-format / db-<postgres code>.
  const url = Netlify.env.get("DATABASE_URL") || "";
  const conf = !url ? "config-missing" : /PASTE_|placeholder/i.test(url) ? "config-placeholder" : !/^postgres(ql)?:\/\//.test(url.trim()) ? "config-format" : "";
  if (conf) { console.error("signup", conf); return json(500, { error: `Something broke on our end (${conf}).` }); }

  try {
    const sql = neon(url.trim());
    // same email for the same show only counts once (unique index on lower(email), show_at)
    const rows = await sql`
      INSERT INTO public.signups (name, email, phone, show_at)
      VALUES (${name}, ${email}, ${phone}, ${showAt.toISOString()})
      ON CONFLICT (lower(email), show_at) DO NOTHING
      RETURNING id, name, email`;
    // "You're on the list" goes out immediately, once per request (a duplicate request returns no row, so no second email).
    // A failed email never fails the sign-up: the request is already saved.
    if (rows[0]) {
      try {
        const id = await sendOne(email, requestEmail(rows[0], showAt.getTime()));
        await sql`INSERT INTO public.email_log (kind, email, signup_id, show_at, resend_id) VALUES ('request', ${email}, ${rows[0].id}, ${showAt.toISOString()}, ${id})`;
      } catch (e) {
        console.error("request email", e.message);
        await sql`INSERT INTO public.email_log (kind, email, signup_id, show_at, status) VALUES ('request', ${email}, ${rows[0].id}, ${showAt.toISOString()}, 'failed')`.catch(() => {});
      }
    }
    return json(200, { ok: true });
  } catch (e) {
    const code = (e && (e.code || e.name)) ? String(e.code || e.name).replace(/[^\w-]/g, "").slice(0, 24) : "unknown";
    console.error("signup insert failed", code, e && e.message);
    return json(500, { error: `Something broke on our end (db-${code}). Try again in a minute.` });
  }
};

export const config = { path: "/api/signup" };
