// /api/admin  ·  everything the /admin page needs, behind a passcode.
//   POST {action:"login", passcode}        -> sets a signed, HttpOnly session cookie (12 hours)
//   POST {action:"logout"}                 -> clears it
//   GET  ?show=<ISO or "all">              -> sign-ups + the list of show dates
//   GET  ?view=testimonies                 -> testimonies + average accuracy / impact
//   POST {action:"invite", ids:[...]}      -> picks them: "you're up" email with the Zoom link now,
//                                              and a thank-you + testimony request scheduled for noon CT the next day
//   POST {action:"status", ids, status}    -> set requested / declined (undo, or pass on someone)
//   POST {action:"remind"}                 -> send the "live in an hour" reminder now (it also runs on its own)
// The passcode and the Zoom link only ever live in env vars, never in the page.
import { neon } from "@neondatabase/serverless";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { pickEmail, thanksEmail, sendOne, sendReminders, nextShow, nextDayNoon } from "../lib/email.mjs";

const COOKIE = "ap_admin";
const TTL_S = 12 * 3600;

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

// cookie signing key: SESSION_SECRET if set, otherwise derived from two values that are already secret
// (changing the passcode then logs everyone out, which is what you want)
const signingKey = () => Netlify.env.get("SESSION_SECRET") ||
  createHash("sha256").update(`ap-admin|${Netlify.env.get("DATABASE_URL") || ""}|${Netlify.env.get("ADMIN_PASSCODE") || ""}`).digest();
const sign = (v) => createHmac("sha256", signingKey()).update(v).digest("base64url");
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };

