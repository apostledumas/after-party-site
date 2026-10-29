"""Builds public/prophecy/index.html and public/testify/index.html from the home page's own header, icons and
footer, so every page shares one shell. Run from the repo root:  python3 og/build_pages.py
Copy rules: no em or en dashes anywhere (Sherman). Scripture: NIV, short quotes, cited."""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent / "public"
home = (ROOT / "index.html").read_text()
grab = lambda start, end: home[home.index(start): home.index(end, home.index(start)) + len(end)]
icons = grab('<svg width="0" height="0"', "</svg>")
top = grab('<header class="top">', "</header>").replace('href="#top"', 'href="/"').replace('href="#signup"', 'href="/#signup"')
foot = grab('<footer class="foot">', "</footer>")


def page(path, title, desc, body, extra_js=""):
    html = f'''<!doctype html>
<html lang="en" data-phase="weekly">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title} | The After Party</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#121110">
<link rel="canonical" href="https://theafterparty.tv/{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="The After Party">
<meta property="og:url" content="https://theafterparty.tv/{path}">
<meta property="og:title" content="{title} | The After Party">
<meta property="og:description" content="{desc}">
<meta property="og:image" content="https://theafterparty.tv/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://theafterparty.tv/og.jpg">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/og-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;700;800&family=Caveat+Brush&family=Permanent+Marker&family=Anton&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/v2.css">
</head>
<body class="sub-page">
{icons}
{top}
<main id="top">
{body}
</main>
{foot}
<canvas id="confetti" aria-hidden="true"></canvas>
<script src="/v2.js"></script>{extra_js}
</body>
</html>
'''
    html = html.replace('src="assets/', 'src="/assets/')
    assert not re.search("[–—]", html), f"dash in {path}"
    d = ROOT / path
    d.mkdir(exist_ok=True)
    (d / "index.html").write_text(html)
    print("wrote", d / "index.html")


TAPE = '<img class="tape" src="/assets/v2/tape.png" width="600" height="112" alt="">'
POPPER = lambda pid, style="": f'''<div class="mini" id="{pid}" style="{style}" aria-hidden="true"><img class="closed" src="/assets/v2/popper.png" width="900" height="900" alt=""><img class="fired" src="/assets/v2/popper-fired.png" width="900" height="900" alt=""></div>'''


# ---------------------------------------------------------------- /prophecy
# v2 (Oct 28, Sherman): "I just wanted some of those cutouts... to make it flow a little bit bigger."
# Every section gets a B&W cut-out on the right (the sticky title owns the left column on desktop).
# Cut-outs: Fal nano-banana-2.1 on light grey, birefnet v2, cropped to ink (pr-*.png). Floats use
# shape-outside so the text wraps the object, not its box.
def art(name, w, h, style=""):
    return f'<img class="pr-art" src="/assets/v2/pr-{name}.png" width="{w}" height="{h}" alt="" loading="lazy" style="shape-outside:url(/assets/v2/pr-{name}.png);{style}">'


def fig(name, w, h, cap, cls=""):
    return f'<figure class="{cls}"><img src="/assets/v2/pr-{name}.png" width="{w}" height="{h}" alt="" loading="lazy"><figcaption>{cap}</figcaption></figure>'


def sec(n, h, body, scripture, color="", quote=None, cite=None, art_html=""):
    q = f'<figure class="pq">{TAPE}<blockquote>"{quote}"</blockquote><cite>{cite}</cite></figure>' if quote else ""
    return f'''<section class="pr-sec{(" " + color) if color else ""}">
  <div class="wrap pr-grid">
    <div class="pr-head"><span class="pr-n">{n:02d}</span><h2 class="h h-lg">{h}</h2></div>
    <div class="pr-body">{art_html}{body}{q}<p class="pr-ref"><b>Scripture</b> {scripture}</p></div>
  </div>
</section>'''


