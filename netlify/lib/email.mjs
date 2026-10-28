// Shared email + schedule helpers for the functions. Lives outside netlify/functions so it is bundled, not deployed as one.
// Emails are table-based with inline styles (Gmail strips <style> and ignores CSS masks), so the brand comes from:
// a rendered header image (email/header.png: the popper, confetti, stickers), the palette, tilted-feeling colour cards,
// and red pill buttons. Fonts fall back to Arial in clients that block web fonts. No em dashes anywhere (Sherman's rule).
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SITE = "https://theafterparty.tv";
export const YT = "https://www.youtube.com/@doingitwiththedumases";
const C = { ink: "#121110", ink2: "#1d1b19", paper: "#f6f2ea", red: "#e5413d", pink: "#ff9fcf", butter: "#ffe27a", muted: "#6b655e" };
const FONT = "'Inter Tight',Arial,Helvetica,sans-serif";
const MARKER = "'Permanent Marker','Marker Felt',Arial,sans-serif";

/* ---------- schedule (same rules as the site: Oct 31 special, then Thursdays 8 PM Central) ---------- */
export const SHOW = {
  specialStart: Date.UTC(2026, 9, 31, 23, 0), specialEnd: Date.UTC(2026, 10, 1, 2, 0),
  weeklyFirst: Date.UTC(2026, 10, 6, 2, 0), weeklyHour: 20, weeklyLengthMin: 180,
};
const TZ = "America/Chicago";
function chiOffset(ms) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).reduce((o, x) => ((o[x.type] = x.value), o), {});
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
}
export function chiToUtc(y, m, d, h, min = 0) { const g = Date.UTC(y, m, d, h, min); return g - chiOffset(g - chiOffset(g)); }
export function nextShow(now = Date.now()) {
  if (now < SHOW.specialEnd) return { special: true, start: SHOW.specialStart, end: SHOW.specialEnd };
  const len = SHOW.weeklyLengthMin * 6e4;
  if (now < SHOW.weeklyFirst + len) return { special: false, start: SHOW.weeklyFirst, end: SHOW.weeklyFirst + len };
  const t = new Date(now + chiOffset(now));
  for (let i = 0; i < 9; i++) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + i));
    if (d.getUTCDay() !== 4) continue;
    const s = chiToUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), SHOW.weeklyHour);
    if (now < s + len) return { special: false, start: s, end: s + len };
  }
  return { special: false, start: SHOW.weeklyFirst, end: SHOW.weeklyFirst + len };
}
export const fmtShow = (ms) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms)) + " Central";
/** noon Central on the day after `ms`: when the thank-you goes out */
export function nextDayNoon(ms = Date.now()) {
  const t = new Date(ms + chiOffset(ms));
  return chiToUtc(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1, 12);
}

/* ---------- signed links (unsubscribe, testimony form). Key derived from secrets already in env. ---------- */
const key = () => createHash("sha256").update(`ap-links|${Netlify.env.get("DATABASE_URL") || ""}`).digest();
export const signLink = (v) => createHmac("sha256", key()).update(String(v)).digest("base64url").slice(0, 22);
export const checkLink = (v, t) => { const a = Buffer.from(signLink(v)), b = Buffer.from(String(t || "")); return a.length === b.length && timingSafeEqual(a, b); };
export const unsubUrl = (email) => `${SITE}/api/unsubscribe?e=${encodeURIComponent(email)}&t=${signLink("u:" + email.toLowerCase())}`;
export const testifyUrl = (signupId) => `${SITE}/testify?s=${signupId}&t=${signLink("t:" + signupId)}`;

