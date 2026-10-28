#!/bin/zsh
# Renders og/og.html to public/og.png at 1200x630 with headless Chrome (same method as the social pack).
set -e
cd "$(dirname "$0")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --allow-file-access-from-files --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=8000 \
  --screenshot="$PWD/../public/og.png" "file://$PWD/og.html" >/dev/null 2>&1
sips -g pixelWidth -g pixelHeight ../public/og.png | tail -2
# JPEG for the og:image tag: WhatsApp drops previews over ~300KB, the PNG is ~450KB
sips -s format jpeg -s formatOptions 88 ../public/og.png --out ../public/og.jpg >/dev/null && ls -la ../public/og.jpg
# email header (every email uses it): 1200x420, shown at 600 wide
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --allow-file-access-from-files --force-device-scale-factor=1 --window-size=1200,420 --virtual-time-budget=8000 \
  --screenshot="$PWD/../public/email/header.png" "file://$PWD/email-header.html" >/dev/null 2>&1
sips -s format jpeg -s formatOptions 86 ../public/email/header.png --out ../public/email/header.jpg >/dev/null && rm ../public/email/header.png