GIFTS = """<details class="pr-gifts"><summary>See every spiritual gift in the Bible</summary><div class="gl">
<div><h4>1 Corinthians 12:8-10</h4><p>Word of wisdom, word of knowledge, faith, gifts of healing, miracles, prophecy, discerning of spirits, speaking in tongues, interpreting tongues.</p></div>
<div><h4>1 Corinthians 12:28</h4><p>Apostles, prophets, teachers, miracles, healing, helping, guidance, different kinds of tongues.</p></div>
<div><h4>Romans 12:6-8</h4><p>Prophecy, serving, teaching, encouraging, giving, leading, mercy.</p></div>
<div><h4>Ephesians 4:11</h4><p>Apostles, prophets, evangelists, pastors, teachers.</p></div>
<div><h4>1 Peter 4:10-11</h4><p>Speaking and serving. Each one uses whatever gift they've received to serve others.</p></div>
<div><h4>Mark 16:17-18</h4><p>Driving out demons in Jesus' name, new tongues, laying hands on the sick so they get well.</p></div>
</div></details>"""

COLLAGE = '<div class="pr-collage">' + "".join([
    fig("temple", 600, 412, "The temple"),
    fig("bush", 406, 600, "A burning bush"),
    fig("church", 600, 319, "The megachurch"),
    '<figure><img src="/assets/v2/step-phone.png" alt="" loading="lazy"><figcaption>Your phone</figcaption></figure>',
]) + '<p class="pr-collage-cap">Same voice. Every room.</p></div>'

LINEUP = '<div class="pr-lineup">' + "".join([
    fig("prophet", 589, 720, '<span class="sticker butter">Old school</span>'),
    fig("business", 377, 720, '<span class="sticker">9 to 5</span>'),
    fig("nurse", 444, 720, '<span class="sticker butter alt">Night shift</span>'),
]) + '</div>'

NO_SIGN = '''<div class="pr-no" aria-hidden="true"><img src="/assets/v2/pr-crystal.png" width="440" height="600" alt="" loading="lazy"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42"/><path d="M20 80 L80 20"/></svg></div>'''

TRIO = f'''<p>These get mixed up a lot. Here's a simple way to think about it.</p>
<div class="pr-trio">
  <div class="note tex" style="--tilt:-1deg">{TAPE}<span class="kick">The spirit of prophecy</span><h3>Prophesying</h3><p>Something anyone can do when the Spirit moves. Paul said "you can all prophesy." Philip had four daughters who prophesied. King Saul walked into a group of prophets and started prophesying too. God even spoke through a donkey once. You don't need a title to hear God for someone.</p><span class="ref">1 Cor 14:31 · Acts 21:9 · 1 Sam 10:10 · Num 22:28</span></div>
  <div class="note tex" style="--tilt:.8deg;background:var(--pink)">{TAPE}<span class="kick">The gift of prophecy</span><h3>Prophetic</h3><p>Hearing God has become a regular part of your life. You notice His nudges, and you share them often. It's a gift that lives in you. Paul told Timothy to "fan into flame the gift of God" so it doesn't go cold. And God doesn't take His gifts back. They're irrevocable.</p><span class="ref">Rom 12:6 · 2 Tim 1:6 · 1 Tim 4:14 · Rom 11:29</span></div>
  <div class="note tex" style="--tilt:-.6deg;background:var(--butter)">{TAPE}<span class="kick">The office</span><h3>Prophet</h3><p>A calling. A role God gives some people to serve and train the wider church. "Are all prophets?" No. Everyone can prophesy. Not everyone is a prophet.</p><span class="ref">Eph 4:11 · 1 Cor 12:28-29</span></div>
</div>'''

