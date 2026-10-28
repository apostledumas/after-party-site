# The After Party: Build Log

Every number here came out of a measurement. Brief: [BRIEF.md](BRIEF.md).

## Tooling note
`scripts/measure.py` / `correlate.py` / `palette.py` need Python, which is not installed on this Mac
(Apple command line tools missing). Until it is, the same gates run in the browser on a canvas
(`getImageData`) against the files served from `localhost:4321`. Same thresholds, same alpha cut (8).

## Asset manifest

| Family | File | Source | Status |
|---|---|---|---|
| MASTER | assets/src/master.png (2752x1536) | google/nano-banana-2.1, variation 3 of 4, req 01a18441-e631 | picked |
| SECOND STATE | assets/src/fired.png (2752x1536) | nano-banana-2.1/edit of master, variation 2 of 2, req 01a18442-bee6 | picked |
| MASTER cut-out | assets/src/popper-cut.png | bria/guided-remove-background, prompt keeps hand + cuff + popper + string | gated |
| SECOND STATE cut-out | assets/src/popper-fired-cut.png | same remover, prompt adds the burst | gated |
| FIGURE | img/sherman.png | Sherman's real photo, shirt edited to denim, birefnet Portrait | in use |
| SCENES | (pending) | one per section | |
| PROPS | (pending) | streamers, the cardboard sign, the bell, chat bubbles | |

Rejected: master v1, v2, v4 (v3 had the cleanest curtain, red rim on the knuckles, the most empty
space on the right for type). Fired v1: a second hand pulls the string and the camera zoomed in,
so it is out of register with the master.

## Gates

| Gate | closed (popper-cut) | fired (popper-fired-cut) | Pass |
|---|---|---|---|
| Resolution >= half master | 2752x1536 | 2752x1536 | yes |
| Alpha real (min < 8, max > 247) | 0 / 255 | 0 / 255 | yes |
| Dims = master | 2752x1536 | 2752x1536 | yes |
| Register, hand region (left 45%), both opaque, mad_255 < 12 | | 9.46 over 188,733 samples | yes |
| One component | arm enters from the left edge on purpose (ink l = 0) | burst pieces are separate on purpose | judged |

First attempt with fal-ai/birefnet/v2 (General Use Heavy) failed: it read the dark hand as
background and bit the popper where the fingers wrap it. A dark subject on a dark set needs a
steered remover.

## MEASURED (goes in the engine)
```
POPPER_INK   = {l: 0, r: .6911, t: .1094, b: .9993}   // popper-cut.png, alpha > 8
FIRED_INK    = {l: 0, r: .9996, t: .1738, b: .9993}   // popper-fired-cut.png
POPPER_MOUTH = {x: .6911, y: .3112}                    // rightmost opaque px, top half: where the burst starts
RATIO        = .5581                                   // h / w
```

## World assets (all google/nano-banana-2.1, 2K, one shared light clause: navy shadows, warm tungsten key from the left, red rim)

| Chapter | Scene | Notes |
|---|---|---|
| 00 Cold open | assets/scene-set.jpg | empty late night set; Sherman's cut-out stands on it |
| 01 The corner | assets/scene-corner.jpg | v1 had storefront lettering; removed by an edit of v1 (no text in generated images) |
| 02 On air | assets/scene-couch.jpg | a phone on a couch at night: "God talks normal" |
| 03 How it works | assets/scene-table.jpg | laptop + ring light on a kitchen table |
| 04 Watch | assets/scene-camera.jpg | studio camera, red tally light |
| 05 Your turn | assets/scene-after.jpg | the set after the show, confetti on the floor: the ending |
| PROP | assets/sign.png | blank cardboard; words typed by the page in Permanent Marker |
| SEAM-RIDER | assets/streamers.png | across the 01/02 and 04/05 junctions |

## Weight
Stills 4.4MB total (budget 4MB). Over by 0.4MB because the cut-outs ship as PNG: `sips` cannot write WebP
and Python/cwebp are not installed. WebP q.88 on the five cut-outs is the fix once tooling exists.
Originals in assets/src/ (not linked by the page).

## Engine decisions
- No GSAP, by decision: nothing is a timeline. Pose and sign turn are pure functions of scrollY.
- Lenis 1.1.14 (unpkg, pinned), lerp .1, off at <= 760px and under reduced motion. One rAF loop drives
  lenis.raf, the chapter bar, reveals, the stage, and the confetti physics.
- Confetti: WebLove Template 50 physics kept verbatim (gravity .22, flutter .18/.12, drag .992, floor fade
  .025, the scaleY flip). Ours: colors, the cone emitter, cannons on open and on sign-up.
  Deliberate absences: idle bursts, click-anywhere bursts, the signature cursor.
- Headline ceiling measured: lines probed unwrapped at 100px in a zero-size clipping host; ratios
  h1 special 6.742, h1 weekly 7.199, h2 air 7.298, h2 watch 5.073, h2 you 7.971. h1 also capped at 17% of
  the viewport height.

