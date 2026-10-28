/* THE AFTER PARTY / v2 engine
   Verb: the popper pops for every word. Where: the page opening, the Oct 31 poster landing,
   each of the three words in 1 Corinthians 14:3, the "Get a word" card, and a sent sign-up. */

/* ── MEASURED · assets/v2/popper.png (900x900, alpha > 8, browser canvas). Re-derive if replaced. ── */
const POPPER_MOUTH = { x: 0.74, y: 0.2622 };   // opaque px with max (x - y): the top-right lip of the foil cap
const POPPER_AIM_DEG = -40;                    // the cone points up-right at ~35deg in the source
// fired frame vs closed: cone IoU .998. The first edit was .772 and visibly jumped (BUILD-LOG).

/* ── GENERATED · Sherman's pick: red + pink + butter, with paper ── */
const COLORS = ["#e5413d", "#ff5a4e", "#ff9fcf", "#ffe27a", "#f6f2ea"];

/* ── SHOW DATA · edit here ── */
const CONFIG = {
  youtube: "https://www.youtube.com/@doingitwiththedumases",   // verified Oct 28: "Doing It With The Dumases"
  featuredVideoId: "",                                          // paste a video ID to play inline
  specialStart: Date.UTC(2026, 9, 31, 23, 0),                   // Sat Oct 31, 6 PM CDT
  specialEnd: Date.UTC(2026, 10, 1, 2, 0),                      // Sat Oct 31, 9 PM CDT: countdown moves to Thursday
  specialPageEnd: Date.UTC(2026, 10, 1, 5, 0),                  // Nov 1, 12 AM CDT: the Oct 31 copy and poster come down
  weeklyHour: 20,                                               // Thursdays, 8 PM Central
  weeklyFirst: Date.UTC(2026, 10, 6, 2, 0),                     // Thu Nov 5, 8 PM CST (DST ends Nov 1)
  weeklyLengthMin: 180,                                         // the show runs ~2.5h; at 11 PM CT "next up" rolls to next Thursday
  signupEndpoint: "/api/signup",
};

/* ── SHIPS UNTOUCHED · WebLove Template 50 physics (locked; colors and emitters are ours) ── */
const GRAVITY = 0.22, FLUTTER_STEP = 0.18, FLUTTER_PUSH = 0.12, DRAG = 0.992, FLOOR_FADE = 0.025;
const FIRED_MS = 1100;     // fired frame hold; shorter read as a glitch
const WORD_LINE = 0.62;    // a word "lands" when its top crosses 62% of the viewport; lower fired before it was read on a phone

