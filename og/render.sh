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
