// /api/testify
//   GET  ?s=<signup id>&t=<signed>   -> { first } so the page can greet someone who came from the thank-you email
//   POST { s?, t?, name?, email?, phone?, accuracy?, impact?, testimony?, ok_to_share?, company? (honeypot) }
// From the thank-you email (valid s + t): name, email and phone come from their sign-up row, so they only rate and write.
// From the open /testify page: name, email and phone are required, same as a sign-up, so the tables stay aligned.
// Either a rating or a testimony is required, never both (Sherman: "either the rating or the testimonial").
import { neon } from "@neondatabase/serverless";
import { checkLink, firstName } from "../lib/email.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const score = (v) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 10 ? n : null; };

export default async (req) => {
  const sql = neon((Netlify.env.get("DATABASE_URL") || "").trim());
  if (req.method === "GET") {
    const q = new URL(req.url).searchParams, s = Number(q.get("s"));
    if (!Number.isInteger(s) || !checkLink("t:" + s, q.get("t"))) return json(404, { error: "Link not recognized." });
    const [row] = await sql`SELECT name FROM public.signups WHERE id = ${s}`;
    return row ? json(200, { first: firstName(row.name) }) : json(404, { error: "Link not recognized." });
  }
  if (req.method !== "POST") return json(405, { error: "Use POST." });
  let b; try { b = await req.json(); } catch { return json(400, { error: "That didn't go through. Try again." }); }
  if (clean(b.company, 200)) return json(200, { ok: true });

  const accuracy = score(b.accuracy), impact = score(b.impact);
  const testimony = clean(b.testimony, 5000) || null;
  if (accuracy == null && impact == null && !testimony) return json(400, { error: "Give us a rating or a few words. Either one works." });
  const ok = b.ok_to_share === true || b.ok_to_share === "on" || b.ok_to_share === "yes";

  try {
    let name, email, phone, signupId = null, source = "page";
    const s = Number(b.s);
    if (Number.isInteger(s) && checkLink("t:" + s, b.t)) {
      const [row] = await sql`SELECT id, name, email, phone FROM public.signups WHERE id = ${s}`;
      if (row) ({ name, email, phone } = row), (signupId = row.id), (source = "email");
    }
    if (!signupId) {
      name = clean(b.name, 120); email = clean(b.email, 254).toLowerCase(); phone = clean(b.phone, 32);
      if (!name) return json(400, { error: "Add your name." });
      if (!EMAIL.test(email)) return json(400, { error: "That email doesn't look right." });
      if (phone.replace(/\D/g, "").length < 7) return json(400, { error: "Add a phone number." });
      // tie it to their most recent request if they have one
      const [last] = await sql`SELECT id FROM public.signups WHERE lower(email) = ${email} ORDER BY created_at DESC LIMIT 1`;
      if (last) signupId = last.id;
    }
    await sql`INSERT INTO public.testimonies (signup_id, name, email, phone, accuracy, impact, testimony, source, ok_to_share)
              VALUES (${signupId}, ${name}, ${email}, ${phone}, ${accuracy}, ${impact}, ${testimony}, ${source}, ${ok})`;
    return json(200, { ok: true });
  } catch (e) {
    console.error("testify", e.code || e.name, e.message);
    return json(500, { error: "Something broke on our end. Try again in a minute." });
  }
};

export const config = { path: "/api/testify" };
