// POST /api/signup  ->  one row in Neon public.signups
// Body (JSON): { name, email, phone, show_at, company? (honeypot) }
// No Instagram handle on purpose: people might think we looked at their page before calling on them.
// No prayer need either: a word of knowledge has to land as something we had no way of knowing (Sherman, Oct 28).
import { neon } from "@neondatabase/serverless";

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export default async (req) => {
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

  try {
    const sql = neon(Netlify.env.get("DATABASE_URL"));
    // same email for the same show only counts once (unique index on lower(email), show_at)
    await sql`
      INSERT INTO public.signups (name, email, phone, show_at)
      VALUES (${name}, ${email}, ${phone}, ${showAt.toISOString()})
      ON CONFLICT (lower(email), show_at) DO NOTHING`;
    return json(200, { ok: true });
  } catch (e) {
    console.error("signup insert failed", e);
    return json(500, { error: "Something broke on our end. Try again in a minute." });
  }
};

export const config = { path: "/api/signup" };