/* ---------- layout ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "friend";

const button = (label, href, bg = C.red, fg = "#ffffff") =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px"><tr><td style="border-radius:999px;background:${bg}">
  <a href="${esc(href)}" style="display:inline-block;padding:16px 30px;font-family:${FONT};font-size:17px;font-weight:800;color:${fg};text-decoration:none;border-radius:999px">${esc(label)} &rarr;</a></td></tr></table>`;
const sticker = (text, bg = C.butter, rot = -2) =>
  `<span style="display:inline-block;background:${bg};color:${C.ink};font-family:${MARKER};font-size:15px;letter-spacing:.04em;text-transform:uppercase;padding:7px 14px;border-radius:3px;transform:rotate(${rot}deg)">${esc(text)}</span>`;
/** a coloured "card" row: the site's tilted cards, flattened for email */
const card = (bg, title, body, fg = C.ink) =>
  `<tr><td style="padding:0 0 10px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${bg};border-radius:18px;padding:16px 20px;font-family:${FONT};color:${fg}">
  <div style="font-size:17px;font-weight:800;line-height:1.25;margin:0 0 3px">${title}</div><div style="font-size:15px;line-height:1.5">${body}</div></td></tr></table></td></tr>`;

/**
 * Full branded email. body is trusted HTML built by the templates below (all user values escaped there).
 */
function layout({ preheader, kicker, title, intro, cards = [], cta, cta2, outro, unsub }) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;800&family=Permanent+Marker&display=swap" rel="stylesheet"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ink}"><tr><td align="center" style="padding:24px 12px 40px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
  <tr><td style="padding:0 0 14px"><a href="${SITE}"><img src="${SITE}/email/header.jpg" width="600" alt="The After Party" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:24px"></a></td></tr>
  <tr><td style="background:${C.paper};border-radius:24px;padding:32px 28px 26px;font-family:${FONT};color:${C.ink}">
    ${kicker ? `<div style="margin:0 0 14px">${kicker}</div>` : ""}
    <h1 style="margin:0 0 12px;font-family:${FONT};font-size:30px;line-height:1.1;font-weight:800;letter-spacing:-.02em;color:${C.ink}">${title}</h1>
    ${intro ? `<div style="font-size:16px;line-height:1.6;margin:0 0 20px">${intro}</div>` : ""}
    ${cards.length ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px">${cards.join("")}</table>` : ""}
    ${cta ? button(cta.label, cta.href, cta.bg, cta.fg) : ""}
    ${cta2 ? `<div style="margin:8px 0 0">${button(cta2.label, cta2.href, C.ink, "#ffffff")}</div>` : ""}
    ${outro ? `<div style="font-size:15px;line-height:1.6;margin:18px 0 0">${outro}</div>` : ""}
    <div style="font-size:15px;line-height:1.5;margin:22px 0 0">See you there,<br><b>Sherman and The After Party team</b></div>
  </td></tr>
  <tr><td style="padding:22px 10px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#a39d94;text-align:center">
    <a href="${SITE}" style="color:#f6f2ea;text-decoration:none;font-weight:800">theafterparty.tv</a> &nbsp;&middot;&nbsp;
    <a href="${YT}?sub_confirmation=1" style="color:#f6f2ea;text-decoration:none">YouTube</a> &nbsp;&middot;&nbsp;
    <a href="https://instagram.com/shermandumastv" style="color:#f6f2ea;text-decoration:none">@shermandumastv</a><br>
    Live on YouTube every Thursday at 8 PM Central.<br>
    You're getting this because you requested to come on The After Party.${unsub ? ` <a href="${esc(unsub)}" style="color:#a39d94">Stop show reminders</a>.` : ""}
  </td></tr>
</table></td></tr></table></body></html>`;
}

/* ---------- the four emails ---------- */

/** 1. sent the instant someone requests to come on */
export function requestEmail(row, showAt) {
  const first = esc(firstName(row.name));
  const when = esc(fmtShow(showAt));
  return {
    subject: `You're on the list, ${firstName(row.name)}`,
    html: layout({
      preheader: `Your request for ${fmtShow(showAt)} is in. Here's how to be ready.`,
      kicker: sticker("Request received", C.butter, -2),
      title: `You're on the list, ${first}.`,
      intro: `We got your request for <b>${when}</b>.<br><br>Quick heads up: a request isn't a guarantee. Sherman picks people <b>live, during the show</b>. If you're not picked this time, you're not forgotten. Just request again for the next show, because every show starts a fresh list.`,
      cards: [
        card(C.red, "Camera on. No exceptions.", "You have to have your camera on. If we can't see you, we can't bring you up, and we won't prophesy over a black screen.", "#ffffff"),
        card(C.butter, "Lights on, face the light.", "Sit facing a lamp or a window so we can see your face, not your silhouette."),
        card(C.pink, "Get dressed.", "You're on a live show. Wear what you'd want the whole internet to see you in."),
        card("#ffffff", "Watch from the start, keep your email open.", "Sherman might call your name on air. If he does, your Zoom link lands in your inbox right then (check spam and promotions too). Stay till the end. You never know when it's your turn."),
      ],
      cta: { label: "Subscribe on YouTube", href: `${YT}?sub_confirmation=1` },
      outro: `Subscribing and tapping the bell is the best way to be there when we go live, even if you forget. We'll also send you a reminder an hour before the show.`,
      unsub: unsubUrl(row.email),
    }),
    text: `You're on the list, ${firstName(row.name)}.

We got your request for ${fmtShow(showAt)}.

A request isn't a guarantee. Sherman picks people live, during the show. If you're not picked, request again for the next show.

Be ready:
- Camera on. No camera, no word.
- Lights on, face the light.
- Get dressed. It's a live show.
- Watch from the start and keep your email open. If Sherman calls your name, your Zoom link arrives right then.

Subscribe on YouTube so you get the live alert: ${YT}?sub_confirmation=1

Sherman and The After Party team
Stop show reminders: ${unsubUrl(row.email)}`,
  };
}