document.documentElement.classList.add("js");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ================= CONFETTI ================= */
const cv = document.getElementById("confetti");
const ctx = cv.getContext("2d");
let W = 0, H = 0;
const paper = [];
function fit() { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); }
fit();
function piece(x, y, vx, vy) {
  paper.push({ x, y, vx, vy, w: Math.random() * 8 + 5, h: Math.random() * 5 + 4, rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.35, flut: Math.random() * Math.PI * 2, c: COLORS[(Math.random() * COLORS.length) | 0], life: 1 });
}
function cone(x, y, deg, n = 140) {
  if (reduced) return;
  for (let i = 0; i < n; i++) { const a = (deg + (Math.random() - 0.5) * 55) * Math.PI / 180, f = Math.random() * 12 + 8; piece(x, y, Math.cos(a) * f, Math.sin(a) * f); }
}
function cannons() {   // Template 50's side cannons: a sent sign-up, and the moment a show goes live
  if (reduced) return;
  for (let i = 0; i < 90; i++) { const l = i % 2 === 0; piece(l ? -8 : W + 8, H * 0.72, (l ? 1 : -1) * (Math.random() * 14 + 9), -(Math.random() * 13 + 7)); }
}
function stepConfetti() {
  if (!paper.length) return;
  ctx.clearRect(0, 0, W, H);
  for (let i = paper.length - 1; i >= 0; i--) {
    const p = paper[i];
    p.flut += FLUTTER_STEP; p.vy += GRAVITY; p.vx += Math.sin(p.flut) * FLUTTER_PUSH;
    p.vx *= DRAG; p.vy *= DRAG; p.x += p.vx; p.y += p.vy; p.rot += p.vr + Math.sin(p.flut) * 0.04;
    if (p.y > H * 0.82) p.life -= FLOOR_FADE;
    if (p.life <= 0 || p.y > H + 40) { paper.splice(i, 1); continue; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.abs(Math.sin(p.flut)) * 0.8 + 0.2);
    ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (!paper.length) ctx.clearRect(0, 0, W, H);
}
/* Deliberate absences from Template 50: no idle bursts, no click-anywhere bursts, no custom cursor. */

/* fire a popper: swap to the matched fired frame, spray from the measured mouth.
   One rect read per pop (an event, not a frame). The element's CSS rotation is added to the aim. */
function pop(el, extraDeg = 0, n) {
  const img = el && el.querySelector(".closed");
  if (!img) return;
  const r = img.getBoundingClientRect();
  el.classList.add("is-fired");
  clearTimeout(el.__t); el.__t = setTimeout(() => el.classList.remove("is-fired"), FIRED_MS);
  cone(r.left + POPPER_MOUTH.x * r.width, r.top + POPPER_MOUTH.y * r.height, POPPER_AIM_DEG + extraDeg, n);
}

/* ================= WORDS THAT POP ON ARRIVAL =================
   [data-pop] elements fire once when their top crosses WORD_LINE; they re-arm if you scroll back above.
   Offsets are measured on load/resize (no rect reads in the loop). */
const words = [...document.querySelectorAll("[data-pop]")].map((el) => ({
  el, top: 0, armed: true,
  popper: el.dataset.pop ? document.querySelector(el.dataset.pop) : el.querySelector(".popper-el"),
  aim: parseFloat(el.dataset.aim || "0"), n: parseInt(el.dataset.n || "120", 10),
}));
const docTop = (el) => { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };
function measure() { fit(); words.forEach((w) => (w.top = docTop(w.el))); }
let lastY = -1;
function checkWords() {
  const y = scrollY;
  if (y === lastY) return;
  lastY = y;
  const line = y + innerHeight * WORD_LINE;
  for (const w of words) {
    if (w.armed && w.top < line) {
      w.armed = false; w.el.classList.add("on");
      if (w.popper) pop(w.popper, w.aim, w.n);
    } else if (!w.armed && w.top > line + innerHeight * 0.25) {
      w.armed = true; w.el.classList.remove("on");
    }
  }
}
function frame() { checkWords(); updateStack(); stepConfetti(); requestAnimationFrame(frame); }
let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { measure(); lastY = -1; }, 120); });
addEventListener("load", () => { measure(); lastY = -1; });
document.fonts && document.fonts.ready.then(() => { measure(); lastY = -1; });
measure();
requestAnimationFrame(frame);

// the page opens with a pop
const heroPopper = document.querySelector(".hero-popper");
if (heroPopper) setTimeout(() => pop(heroPopper), 650);

// "Get a word" pops on hover (mouse) and on tap, then goes to the form
const wordCard = document.querySelector(".c-word");
if (wordCard) {
  let armed = true;
  wordCard.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && armed) { armed = false; pop(wordCard, -8); } });
  wordCard.addEventListener("pointerleave", () => { armed = true; });
  wordCard.addEventListener("click", (e) => {
    if (reduced) return;
    e.preventDefault(); pop(wordCard, -8);
    setTimeout(() => { document.querySelector(wordCard.getAttribute("href"))?.scrollIntoView({ behavior: "smooth" }); }, 420);
  });
}

/* ================= SCHEDULE: Oct 31 special, then every Thursday 8 PM Central ================= */
const TZ = "America/Chicago";
function chiOffset(ms) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .formatToParts(new Date(ms)).reduce((o, x) => ((o[x.type] = x.value), o), {});
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
}
function chiToUtc(y, m, d, h) { const g = Date.UTC(y, m, d, h); return g - chiOffset(g - chiOffset(g)); }
function nextThursday(now) {
  const len = CONFIG.weeklyLengthMin * 6e4;
  if (now < CONFIG.weeklyFirst + len) return CONFIG.weeklyFirst;
  const t = new Date(now + chiOffset(now));
  for (let i = 0; i < 9; i++) {
    const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + i));
    if (d.getUTCDay() !== 4) continue;
    const s = chiToUtc(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), CONFIG.weeklyHour);
    if (now < s + len) return s;
  }
  return CONFIG.weeklyFirst;
}
/* the next broadcast, recomputed every second so the page rolls over on its own:
   the special until 9 PM Oct 31, then the next Thursday, forever. ?phase=weekly previews the after state. */