SECS = [
sec(1, "What prophecy actually is",
     "<p>Prophecy is God speaking through a person. That's it. It isn't mainly about predicting the future. It's about sharing God's heart with someone, so they know He sees them.</p><p>The Bible gives prophecy a simple job description: build people up, cheer them on, bring comfort. If a \"word\" leaves you crushed, scared or confused, something went wrong.</p>",
     "1 Corinthians 14:3", "",
     "The one who prophesies speaks to people for their strengthening, encouraging and comfort.", "1 Corinthians 14:3 (NIV)",
     art("bible", 599, 600, "--r:-6deg")),
sec(2, "Prophecy has some cousins",
     "<p>Prophecy is one of several gifts the Holy Spirit hands out. A few of its cousins show up on the show a lot:</p><ul class=\"pr-list\"><li><b>Word of knowledge.</b> God shows you a fact you had no natural way of knowing. A name, a place, a situation.</li><li><b>Word of wisdom.</b> God shows you what to do about it. The next step.</li><li><b>Discerning of spirits.</b> Sensing what's really going on spiritually, whether something is from God or not.</li><li><b>Gifts of healing.</b> God heals bodies, minds and hearts. Sometimes on the spot.</li><li><b>Miracles.</b> God steps in and does what nature can't.</li><li><b>Deliverance.</b> Jesus said His followers would drive out demons in His name. Freedom from whatever's been holding you.</li></ul><p>Same Spirit, different people, for the good of everyone. Not trophies. Tools for helping people.</p>" + GIFTS,
     "1 Corinthians 12:7-11; Mark 16:17-18", "alt",
     "Now to each one the manifestation of the Spirit is given for the common good.", "1 Corinthians 12:7 (NIV)",
     art("gift", 476, 600, "--r:5deg")),
sec(3, "Does God still talk today?",
     COLLAGE + "<p>Yes. Some people believe these gifts ended when the Bible was finished. We get it, but the Bible itself doesn't say that.</p><p>On the very first day of the church, Peter quoted the prophet Joel: in the last days God would pour out His Spirit and ordinary people would prophesy. We're still in those last days. Jesus said His sheep hear His voice, present tense. Paul told the church to eagerly desire prophecy, said \"you can all prophesy,\" and warned them not to treat it with contempt.</p><p>Paul does say prophecy will stop one day: when we see Jesus face to face. That hasn't happened yet. And the gifts were given \"until we all reach unity in the faith.\" Look around. We're not there yet either.</p>",
     "Joel 2:28-29; Acts 2:17-18; John 10:27; 1 Corinthians 14:1, 14:31; 1 Corinthians 13:8-12; Ephesians 4:11-13; 1 Thessalonians 5:19-21", "",
     "My sheep listen to my voice; I know them, and they follow me.", "John 10:27 (NIV)"),
sec(4, "Yes, prophets still exist",
     LINEUP + "<p>Prophets didn't vanish with the Old Testament. The New Testament church had them too.</p><p>A prophet named Agabus predicted a famine, and it happened. Later he warned Paul about what was waiting for him in Jerusalem. The church in Antioch had prophets and teachers leading together. Judas and Silas, both prophets, spent their time encouraging and strengthening believers. And Jesus Himself gave prophets to the church, right alongside pastors and teachers, to equip people and build them up.</p><p><b>And look who God uses.</b> Amos said, \"I was neither a prophet nor the son of a prophet, but I was a shepherd.\" Deborah was a prophet and led a nation. Daniel worked in government. A prophet today might be a nurse on the night shift, a guy with a briefcase, a barber, a teacher. No robe required. God picks who He picks.</p>",
     "Ephesians 4:11-12; Acts 11:27-28; Acts 21:10-11; Acts 13:1; Acts 15:32; Amos 7:14-15; Judges 4:4", "alt",
     "Judas and Silas, who themselves were prophets, said much to encourage and strengthen the believers.", "Acts 15:32 (NIV)"),
sec(5, "Prophesying, prophetic, prophet", TRIO,
     "1 Corinthians 14:31; Acts 21:9; 1 Samuel 10:10; Numbers 22:28; Romans 12:6; 2 Timothy 1:6; Romans 11:29; 1 Corinthians 12:28-29; Ephesians 4:11", "dark"),
sec(6, "Prophets are not psychics",
     NO_SIGN + "<p>From the outside it can look similar. Someone tells you something true about your life that they had no way of knowing. But the source and the purpose are completely different.</p><p><b>Different source.</b> The Bible clearly warns against fortune telling, mediums and contacting the dead. Not because they're always wrong, but because they tap the wrong source. In Acts 16 a fortune-telling slave girl followed Paul around saying true things about him. Paul didn't hire her. He cast the spirit out in Jesus' name.</p><p class=\"pr-big\">Accurate isn't the same as from God.</p><p><b>Different purpose.</b> Prophecy points to Jesus. It's never for sale. When a man named Simon tried to buy the Spirit's power, Peter shut it down hard. Prophecy is never a tool for control, fear or keeping you coming back. It's meant to connect you to God yourself.</p>",
     "Deuteronomy 18:10-12; Leviticus 19:31; Acts 16:16-18; Acts 8:18-20; Revelation 19:10", "",
     "For it is the Spirit of prophecy who bears testimony to Jesus.", "Revelation 19:10 (NIV)"),
sec(7, "How to test a word",
     "<p>You don't have to swallow everything someone says just because they said \"God told me.\" The Bible actually tells you to test it. Every time.</p><ol class=\"pr-list\"><li><b>Does it line up with the Bible?</b> God won't contradict Himself.</li><li><b>Does it point to Jesus?</b> Or to the person giving it?</li><li><b>Does it build you up?</b> Strengthen, encourage, comfort. That's the target.</li><li><b>What's the fruit?</b> Look at the character of the person and what the word produces over time.</li></ol><p>Prophecy comes through humans, and humans miss it sometimes. Some words make sense right away. Some click later. Pray about it, hold on to what's good, and let the rest go.</p>",
     "1 John 4:1; 1 Thessalonians 5:20-21; Matthew 7:15-20", "alt",
     "Do not treat prophecies with contempt but test them all; hold on to what is good.", "1 Thessalonians 5:20-21 (NIV)",
     art("magnifier", 506, 600, "--r:8deg")),
sec(8, "Record your word",
     "<p>When you get a word, catch it. Record it on a second phone, write it down, grab a notepad. Every show stays on YouTube too, so you can always go back to the exact minute.</p><p>Some words land the second you hear them. You cry, you laugh, you just know. Others don't make sense yet. A prophetic word isn't only confirmation of what you already know. Sometimes it's about a door that hasn't opened yet, a person you haven't met yet, a season that's still coming. When it shows up, you'll want the receipts.</p><p>Mary heard things about her son she couldn't explain yet, so she held on to them. Paul told Timothy to use the words spoken over him to fight his battles. You can't fight with a word you forgot.</p>",
     "Habakkuk 2:2; Luke 2:19; 1 Timothy 1:18", "",
     "Write down the revelation and make it plain on tablets so that a herald may run with it.", "Habakkuk 2:2 (NIV)",
     art("recorder", 564, 600, "--r:-4deg")),
sec(9, "God's word does what it says",
     "<p>God's words aren't just information. They're power. He said \"let there be light,\" and there was light. He calls into being things that were not. When God says something, it happens.</p><p>That's part of why God can't lie. Yes, He's good and pure. But there's more: His word is so powerful that whatever He says becomes true. If God said this table was white, it would turn white. Sometimes He uses a prophetic word to change a thing.</p><p>Gideon was hiding in a winepress when an angel called him \"mighty warrior.\" He wasn't one yet. The word made him one. Samuel grew up with God, and none of his words fell to the ground. Elisha said that about this time tomorrow a starving city would have food to spare, and by the next day it did.</p><p><b>Foretelling and forthtelling.</b> Sometimes prophecy tells you what's coming. That's foretelling. Sometimes it speaks God's word into right now, and the word itself starts the change. That's forthtelling. Ezekiel prophesied to a valley of dry bones, and while he was still talking, the bones came together.</p>",
     "Genesis 1:3; Romans 4:17; Numbers 23:19; Isaiah 55:11; Judges 6:12; 1 Samuel 3:19; 2 Kings 7:1; Ezekiel 37:7", "dark",
     "It will not return to me empty, but will accomplish what I desire.", "Isaiah 55:11 (NIV)",
     art("table", 570, 600, "--r:3deg")),
sec(10, "Made for outsiders",
     "<p>Jesus used this with people who weren't religious at all.</p><p>He met a woman at a well and told her about her five husbands. She'd never met Him. She ran back to town saying, \"Come, see a man who told me everything I ever did,\" and many people believed because of what she said. Jesus told a skeptic named Nathanael where he'd been sitting before they ever met. Nathanael went from doubter to \"you are the Son of God\" in about two sentences.</p><p>Paul said the same thing can happen in a room today. An outsider walks in, hears prophecy, the secrets of their heart are laid bare, and they say, \"God is really among you!\"</p>",
     "John 4:16-19, 29, 39; John 1:47-49; 1 Corinthians 14:24-25", "alt",
     "Come, see a man who told me everything I ever did.", "John 4:29 (NIV)"),
]

