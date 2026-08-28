#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_B64="$ROOT/assets/app_icon.jpg.b64"
TMP_ICON="${RUNNER_TEMP:-/tmp}/transport_report_ts_icon.jpg"

if [ ! -f "$ICON_B64" ]; then
  echo "Brand icon not found: $ICON_B64"
  exit 1
fi

base64 --decode "$ICON_B64" > "$TMP_ICON" 2>/dev/null || base64 -D "$ICON_B64" > "$TMP_ICON"

echo "Applying Transport Report TS branding..."

# Android launcher icon. Android resource compiler supports JPEG bitmap resources.
if [ -d "$ROOT/android/app/src/main/res" ]; then
  for density in mdpi hdpi xhdpi xxhdpi xxxhdpi; do
    dir="$ROOT/android/app/src/main/res/mipmap-$density"
    mkdir -p "$dir"
    rm -f "$dir/ic_launcher.png" "$dir/ic_launcher.webp"
    cp "$TMP_ICON" "$dir/ic_launcher.jpg"
  done
  manifest="$ROOT/android/app/src/main/AndroidManifest.xml"
  if [ -f "$manifest" ]; then
    python3 - "$manifest" <<'PY'
import pathlib, re, sys
p=pathlib.Path(sys.argv[1])
s=p.read_text()
s=re.sub(r'android:label="[^"]*"', 'android:label="Transport Report TS"', s, count=1)
p.write_text(s)
PY
  fi
fi

# Web favicon/PWA icons and names.
if [ -d "$ROOT/web" ]; then
  mkdir -p "$ROOT/web/icons"
  cp "$TMP_ICON" "$ROOT/web/favicon.jpg"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-192.jpg"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-512.jpg"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-maskable-192.jpg"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-maskable-512.jpg"
  rm -f "$ROOT/web/favicon.png" "$ROOT/web/icons/Icon-192.png" "$ROOT/web/icons/Icon-512.png" "$ROOT/web/icons/Icon-maskable-192.png" "$ROOT/web/icons/Icon-maskable-512.png"
  python3 - "$ROOT/web" <<'PY'
import json, pathlib, re, sys
web=pathlib.Path(sys.argv[1])
idx=web/'index.html'
if idx.exists():
    s=idx.read_text()
    s=s.replace('href="favicon.png"', 'href="favicon.jpg"')
    s=re.sub(r'<meta name="apple-mobile-web-app-title" content="[^"]*">', '<meta name="apple-mobile-web-app-title" content="Transport Report TS">', s)
    idx.write_text(s)
man=web/'manifest.json'
if man.exists():
    d=json.loads(man.read_text())
    d['name']='Transport Report TS'
    d['short_name']='Transport TS'
    d['description']='Система транспортної звітності'
    d['background_color']='#0B1020'
    d['theme_color']='#1677FF'
    d['icons']=[
      {'src':'icons/Icon-192.jpg','sizes':'192x192','type':'image/jpeg'},
      {'src':'icons/Icon-512.jpg','sizes':'512x512','type':'image/jpeg'},
      {'src':'icons/Icon-maskable-192.jpg','sizes':'192x192','type':'image/jpeg','purpose':'maskable'},
      {'src':'icons/Icon-maskable-512.jpg','sizes':'512x512','type':'image/jpeg','purpose':'maskable'},
    ]
    man.write_text(json.dumps(d, ensure_ascii=False, indent=2))
PY
fi

# iOS icon set: generated on macOS runners after flutter create.
IOS_SET="$ROOT/ios/Runner/Assets.xcassets/AppIcon.appiconset"
if [ -d "$IOS_SET" ] && command -v sips >/dev/null 2>&1; then
  python3 - "$IOS_SET/Contents.json" <<'PY' > "${RUNNER_TEMP:-/tmp}/trts_ios_icons.txt"
import json, pathlib, sys
p=pathlib.Path(sys.argv[1])
d=json.loads(p.read_text())
for item in d.get('images',[]):
    name=item.get('filename')
    size=item.get('size')
    scale=item.get('scale','1x')
    if not name or not size: continue
    points=float(size.split('x')[0])
    factor=float(scale.rstrip('x'))
    print(name, round(points*factor))
PY
  while read -r name pixels; do
    [ -z "$name" ] && continue
    sips -s format png -z "$pixels" "$pixels" "$TMP_ICON" --out "$IOS_SET/$name" >/dev/null
  done < "${RUNNER_TEMP:-/tmp}/trts_ios_icons.txt"

  plist="$ROOT/ios/Runner/Info.plist"
  if [ -f "$plist" ] && command -v /usr/libexec/PlistBuddy >/dev/null 2>&1; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Transport Report TS" "$plist" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Set :CFBundleName Transport Report TS" "$plist" 2>/dev/null || true
  fi
fi

echo "Branding applied."