const forced = new URLSearchParams(location.search).get("phase");
function nextShow(now = Date.now()) {
  const special = forced === "special" || (!forced && now < CONFIG.specialEnd);
  if (special) return { special: true, start: CONFIG.specialStart, end: CONFIG.specialEnd };
  const start = nextThursday(forced === "weekly" ? Math.max(now, CONFIG.specialEnd) : now);
  return { special: false, start, end: start + CONFIG.weeklyLengthMin * 6e4 };
}
const fmt = (ms, o) => new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...o }).format(ms);
const countEls = document.querySelectorAll("[data-count]");
const liveEls = document.querySelectorAll("[data-live]");
let wasLive = false, lastPhase = "";
function tick() {
  const now = Date.now(), s = nextShow(now), live = now >= s.start && now < s.end;
  // the page keeps its Oct 31 face until midnight that night; the countdown moves to Thursday at 9 PM
  const phase = forced ? (forced === "weekly" ? "weekly" : "special") : (now < CONFIG.specialPageEnd ? "special" : "weekly");
  if (phase !== lastPhase) {
    lastPhase = phase;
    document.documentElement.dataset.phase = phase;
    document.querySelectorAll("[data-next-label]").forEach((el) => (el.textContent = s.special ? "Relaunch in" : "Next show in"));
    document.querySelectorAll("[data-next-date]").forEach((el) => (el.textContent = fmt(s.start, { weekday: "short", month: "short", day: "numeric" }) + ", " + fmt(s.start, { hour: "numeric", minute: "2-digit" }) + " CT"));
    document.querySelectorAll("input[name=show_at]").forEach((el) => (el.value = new Date(s.start).toISOString()));
    measure(); lastY = -1;
  }
  let left = Math.max(0, s.start - now);
  const d = Math.floor(left / 864e5); left -= d * 864e5;
  const h = Math.floor(left / 36e5); left -= h * 36e5;
  const m = Math.floor(left / 6e4); left -= m * 6e4;
  const sec = Math.floor(left / 1e3);
  const p = (n) => String(n).padStart(2, "0");
  countEls.forEach((el) => { el.hidden = live; el.innerHTML = `${p(d)}<small>D</small>${p(h)}<small>H</small>${p(m)}<small>M</small>${p(sec)}<small>S</small>`; });
  liveEls.forEach((el) => (el.hidden = !live));
  if (live && !wasLive) cannons();
  wasLive = live;
}
tick(); setInterval(tick, 1000);

// "Up next": the next three broadcasts, computed, never typed
const upnext = document.querySelector("[data-upnext]");
if (upnext) {
  const items = []; let t = Date.now();
  for (let i = 0; i < 3; i++) { const s = nextShow(t); items.push(s); t = s.end + 1; }
  upnext.innerHTML = items.map((s, i) => `<li><span><b>${s.special ? "Live Spiritual Readings" : "The After Party"}</b><br>${fmt(s.start, { weekday: "long", month: "short", day: "numeric" })}, ${fmt(s.start, { hour: "numeric", minute: "2-digit" })} CT</span><span class="pill">${i === 0 ? "Up next" : s.special ? "Relaunch" : "Weekly"}</span></li>`).join("");
}

/* ================= LINKS ================= */
document.querySelectorAll("[data-yt]").forEach((a) => { a.href = a.dataset.yt === "sub" ? CONFIG.youtube + "?sub_confirmation=1" : CONFIG.youtube; a.target = "_blank"; a.rel = "noopener"; });
const face = document.querySelector(".player-face");
if (face && CONFIG.featuredVideoId) face.addEventListener("click", (e) => {
  e.preventDefault();
  const f = document.createElement("iframe");
  f.src = `https://www.youtube-nocookie.com/embed/${CONFIG.featuredVideoId}?autoplay=1&rel=0`;
  f.allow = "autoplay; encrypted-media; picture-in-picture"; f.allowFullscreen = true; f.title = "The After Party on YouTube";
  face.parentElement.replaceChildren(f);
});