prophecy = f'''
<section class="hero pr-hero">
  <div class="wrap pr-hgrid">
    <div class="pr-left">
      <span class="sticker butter kicker">Start here</span>
      <h1 class="h pr-word" data-pop="#prPopper" data-aim="-10" data-n="220">Prophecy, <span class="script">plainly.</span></h1>
      <div class="pr-stage" aria-hidden="true">
        <img class="pr-mic" src="/assets/v2/pr-mic.png" width="297" height="600" alt="">
        {POPPER("prPopper")}
      </div>
    </div>
    <div class="pr-right">
      <p class="pr-god">God still <span>speaks.</span></p>
      <p class="lede">Here's what that means, what it doesn't, and why we do it live on YouTube every Thursday.</p>
      <p class="lede">Maybe you grew up in church and heard the word "prophecy" a hundred times. Maybe you've only heard it in a movie trailer. Either way, you're in the right place. No secret handshake required.</p>
    </div>
  </div>
</section>

{SECS[0]}

{SECS[1]}

{SECS[2]}

{SECS[3]}

{SECS[4]}

{SECS[5]}

{SECS[6]}

{SECS[7]}

{SECS[8]}

{SECS[9]}

<section class="pr-sec why">
  <div class="wrap">
    <article class="poster tex pr-why" data-pop="#prPopper2" data-aim="0" data-n="140">
      {TAPE.replace('class="tape"', 'class="tape t1"')}{TAPE.replace('class="tape"', 'class="tape t2"')}
      {POPPER("prPopper2", "position:absolute;right:-10px;top:-50px;width:clamp(90px,12vw,150px);transform:rotate(14deg)")}
      <span class="pr-n" style="color:var(--ink)">11</span>
      <h2 class="h">Why The After Party <span class="script">exists</span></h2>
      <p>That's the whole point of the show. God knows people. He knows you. And sometimes the fastest way to show someone God is real is to let Him say something only He could know.</p>
      <p>It's also why we do Live Spiritual Readings around Halloween, the one night a year people go looking for the supernatural. We meet them there. Strangers hear things about their life. Then we tell them who it's from: not the stars, not a deck of cards. Jesus. And it's free, because you can't sell what God gives away.</p>
      <p class="pr-ref"><b>Scripture</b> 1 Corinthians 14:24-25; Acts 8:20</p>
    </article>
  </div>
</section>

<section class="sec">
  <div class="wrap">
    <h2 class="h h-lg">Quick <span class="script">answers.</span></h2>
    <div class="cards pr-faq">
      <div class="card c-word tex"><span><h3>Is prophecy just predicting the future?</h3><p>No. Mostly it's God showing someone they're seen and loved.</p></span></div>
      <div class="card c-sub tex"><span><h3>Do I have to be a Christian to come on?</h3><p>No. Come curious. God speaks to people who don't know Him yet.</p></span></div>
      <div class="card c-thu tex"><span><h3>Does it cost anything?</h3><p>Never. Prophecy is a gift, not a product.</p></span></div>
      <div class="card c-watch tex"><span><h3>What if a word doesn't fit?</h3><p>Pray about it, test it, hold on to what's good. Some words make sense later.</p></span></div>
      <div class="card c-sub tex"><span><h3>Can I learn to prophesy?</h3><p>If you follow Jesus, yes. Paul said "you can all prophesy."</p></span></div>
      <div class="card c-word tex"><span><h3>Is this a psychic reading?</h3><p>No. Different source, different purpose. Prophecy always points to Jesus.</p></span></div>
    </div>
    <div class="btns" style="margin-top:44px">
      <a class="btn btn-red" href="/#signup"><i><svg><use href="#i-arrow"/></svg></i>Request to come on</a>
      <a class="btn btn-paper" data-yt="sub" href="https://www.youtube.com/@doingitwiththedumases?sub_confirmation=1"><i><svg><use href="#i-yt"/></svg></i>Watch Thursdays, 8 PM CT</a>
    </div>
  </div>
</section>
'''
page("prophecy", "What is prophecy?", "God still speaks. What prophecy is, why God still talks today, prophets vs psychics, and how to test a word. Plain answers with Scripture.", prophecy)