## Verification (in-app pane, Oct 28 2026)
| Check | Result |
|---|---|
| lenis.limit === scrollHeight - innerHeight at 1440x900 | 7831 === 7831 |
| Horizontal overflow at 375, 1440, 1600x500 | 0 (was 37px at 375: the 120vw streamers; fixed with overflow-x: clip on .seam) |
| Broken images | 0 |
| Console errors | 0 |
| Corner: sign turns, fires once at p = 1, re-arms below .4 | seen at 1440 and 375 |
| On air: one pop per word, popper clear of the punchline | 1440 yes; 375 failed at reading line .30, passes at .14 |
| Streamers never cover words | fixed: scenes z0, streamers z1, words z2 in the root stacking context |
| Hero headline clear of Sherman at 1440 | fixed by the measured fitter ("READINGS" overlapped before) |

## Not verified yet
- Reduced motion (CSS end state written: sign turned, all copy visible, no popper, no confetti) and
  no-JS: not emulated in the pane. Needs shoot.py once Python is installed.
- Real phones (Safari iOS sticky + svh).
- Form submission: needs the Netlify deploy.

## Open content
- Real stories from past shows (with permission) for an extra "On air" beat. Nothing invented.
- YouTube channel handle is unverified (CONFIG.youtube in party.js).
- The third punchline ("a guy in a denim shirt who laughs too loud") is Sherman's call.
- Sub pages (about, guests, episodes, contact, signup, how-it-works) still use the v1 style.css.

---
# v2 (Oct 28 2026): sticker-and-card collage, dark mode with loud color

v1 rejected: TV-set scenes, street corner, couch, streamers, hand-held popper. Brief rewritten (BRIEF.md v2).

## Assets (google/nano-banana-2.1, black-and-white studio on light grey, cut with fal-ai/birefnet/v2 Heavy)
| File | Ink box (l, r, t, b) | Notes |
|---|---|---|
| assets/v2/popper.png | .16 .82 .2378 .7622 | variation 1 of 3; mouth (max x-y opaque px) = (.74, .2622) |
| assets/v2/popper-fired.png | | edit of popper v1. First edit: cone IoU .772 (rotated, would jump). Re-edit with "cone must not move": IoU .998, pass |
| assets/v2/phone.png | .35 .6522 .1522 .8633 | |
| assets/v2/bell.png | .24 .7578 .2722 .7389 | |
| assets/v2/laptop.png | .1211 .9233 .2367 .7878 | |
| assets/v2/sherman.png | | the real photo (denim edit), grayscale by CSS filter |
All alpha 0 / 255. Birefnet worked first time here: light objects on light grey, unlike v1's dark hand on a dark set.

## Check-in build: preview-v2.html (hero + menu only), v2.css, v2.js
- Scar: every cut-out rendered 900px tall: width/height attributes with no `height: auto`. Fixed in the base img rule.
- Overflow at 375: 0. Console errors: 0.

## v2 full page (Oct 28 2026)
Sherman's notes on the check-in: loved the cards, hovers, confetti, the B&W photo. Asked for: a rolling weekly
countdown, texture so the dark isn't flat, swirls inside the cards, real paper and tape (not a clip-path),
a "what is prophecy" section for people who get sent the link, and the Oct 31 story without erasing the weekly page.

### New assets (Fal, google/nano-banana-2.1 on black, cut with birefnet Heavy, cropped to measured ink)
| File | Ink crop (px in 1000-wide export) | Use |
|---|---|---|
| assets/v2/scrap-a.png | 68,50 855x572 | sticker shape (mask) + its wrinkles (multiply) |
| assets/v2/scrap-b.png | 82,53 836x570 | the `.alt` sticker shape |
| assets/v2/scrap-c.png | 106,96 587x584 | spare (diagonal tear) |
| assets/v2/tape.png | 37,37 927x173 | masking tape on the poster, notes, verse, form |
| assets/v2/paper.jpg | full frame | page grain at 6%, card texture (multiply .55), the light section |
Card swirls: inline SVG (hand-drawn loops, zigzags, sparks) at 10%, fixed 280x200 tile, offset per card.

### Sections
Hero (rolling countdown) · Oct 31 poster (auto-hides after 9 PM Oct 31; Invite someone = Web Share / copy link) ·
the weekly menu · Start here (light section, 4 taped notes, 1 Cor 14:3 NIV with a pop per word) · How to get on (4 steps) ·
Watch (Up next, computed) · Sign up · Sticker wall footer.

### Schedule
nextShow(): the special until Oct 31 9 PM CDT, then the next Thursday 8 PM Central whose 90-minute window hasn't ended.
Recomputed every second; flips the page phase, the countdown label, "Up next", and the form's hidden show_at.
?phase=weekly previews the after state.

### Back end
- Neon "Afterparty" (still-hat-75930088): public.signups (id, name, email, phone, prayer, show_at, status
  requested|invited|declined, invited_at, emailed_at, created_at). Unique (lower(email), show_at). Index (show_at, status, created_at).
  EXPLAIN-verified: the insert's ON CONFLICT resolves to signups_email_show_uq; the invite UPDATE uses the pkey.