/* ================= INVITE SOMEONE (the site doubles as the invitation) ================= */
document.querySelectorAll("[data-share]").forEach((btn) => btn.addEventListener("click", async () => {
  const url = location.origin + location.pathname;
  const text = btn.dataset.share;
  const note = btn.parentElement.querySelector(".copied");
  try {
    if (navigator.share) { await navigator.share({ title: "The After Party", text, url }); return; }
    await navigator.clipboard.writeText(text + " " + url);
    if (note) note.textContent = "Link copied. Send it to someone.";
  } catch { if (note) note.textContent = url; }
}));

/* ================= SIGN-UP → Netlify function → Neon ================= */
const form = document.querySelector("form[data-signup]");
if (form) form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const wrap = form.closest("[data-form]");
  const btn = form.querySelector("[type=submit]");
  const err = form.querySelector("[data-error]");
  const label = btn.innerHTML;
  btn.disabled = true; btn.textContent = "Sending...";
  err.hidden = true;
  try {
    const body = Object.fromEntries(new FormData(form));
    const res = await fetch(CONFIG.signupEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "That didn't go through.");
    wrap.classList.add("is-done");
    wrap.querySelector(".done").focus();
    pop(document.querySelector(".form-popper"), 0, 160);
    cannons();
  } catch (x) {
    err.textContent = (x && x.message) || "That didn't go through. Try again in a minute.";
    err.hidden = false; btn.disabled = false; btn.innerHTML = label;
  }
});

/* ================= THE DECK (How to get on) =================
   Steps are sticky cards. For each card i, p = how far card i+1 has slid over it:
   0 when i+1's top meets i's bottom, 1 when i+1 reaches its own sticky line.
   Card i then scales to 1 - DECK_SCALE*p, tips back DECK_TIP*p degrees and dims to DECK_DIM*p.
   Natural tops are measured with stickiness switched off (a stuck card reports its stuck offset). */
const DECK_SCALE = 0.07;   // .12 made the back cards read as a different size of card
const DECK_TIP = 4;        // degrees; more looked like the card was falling, not filing behind
const DECK_DIM = 0.35;     // the covered card steps back into the dark
const stack = document.querySelector(".stack");
const cards = stack ? [...stack.querySelectorAll(".step")] : [];
const deck = cards.map((el) => {
  const shade = document.createElement("span"); shade.className = "shade"; el.appendChild(shade);
  const tilt = parseFloat(getComputedStyle(el).getPropertyValue("--tilt")) || 0;
  return { el, shade, tilt, top: 0, h: 0, stick: 0, last: "" };
});
let deckOn = !!deck.length && !reduced, stepArmed = true;
function measureStack() {
  if (!deckOn) return;
  stack.classList.add("measuring");
  const base = docTop(stack);
  deck.forEach((c) => { c.top = base + c.el.offsetTop; c.h = c.el.offsetHeight; });
  stack.classList.remove("measuring");
  deck.forEach((c) => { c.stick = parseFloat(getComputedStyle(c.el).top) || 0; c.last = ""; });
}
function updateStack() {
  if (!deckOn) return;
  const y = scrollY;
  for (let i = 0; i < deck.length; i++) {
    const c = deck[i], n = deck[i + 1];
    let p = 0;
    if (n) {
      const y0 = n.top - (c.stick + c.h), span = Math.max(1, c.stick + c.h - n.stick);
      p = Math.max(0, Math.min(1, (y - y0) / span));
    }
    const t = `scale(${(1 - DECK_SCALE * p).toFixed(4)}) rotate(${(c.tilt - DECK_TIP * p).toFixed(2)}deg)`;
    if (t !== c.last) { c.el.style.transform = t; c.shade.style.opacity = (DECK_DIM * p).toFixed(3); c.last = t; }
  }
  // the last card is "Get your word": its popper fires when it lands on the deck
  const last = deck[deck.length - 1];
  if (stepArmed && y >= last.top - last.stick - 4) { stepArmed = false; pop(document.getElementById("stepPopper"), 0, 150); }
  else if (!stepArmed && y < last.top - last.stick - innerHeight * 0.3) stepArmed = true;
}
measureStack();
addEventListener("load", measureStack);
addEventListener("resize", () => setTimeout(measureStack, 140));
document.fonts && document.fonts.ready.then(measureStack);