function session(req) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(`${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, mac] = m[1].split(".");
  return !!exp && !!mac && Number(exp) > Date.now() / 1000 && same(mac, sign(exp));
}
const cookie = (value, maxAge) => `${COOKIE}=${value}; Path=/api/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;

/* picking someone: the Zoom link now, the thank-you tomorrow at noon Central (Resend holds it; scheduled_at). */
async function pick(sql, rows) {
  const zoom = Netlify.env.get("ZOOM_LINK");
  if (!zoom || !Netlify.env.get("RESEND_API_KEY") || !Netlify.env.get("MAIL_FROM"))
    return { emailed: 0, failed: 0, note: "Email isn't connected yet (Resend key, sender or Zoom link missing). People were marked picked only." };
  let emailed = 0, failed = 0;
  const thanksAt = new Date(nextDayNoon()).toISOString();
  for (const r of rows) {
    try {
      const id = await sendOne(r.email, pickEmail(r, zoom));
      await sql`UPDATE public.signups SET emailed_at = now() WHERE id = ${r.id}`;
      await sql`INSERT INTO public.email_log (kind, email, signup_id, show_at, resend_id) VALUES ('pick', ${r.email}, ${r.id}, ${r.show_at}, ${id})`;
      emailed++;
    } catch (e) { console.error("pick email", e.message); failed++; continue; }
    // one thank-you per person per show, even if they get picked twice
    const [dupe] = await sql`SELECT 1 FROM public.email_log WHERE kind = 'thanks' AND signup_id = ${r.id} LIMIT 1`;
    if (dupe) continue;
    try {
      const tid = await sendOne(r.email, thanksEmail(r), thanksAt);
      await sql`INSERT INTO public.email_log (kind, email, signup_id, show_at, resend_id, send_at, status) VALUES ('thanks', ${r.email}, ${r.id}, ${r.show_at}, ${tid}, ${thanksAt}, 'scheduled')`;
    } catch (e) { console.error("thanks schedule", e.message); }
    await new Promise((res) => setTimeout(res, 250));          // Resend allows a few requests a second
  }
  return { emailed, failed, note: null };
}

export default async (req) => {
  const sql = neon(Netlify.env.get("DATABASE_URL"));

  if (req.method === "GET") {
    if (!session(req)) return json(401, { error: "Log in." });
    const q = new URL(req.url).searchParams;
    if (q.get("view") === "testimonies") {
      const [stats] = await sql`SELECT count(*)::int AS n, round(avg(accuracy), 1)::float AS accuracy, round(avg(impact), 1)::float AS impact,
                                       count(accuracy)::int AS n_acc, count(impact)::int AS n_imp, count(testimony)::int AS n_text FROM public.testimonies`;
      const rows = await sql`SELECT id, name, email, phone, accuracy, impact, testimony, source, ok_to_share, created_at FROM public.testimonies ORDER BY created_at DESC LIMIT 1000`;
      const [mail] = await sql`SELECT count(*) FILTER (WHERE kind = 'thanks' AND status = 'scheduled' AND send_at > now())::int AS thanks_pending FROM public.email_log`;
      return json(200, { stats, rows, thanksPending: mail.thanks_pending });
    }
    const show = q.get("show") || "all";
    const shows = await sql`SELECT show_at, count(*)::int AS n, count(*) FILTER (WHERE status = 'invited')::int AS invited FROM public.signups GROUP BY show_at ORDER BY show_at DESC`;
    const rows = show === "all"
      ? await sql`SELECT id, name, email, phone, show_at, status, invited_at, emailed_at, created_at FROM public.signups ORDER BY show_at DESC, created_at ASC LIMIT 2000`
      : await sql`SELECT id, name, email, phone, show_at, status, invited_at, emailed_at, created_at FROM public.signups WHERE show_at = ${show} ORDER BY created_at ASC`;
    const next = nextShow();
    return json(200, { shows, rows, email: !!(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("MAIL_FROM") && Netlify.env.get("ZOOM_LINK")), next: new Date(next.start).toISOString() });
  }

  if (req.method !== "POST") return json(405, { error: "Nope." });
  let b; try { b = await req.json(); } catch { return json(400, { error: "Bad request." }); }

  if (b.action === "login") {
    const pass = Netlify.env.get("ADMIN_PASSCODE");
    if (!pass || !Netlify.env.get("DATABASE_URL")) return json(500, { error: "ADMIN_PASSCODE and DATABASE_URL aren't set on Netlify yet." });
    await new Promise((r) => setTimeout(r, 400));              // slows passcode guessing
    // lockout: a 4-digit passcode is 10,000 guesses. 10 misses in 15 minutes closes the door for everyone
    // until the window passes, which turns minutes of guessing into months.
    const [{ misses }] = await sql`SELECT count(*)::int AS misses FROM public.admin_attempts WHERE NOT ok AND at > now() - interval '15 minutes'`;
    if (misses >= 10) return json(429, { error: "Too many wrong tries. Wait 15 minutes." });
    const ok = same(b.passcode || "", pass);
    await sql`INSERT INTO public.admin_attempts (ok) VALUES (${ok})`;
    if (!ok) return json(401, { error: "Wrong passcode." });
    const exp = String(Math.floor(Date.now() / 1000) + TTL_S);
    return json(200, { ok: true }, { "set-cookie": cookie(`${exp}.${sign(exp)}`, TTL_S) });
  }
  if (b.action === "logout") return json(200, { ok: true }, { "set-cookie": cookie("", 0) });

  if (!session(req)) return json(401, { error: "Log in." });
  if (b.action === "remind") {
    const out = await sendReminders(sql, nextShow());
    return json(200, out);
  }
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Number.isInteger).slice(0, 500);
  if (!ids.length) return json(400, { error: "Pick at least one person." });

  if (b.action === "invite") {
    const rows = await sql`UPDATE public.signups SET status = 'invited', invited_at = coalesce(invited_at, now())
                           WHERE id = ANY(${ids}) RETURNING id, name, email, show_at, emailed_at`;
    const toEmail = rows.filter((r) => !r.emailed_at);           // never email the same person twice
    const out = await pick(sql, toEmail);
    return json(200, { invited: rows.length, emailed: out.emailed, failed: out.failed, note: out.note });
  }
  if (b.action === "status" && ["requested", "declined"].includes(b.status)) {
    const rows = await sql`UPDATE public.signups SET status = ${b.status} WHERE id = ANY(${ids}) RETURNING id`;
    return json(200, { updated: rows.length });
  }
  return json(400, { error: "Unknown action." });
};

export const config = { path: "/api/admin" };