# ---------------------------------------------------------------- /testify
scale = lambda name, label: f'''<fieldset class="scale"><legend>{label} <em>(optional)</em></legend><div class="scale-row">''' + "".join(
    f'<label><input type="radio" name="{name}" value="{i}"><span>{i}</span></label>' for i in range(1, 11)) + '</div><div class="scale-ends"><span>Not at all</span><span>Completely</span></div></fieldset>'

testify = f'''
<section class="hero">
  <div class="wrap">
    <span class="sticker butter kicker">Testify</span>
    <h1 class="h h-xl">What did God <span class="script">do?</span></h1>
    <p class="lede" style="margin-top:18px">Got a word on The After Party, last night or years ago? Tell us how it landed. Give it a score, tell the story, or both. Your testimony might be exactly what someone else needs to hear.</p>
    <p class="lede" style="margin-top:12px">Did a word come true? Did it change a decision, heal something, open a door? We want to hear it. So does somebody else.</p>
  </div>
</section>
<section class="sec" style="padding-top:0">
  <div class="wrap signup-grid">
    <div class="signup-aside">
      <h2 class="h h-lg">Two numbers.<br>One <span class="script">story.</span></h2>
      <p class="lede">A rating or a testimony. Either one works, both is even better.</p>
      <span class="sticker alt">We ask before we share</span>
    </div>
    <div class="form-card tex" data-form>
      {TAPE.replace('class="tape"', 'class="tape t1"')}{TAPE.replace('class="tape"', 'class="tape t2"')}
      {POPPER("formPopper", "position:absolute;right:-16px;top:-46px;width:96px;transform:rotate(12deg);pointer-events:none").replace('id="formPopper"', 'id="formPopper" class="form-popper"').replace('class="mini" id="formPopper" class="form-popper"', 'class="mini form-popper" id="formPopper"')}
      <form data-testify novalidate>
        <p class="greet" data-greet hidden></p>
        <p class="hp" aria-hidden="true"><label>Company <input name="company" tabindex="-1" autocomplete="off"></label></p>
        <div data-who>
          <div class="field"><label for="t-name">Your name</label><input id="t-name" name="name" autocomplete="name" maxlength="120"></div>
          <div class="row2">
            <div class="field"><label for="t-email">Email</label><input id="t-email" name="email" type="email" autocomplete="email" maxlength="254"></div>
            <div class="field"><label for="t-phone">Phone</label><input id="t-phone" name="phone" type="tel" autocomplete="tel" maxlength="32"></div>
          </div>
        </div>
        {scale("accuracy", "How accurate was the word?")}
        {scale("impact", "How much did it impact you?")}
        <div class="field"><label for="t-text">Your testimony <em>(optional)</em></label><textarea id="t-text" name="testimony" maxlength="5000" placeholder="What was said, what it meant, what's changed since"></textarea></div>
        <label class="check"><input type="checkbox" name="ok_to_share" value="yes"> You can share my story (first name only) to encourage others.</label>
        <button class="btn btn-red" type="submit"><i><svg><use href="#i-arrow"/></svg></i>Send my testimony</button>
        <p class="fine err" data-error hidden></p>
      </form>
      <div class="done" tabindex="-1">
        <span class="sticker butter">Received</span>
        <h3>Thank you.</h3>
        <p>That means a lot. Every story reminds us why we do this. See you Thursday at 8 PM Central.</p>
      </div>
    </div>
  </div>
</section>

<section class="pr-sec alt tf-why">
  <div class="wrap">
    <img class="pr-art tf-mic" src="/assets/v2/pr-mic.png" width="297" height="600" alt="" loading="lazy" style="shape-outside:url(/assets/v2/pr-mic.png);--r:8deg">
    <span class="sticker kicker">Why it matters</span>
    <h2 class="h h-lg">Your story is <span class="script">a seed.</span></h2>
    <p class="lede tf-lede">A word from God was never meant to stop with you. When you tell what He did, someone on the other side of a screen hears that it's possible for them too. That's how faith spreads. One story at a time.</p>
    <div class="notes tf-notes">
      <div class="note tex">{TAPE}<h3>Stories make believers.</h3><p>A woman met Jesus at a well and ran back to town telling everyone what He knew about her. Many people believed because of her testimony. Not a sermon. A story.</p><span class="ref">John 4:39</span></div>
      <div class="note tex">{TAPE}<h3>Be the one who comes back.</h3><p>Ten men were healed. One turned around, came back and thanked Jesus out loud. Telling us what happened is your way of coming back.</p><span class="ref">Luke 17:15-16</span></div>
      <div class="note tex">{TAPE}<h3>What He did once, He can do again.</h3><p>Every testimony says God is still the same. Your story becomes somebody else's hope, and sometimes their breakthrough starts the moment they hear yours.</p><span class="ref">Revelation 12:11 · Hebrews 13:8</span></div>
      <div class="note tex">{TAPE}<h3>Go tell what He did.</h3><p>Jesus set a man free and gave him one job: go home and tell people how much the Lord had done for him. Same job, new century.</p><span class="ref">Mark 5:19</span></div>
    </div>
    <figure class="pq">{TAPE}<blockquote>"Let the redeemed of the LORD tell their story."</blockquote><cite>Psalm 107:2 (NIV)</cite></figure>
    <div class="btns" style="margin-top:34px"><a class="btn btn-red" href="#top"><i><svg><use href="#i-arrow"/></svg></i>Tell your story</a></div>
  </div>
</section>
'''
testify_js = '''
<script>
/* /testify: from the thank-you email (?s=&t=) we already know who you are, so the name/email/phone fields hide.
   Opened directly, they're required, same as a sign-up. A rating or a testimony is required, not both. */
(function () {
  const form = document.querySelector("form[data-testify]");
  const q = new URLSearchParams(location.search), s = q.get("s"), t = q.get("t");
  let known = false;
  if (s && t) fetch(`/api/testify?s=${encodeURIComponent(s)}&t=${encodeURIComponent(t)}`).then((r) => r.ok ? r.json() : null).then((d) => {
    if (!d) return;
    known = true;
    form.querySelector("[data-who]").hidden = true;
    const g = form.querySelector("[data-greet]"); g.textContent = `Hey ${d.first}, thanks for coming on.`; g.hidden = false;
  }).catch(() => {});
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = form.querySelector("[data-error]"), btn = form.querySelector("[type=submit]"), label = btn.innerHTML;
    const f = new FormData(form), body = Object.fromEntries(f);
    body.ok_to_share = f.get("ok_to_share") === "yes";
    if (known) { body.s = s; body.t = t; }
    err.hidden = true;
    if (!body.accuracy && !body.impact && !String(body.testimony || "").trim()) { err.textContent = "Give us a rating or a few words. Either one works."; err.hidden = false; return; }
    btn.disabled = true; btn.textContent = "Sending...";
    try {
      const res = await fetch("/api/testify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || "That didn't go through.");
      const wrap = form.closest("[data-form]"); wrap.classList.add("is-done"); wrap.querySelector(".done").focus();
      if (window.pop) pop(document.getElementById("formPopper"), 0, 160);
      if (window.cannons) cannons();
    } catch (x) { err.textContent = x.message; err.hidden = false; btn.disabled = false; btn.innerHTML = label; }
  });
})();
</script>'''
page("testify", "Testify", "Got a word on The After Party? Tell us how accurate it was, how it impacted you, and what God did.", testify, testify_js)