/** 2. sent the moment Sherman picks someone, during the show */
export function pickEmail(row, zoom) {
  const first = esc(firstName(row.name));
  return {
    subject: `${firstName(row.name)}, you're up! Join The After Party now`,
    html: layout({
      preheader: "Sherman just picked you. Your Zoom link is inside.",
      kicker: sticker("You're up!", C.pink, -3),
      title: `${first}, you're up!`,
      intro: `Sherman just picked you to come on The After Party. Tap the button and you'll land in the waiting room. Hang tight there and we'll bring you in.`,
      cta: { label: "Join the Zoom now", href: zoom },
      cards: [
        card(C.butter, "Before you join", "Camera on, lights on, somewhere you can hear. Mute the YouTube stream so there's no echo."),
      ],
      outro: `<span style="font-size:13px;color:${C.muted}">Button not working? Copy this link: ${esc(zoom)}</span>`,
    }),
    text: `${firstName(row.name)}, you're up!

Sherman just picked you to come on The After Party.

Join now: ${zoom}

You'll land in the waiting room. Camera on, lights on, somewhere you can hear, and mute the YouTube stream so there's no echo.

See you in a minute.
Sherman and The After Party team`,
  };
}

/** 3. the hour-before reminder, to everyone on the list */
export function reminderEmail(email, show) {
  const title = show.special ? "Live Spiritual Readings starts in an hour." : "We go live in an hour.";
  return {
    subject: show.special ? "Live Spiritual Readings starts in an hour" : "The After Party is live in an hour",
    html: layout({
      preheader: `Tonight at ${fmtShow(show.start).replace(/^\w+, \w+ \d+, /, "")}. Come watch, and request to come on.`,
      kicker: sticker("Tonight", C.butter, -2),
      title,
      intro: show.special
        ? `The After Party is back. Three hours, live on YouTube, with special guests. Bring somebody who needs to hear that God sees them.`
        : `The After Party goes live on YouTube at 8 PM Central. Pull up a chair.`,
      cards: [
        card(C.red, "Want a word?", `Request to come on at <a href="${SITE}/#signup" style="color:#ffffff;font-weight:800">theafterparty.tv</a>, then watch live. Sherman picks people as the night goes.`, "#ffffff"),
        card(C.pink, "Ready to be picked?", "Camera on, lights on, dressed, and your email open. If he calls your name, your Zoom link lands right then."),
      ],
      cta: { label: "Watch on YouTube", href: YT },
      cta2: { label: "Request to come on", href: `${SITE}/#signup` },
      unsub: unsubUrl(email),
    }),
    text: `${title}

Watch on YouTube: ${YT}
Want a word? Request to come on at ${SITE}/#signup and watch live. If Sherman calls your name, your Zoom link lands in your email right then.

Sherman and The After Party team
Stop show reminders: ${unsubUrl(email)}`,
  };
}

