// Scheduled: the "we go live in an hour" email.
// Runs every 10 minutes (cron is UTC). It sends only when the next show starts in 45 to 65 minutes, so it lands
// about an hour before: Thursdays ~7 PM CT, and ~5 PM CT on Oct 31 for the 6 PM special. email_log makes it once per
// person per show, so overlapping runs or a manual "Send reminder now" in /admin never double-send.
import { neon } from "@neondatabase/serverless";
import { nextShow, sendReminders, sendSoon } from "../lib/email.mjs";

// Two sends per show:
//   45 to 65 min out: the hour-before email to the whole list (personal version for people who requested this show)
//   10 to 22 min out: "we go live in 20 minutes", only to people who requested this show. The 10-minute floor
//   gives one retry run if the first fails; email_log keeps it once per person either way.
export default async () => {
  const show = nextShow();
  const mins = (show.start - Date.now()) / 6e4;
  const hour = mins >= 45 && mins <= 65, soon = mins >= 10 && mins <= 22;
  if (!hour && !soon) return;
  const sql = neon((Netlify.env.get("DATABASE_URL") || "").trim());
  const out = hour ? await sendReminders(sql, show) : await sendSoon(sql, show, Math.max(5, Math.round(mins / 5) * 5));
  console.log(hour ? "reminders" : "soon", new Date(show.start).toISOString(), JSON.stringify(out));
};

export const config = { schedule: "*/10 * * * *" };