- netlify/functions/signup.mjs  POST /api/signup: validation, honeypot, show_at sanity window, dedupe.
- netlify/functions/admin.mjs   /api/admin: passcode login (timing-safe, 400ms delay), HMAC-signed HttpOnly cookie (12h),
  list, invite (marks invited; emails via Resend batch only if RESEND_API_KEY + MAIL_FROM + ZOOM_LINK are set; never emails twice),
  pass / back to waiting.
- admin/index.html: login, show + status filters, multi-select, select all, Invite + send Zoom link, Pass, CSV export.
- Original 2K assets moved out of the deploy folder to ../after-party-originals (226MB).

### Verified locally
375 and 1440: no horizontal overflow, no broken images, no console errors on the home page. Verse highlights full height
(the half bar left dark ink on the dark card). [hidden] made to win over .live-chip/.count display.
NOT verified: the functions (no Node on this Mac; they run only on Netlify), reduced motion, real iPhone.

## v2.2 (Oct 28 2026, pre-launch round)
Sherman: hero confused Thursday with Saturday; desktop felt empty; drop the prayer need (a word of knowledge has to
land as something we couldn't have known); a Holy Ghost on the Halloween poster; steps as a deck; wants GitHub + Netlify.

- Hero: Oct 31 copy only until Nov 1 12 AM CT (specialPageEnd), then "every Thursday, next up <date>". THU sticker removed.
- Schedule: countdown moves to the next Thursday at 9 PM Oct 31; weekly window 8 to 11 PM CT (weeklyLengthMin 180),
  so "next up" rolls to the following Thursday at 11 PM every week. Nothing to edit by hand.
- Prayer need removed from form, /api/signup and /admin (DB column left in place, nullable, unused).
- Desktop: --max 1320, full-width poster (h2 up to 124px), bigger menu cards, bigger hero.
- New Fal cut-outs (nano-banana-2.1 B&W on light grey, birefnet Heavy; all alpha 0/255, semi-transparent px < 7%):
  pencil, envelope, hourglass (steps 1 to 3), ghost (poster, variation 2 of 2: rounder, friendlier).
- How to get on: a sticky deck. Card i scales 1 - .07p, tips -4p deg, dims .35p as card i+1 slides over it
  (p measured with stickiness off: a stuck card reports its stuck offset). Card 4's popper fires on landing.
  Verified at 1440 and 375.
- Admin: lockout after 10 failed logins in 15 min (public.admin_attempts) because the passcode is 4 digits.
  Cookie key derived from DATABASE_URL + ADMIN_PASSCODE when SESSION_SECRET is unset.
- Repo layout: site in public/ (publish dir), functions in netlify/functions (outside publish, per Netlify docs),
  v1 leftovers moved to ../after-party-originals/v1-site.
- Netlify project created: theafterparty-26cm (id 80759a8f-4932-4e16-8d0f-18dd1fe52550). MAIL_FROM set.
  Visitor access currently requires Netlify team login (default); turn off at launch.
- Resend: theafterparty.tv verified, sending enabled, receiving disabled (replies to hello@ won't arrive).

## v2.3 (Oct 28 2026): emails, testimonies, /prophecy, /testify
Live-picking model (Sherman): people request before or during the show; Sherman picks live and may call names on air;
the Zoom link arrives during the show. Copy, steps (Request, Watch live, Check your email, Get your word) updated.

Emails (netlify/lib/email.mjs; table-based, inline styles, header image public/email/header.jpg rendered from og/email-header.html):
| Email | When | From |
|---|---|---|
| You're on the list | instantly on a new request (not on a duplicate) | signup.mjs |
| You're up | the moment Sherman picks someone in /admin | admin.mjs pick() |
| Thank you + testimony link | noon CT the next day, scheduled in Resend (scheduled_at) at pick time; once per sign-up | admin.mjs pick() |
| Live in an hour | scheduled function every 10 min; sends when the next show is 45 to 65 min away; once per person per show (email_log) | reminder.mjs, or /admin "Send reminder now" |
Reminder + request emails carry a signed one-click unsubscribe (/api/unsubscribe); reminders skip unsubscribes.
Every email: reply-to MAIL_REPLY_TO. Verified: all four render, no dashes, 4 to 6 KB of HTML.

Database (Neon): testimonies (scores 1 to 10 optional, testimony optional, one of them required, ok_to_share, source page|email,
signup_id link), email_log (kind, resend_id, status, unique reminder per show+email), unsubscribes.

Pages: /prophecy (copy researched by a sub-agent from helpmefindmyway.com + NIV, every reference checked; current NIV
Rev 19:10 wording), /testify (signed ?s=&t= link from the thank-you email skips name/email/phone).
Built by og/build_pages.py from the home page's own header/footer. Admin: Testimonies tab (averages, list, CSV), Send reminder now.
Syntax: every function and page script parsed in Chrome before deploy (no Node on this Mac).