/** 4. the next day, to everyone who was picked */
export function thanksEmail(row) {
  const first = esc(firstName(row.name));
  const link = testifyUrl(row.id);
  return {
    subject: `Thank you for coming on, ${firstName(row.name)}`,
    html: layout({
      preheader: "How did it go? One minute, two numbers, and your story if you want.",
      kicker: sticker("Thank you", C.pink, -2),
      title: `Thank you for coming on, ${first}.`,
      intro: `It was a joy to have you on The After Party. Would you tell us how it went? It takes about a minute.`,
      cards: [
        card(C.butter, "Two quick numbers", "How accurate was the word, 1 to 10? How much did it impact you, 1 to 10?"),
        card("#ffffff", "Your story, if you want", "What happened, what it meant, anything that's changed since. We'll always ask before we share it anywhere."),
      ],
      cta: { label: "Share how it went", href: link },
      outro: `Know someone who needs a word? Send them to <a href="${SITE}" style="color:${C.red};font-weight:800">theafterparty.tv</a>. We're live every Thursday at 8 PM Central.`,
    }),
    text: `Thank you for coming on, ${firstName(row.name)}.

Would you tell us how it went? Two numbers (accuracy and impact, 1 to 10) and your story if you want. About a minute:
${link}

Sherman and The After Party team`,
  };
}

/* ---------- Resend ---------- */
export function mailConfig() {
  return { key: Netlify.env.get("RESEND_API_KEY"), from: Netlify.env.get("MAIL_FROM"), replyTo: Netlify.env.get("MAIL_REPLY_TO") };
}
/** one email; optional scheduled_at (ISO). Returns the Resend id or throws. */
export async function sendOne(to, msg, scheduledAt) {
  const { key, from, replyTo } = mailConfig();
  if (!key || !from) throw new Error("email-not-configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], ...(replyTo ? { reply_to: replyTo } : {}), subject: msg.subject, html: msg.html, text: msg.text, ...(scheduledAt ? { scheduled_at: scheduledAt } : {}) }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend-${res.status}-${out.name || ""}`);
  return out.id;
}
/** up to 100 per call (Resend batch). Returns per-message ids in order, or throws. */
export async function sendBatch(items) {
  const { key, from, replyTo } = mailConfig();
  if (!key || !from) throw new Error("email-not-configured");
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify(items.map(({ to, msg }) => ({ from, to: [to], ...(replyTo ? { reply_to: replyTo } : {}), subject: msg.subject, html: msg.html, text: msg.text }))),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`resend-${res.status}-${out.name || ""}`);
  return (out.data || []).map((d) => d.id);
}

/** the hour-before reminder for `show`, to every requester who hasn't unsubscribed and hasn't had it yet. */
export async function sendReminders(sql, show) {
  const showIso = new Date(show.start).toISOString();
  const people = await sql`
    SELECT DISTINCT ON (lower(s.email)) lower(s.email) AS email
    FROM public.signups s
    WHERE NOT EXISTS (SELECT 1 FROM public.unsubscribes u WHERE u.email = lower(s.email))
      AND NOT EXISTS (SELECT 1 FROM public.email_log l WHERE l.kind = 'reminder' AND l.show_at = ${showIso} AND lower(l.email) = lower(s.email))`;
  let sent = 0, failed = 0;
  for (let i = 0; i < people.length; i += 100) {
    const chunk = people.slice(i, i + 100);
    try {
      const ids = await sendBatch(chunk.map((p) => ({ to: p.email, msg: reminderEmail(p.email, show) })));
      for (let j = 0; j < chunk.length; j++) {
        await sql`INSERT INTO public.email_log (kind, email, show_at, resend_id) VALUES ('reminder', ${chunk[j].email}, ${showIso}, ${ids[j] || null}) ON CONFLICT DO NOTHING`;
      }
      sent += chunk.length;
    } catch (e) { console.error("reminder batch", e.message); failed += chunk.length; }
  }
  return { sent, failed, audience: people.length };
}
