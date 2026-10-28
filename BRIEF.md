# The After Party: Brief v2 (immersive-site v2)

v1 (Oct 28, TV-set world, street corner, hand-held popper) was rejected by Sherman the same day:
"very much like TV show... that's not the full vibe." "The ribbon thing is atrocious." "Took it too literally."
The site is for The After Party, not for Live Spiritual Readings. Oct 31 is only the relaunch.

```
ARTIFACT:   The confetti popper, on its own (no hand). Black-and-white photographic cut-out; the
            confetti that comes out of it is the color.
IDEA:       The page pops the popper for every word.
WORLD:      A sticker-and-card collage on a phone screen: dark mode with loud color blocks, tilted
            cards, torn paper stickers with marker handwriting, hand-drawn doodles, grayscale cut-outs
            collaged onto color. (Reference: Sherman's "KASH" fintech shot.)
AUDIENCE:   People who already know what a prophetic word is. Many came to The After Party on
            Instagram Live since 2020. Some heard about it from someone who got a word. Re-engage them;
            don't introduce the prophetic.
TAGLINE:    "Where the supernatural meets media in a fun and creative way."
PALETTE:    ground near-black, paper off-white, Sherman red (primary action), pink, butter yellow
            (sampled from the reference's lilac/lime roles, re-colored to Sherman's pick).
TYPE:       Inter Tight 800 headlines (tight, friendly), Caveat Brush script accents ("today?" role),
            Permanent Marker on stickers, Anton for numbers (countdown). Inter Tight body.  count: 4
STAGING:    Seamless studio, grayscale, crisp, cut out. Objects break out of the edges of color cards.
            Sherman's photo: black-and-white cut-out on a color card with stickers and doodles.
TEMPO:      brisk with a bounce. Cards hover-tilt, stickers slap on, the pop is instant.
SECTIONS:   1. Hero: Sherman cut-out on a color card, tagline, "now on YouTube" sticker,
               Oct 31 relaunch banner + countdown. CTA: get a word.
            2. The menu: four tilted cards (Get a word / Subscribe / Join Thursday / Watch past shows),
               each with a B&W object breaking out of it.
            3. What a prophetic word is: 1 Corinthians 14:3 NIV. Strengthening, encouraging, comfort.
               One pop per word (three words, three pops).
            4. How it works: sign up, check your email for the Zoom link, wait in the waiting room,
               get your word.
            5. Watch: YouTube embed + subscribe + Thursday schedule.
            6. Sign up (name, email, phone, optional prayer need). Submitting is the last pop.
ENDING:     A sticker wall: "See you Thursday."
CTA:        "Get a word". Secondary everywhere: Subscribe.
MOBILE:     Full motion. Mobile first (Instagram audience).
LOADER:     None.
FILMS:      None.
DEVIATIONS: Two CTAs (YouTube growth). Light off-white section allowed inside dark mode (reference's
            middle screen). No Instagram handle on the form (people might think we looked at their page).
```

## Back end (after the hero check-in)
- Neon project "Afterparty" (still-hat-75930088): table `signups` (name, email, phone, prayer, show_date,
  status: requested / invited, invited_at, created_at).
- Netlify function `signup` writes to Neon. Netlify function(s) for /admin: passcode check server-side
  (env var, signed cookie), list sign-ups, multi-select, "Invite" marks them invited and (once Resend is
  connected) emails the Zoom link. Zoom link lives in an env var, one link, waiting room on.
- Resend: Sherman connects later; send step stubbed until then.
