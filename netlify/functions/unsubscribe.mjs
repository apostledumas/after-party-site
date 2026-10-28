// GET /api/unsubscribe?e=<email>&t=<signed>  ->  stops show reminders for that email. One click, no login.
// Request confirmations and "you're up" emails still go out: they only happen when the person asks to come on.
import { neon } from "@neondatabase/serverless";
import { checkLink, SITE } from "../lib/email.mjs";

const page = (title, body) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | The After Party</title>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;800&family=Permanent+Marker&display=swap" rel="stylesheet"></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#121110;font-family:'Inter Tight',Arial,sans-serif;padding:16px">
<div style="max-width:440px;background:#f6f2ea;color:#121110;border-radius:28px;padding:34px 28px;transform:rotate(-1deg)">
<span style="display:inline-block;background:#ffe27a;font-family:'Permanent Marker',Arial;text-transform:uppercase;padding:6px 12px;transform:rotate(-2deg)">The After Party</span>
<h1 style="font-size:30px;line-height:1.1;margin:16px 0 10px;letter-spacing:-.02em">${title}</h1><p style="font-size:16px;line-height:1.6;margin:0 0 20px">${body}</p>
<a href="${SITE}" style="display:inline-block;background:#e5413d;color:#fff;font-weight:800;text-decoration:none;padding:14px 24px;border-radius:999px">Back to theafterparty.tv</a></div></body></html>`,
  { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });

export default async (req) => {
  const q = new URL(req.url).searchParams;
  const email = String(q.get("e") || "").trim().toLowerCase();
  if (!email || !checkLink("u:" + email, q.get("t"))) return page("That link didn't work.", "Try the link in your most recent email again.");
  const sql = neon((Netlify.env.get("DATABASE_URL") || "").trim());
  await sql`INSERT INTO public.unsubscribes (email) VALUES (${email}) ON CONFLICT DO NOTHING`;
  return page("You're off the reminder list.", "No more show reminders. If you request to come on again, we'll still send your confirmation and, if you're picked, your Zoom link. We'll miss you in the chat.");
};

export const config = { path: "/api/unsubscribe" };
