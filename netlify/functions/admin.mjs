// /api/admin  ·  everything the /admin page needs, behind a passcode.
//   POST {action:"login", passcode}        -> sets a signed, HttpOnly session cookie (12 hours)
//   POST {action:"logout"}                 -> clears it
//   GET  ?show=<ISO or "all">              -> sign-ups + the list of show dates
//   POST {action:"invite", ids:[...]}      -> marks them invited; emails the Zoom link if Resend is set up
//   POST {action:"status", ids, status}    -> set requested / declined (undo, or pass on someone)
// The passcode and the Zoom link only ever live in env vars, never in the page.
import { neon } from "@neondatabase/serverless";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

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

/* email: plain, warm, no em dashes. Zoom link from env. */
function inviteEmail(row, zoom) {
  const when = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(row.show_at));
  const first = row.name.split(" ")[0];
  const text = `Hey ${first},

You're invited to come on The After Party.

When: ${when} Central
Zoom: ${zoom}

Join a few minutes early. You'll wait in the waiting room until we bring you in. Camera on, good light, somewhere you can hear.

Can't wait to see you.
Sherman and The After Party team`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#121110">
<p>Hey ${first.replace(/[<>&]/g, "")},</p>
<p><b>You're invited to come on The After Party.</b></p>
<p>When: ${when} Central<br>Zoom: <a href="${zoom}">${zoom}</a></p>
<p>Join a few minutes early. You'll wait in the waiting room until we bring you in. Camera on, good light, somewhere you can hear.</p>
<p>Can't wait to see you.<br>Sherman and The After Party team</p></div>`;
  return { subject: "You're invited to The After Party", text, html };
}

async function sendInvites(rows) {
  const key = Netlify.env.get("RESEND_API_KEY"), from = Netlify.env.get("MAIL_FROM"), zoom = Netlify.env.get("ZOOM_LINK");
  const replyTo = Netlify.env.get("MAIL_REPLY_TO");
  if (!key || !from || !zoom) return { sent: [], skipped: "Email isn't connected yet (Resend key, sender or Zoom link missing). People were marked invited only." };
  const sent = [], failed = [];
  for (let i = 0; i < rows.length; i += 100) {                 // Resend batch limit: 100 per call
    const chunk = rows.slice(i, i + 100);
    const res = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      // replies land in Sherman's inbox: theafterparty.tv has receiving off in Resend
      body: JSON.stringify(chunk.map((r) => ({ from, to: [r.email], ...(replyTo ? { reply_to: replyTo } : {}), ...inviteEmail(r, zoom) }))),
    });
    if (res.ok) sent.push(...chunk.map((r) => r.id)); else { failed.push(...chunk.map((r) => r.id)); console.error("resend", res.status, await res.text()); }
  }
  return { sent, failed };
}

export default async (req) => {
  const sql = neon(Netlify.env.get("DATABASE_URL"));

  if (req.method === "GET") {
    if (!session(req)) return json(401, { error: "Log in." });
    const show = new URL(req.url).searchParams.get("show") || "all";
    const shows = await sql`SELECT show_at, count(*)::int AS n, count(*) FILTER (WHERE status = 'invited')::int AS invited FROM public.signups GROUP BY show_at ORDER BY show_at DESC`;
    const rows = show === "all"
      ? await sql`SELECT id, name, email, phone, show_at, status, invited_at, emailed_at, created_at FROM public.signups ORDER BY show_at DESC, created_at ASC LIMIT 2000`
      : await sql`SELECT id, name, email, phone, show_at, status, invited_at, emailed_at, created_at FROM public.signups WHERE show_at = ${show} ORDER BY created_at ASC`;
    return json(200, { shows, rows, email: !!(Netlify.env.get("RESEND_API_KEY") && Netlify.env.get("MAIL_FROM") && Netlify.env.get("ZOOM_LINK")) });
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
  const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter(Number.isInteger).slice(0, 500);
  if (!ids.length) return json(400, { error: "Pick at least one person." });

  if (b.action === "invite") {
    const rows = await sql`UPDATE public.signups SET status = 'invited', invited_at = coalesce(invited_at, now())
                           WHERE id = ANY(${ids}) RETURNING id, name, email, show_at, emailed_at`;
    const toEmail = rows.filter((r) => !r.emailed_at);           // never email the same person twice
    const out = await sendInvites(toEmail);
    if (out.sent && out.sent.length) await sql`UPDATE public.signups SET emailed_at = now() WHERE id = ANY(${out.sent})`;
    return json(200, { invited: rows.length, emailed: (out.sent || []).length, failed: (out.failed || []).length, note: out.skipped || null });
  }
  if (b.action === "status" && ["requested", "declined"].includes(b.status)) {
    const rows = await sql`UPDATE public.signups SET status = ${b.status} WHERE id = ANY(${ids}) RETURNING id`;
    return json(200, { updated: rows.length });
  }
  return json(400, { error: "Unknown action." });
};

export const config = { path: "/api/admin" };
