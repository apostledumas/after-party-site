// Scheduled: the "we go live in an hour" email.
// Runs every 10 minutes (cron is UTC). It sends only when the next show starts in 45 to 65 minutes, so it lands
// about an hour before: Thursdays ~7 PM CT, and ~5 PM CT on Oct 31 for the 6 PM special. email_log makes it once per
// person per show, so overlapping runs or a manual "Send reminder now" in /admin never double-send.
import { neon } from "@neondatabase/serverless";
import { nextShow, sendReminders } from "../lib/email.mjs";

export default async () => {
  const show = nextShow();
  const mins = (show.start - Date.now()) / 6e4;
  if (mins < 45 || mins > 65) return;
  const sql = neon((Netlify.env.get("DATABASE_URL") || "").trim());
  const out = await sendReminders(sql, show);
  console.log("reminders", new Date(show.start).toISOString(), JSON.stringify(out));
};

export const config = { schedule: "*/10 * * * *" };
