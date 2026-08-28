#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ICON_B64="$ROOT/assets/app_icon.png.b64"
TMP_ICON="${RUNNER_TEMP:-/tmp}/transport_report_ts_icon.png"
IOS_BUNDLE_ID="com.transportreport.transportreportts"

if [ ! -f "$ICON_B64" ]; then
  echo "Brand icon not found: $ICON_B64"
  exit 1
fi

# Decode with Python so wrapped/unpadded Base64 behaves consistently on Linux/macOS.
python3 - "$ICON_B64" "$TMP_ICON" <<'PY'
import base64, pathlib, re, sys
src = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')
s = re.sub(r'\s+', '', src)
s += '=' * ((4 - len(s) % 4) % 4)
data = base64.b64decode(s, validate=False)
if not data.startswith(b'\x89PNG\r\n\x1a\n'):
    raise SystemExit('Decoded launcher icon is not a PNG')
pathlib.Path(sys.argv[2]).write_bytes(data)
print(f'Decoded PNG icon: {len(data)} bytes')
PY

echo "Applying Transport Report TS branding..."

if [ -d "$ROOT/android/app/src/main/res" ]; then
  # Android/AAPT2 is strict about PNG internals. Re-encode the source PNG with
  # ImageMagick (available on GitHub Ubuntu runners) and generate the canonical
  # launcher sizes instead of copying one PNG into every density bucket.
  if command -v convert >/dev/null 2>&1; then
    RESIZE=convert
  elif command -v magick >/dev/null 2>&1; then
    RESIZE="magick convert"
  else
    echo "ImageMagick not found; keeping Flutter-generated Android icons"
    RESIZE=""
  fi

  if [ -n "$RESIZE" ]; then
    for spec in "mdpi:48" "hdpi:72" "xhdpi:96" "xxhdpi:144" "xxxhdpi:192"; do
      density="${spec%%:*}"
      pixels="${spec##*:}"
      dir="$ROOT/android/app/src/main/res/mipmap-$density"
      mkdir -p "$dir"
      rm -f "$dir/ic_launcher.png" "$dir/ic_launcher.webp" "$dir/ic_launcher.jpg"
      if [ "$RESIZE" = "convert" ]; then
        convert "$TMP_ICON" -strip -resize "${pixels}x${pixels}!" PNG32:"$dir/ic_launcher.png"
      else
        magick convert "$TMP_ICON" -strip -resize "${pixels}x${pixels}!" PNG32:"$dir/ic_launcher.png"
      fi
    done
  fi

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

if [ -d "$ROOT/web" ]; then
  mkdir -p "$ROOT/web/icons"
  cp "$TMP_ICON" "$ROOT/web/favicon.png"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-192.png"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-512.png"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-maskable-192.png"
  cp "$TMP_ICON" "$ROOT/web/icons/Icon-maskable-512.png"
  rm -f "$ROOT/web/favicon.jpg" "$ROOT/web/icons/Icon-192.jpg" "$ROOT/web/icons/Icon-512.jpg" "$ROOT/web/icons/Icon-maskable-192.jpg" "$ROOT/web/icons/Icon-maskable-512.jpg"
  python3 - "$ROOT/web" <<'PY'
import json, pathlib, re, sys
web=pathlib.Path(sys.argv[1])
idx=web/'index.html'
if idx.exists():
    s=idx.read_text()
    s=s.replace('href="favicon.jpg"', 'href="favicon.png"')
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
      {'src':'icons/Icon-192.png','sizes':'192x192','type':'image/png'},
      {'src':'icons/Icon-512.png','sizes':'512x512','type':'image/png'},
      {'src':'icons/Icon-maskable-192.png','sizes':'192x192','type':'image/png','purpose':'maskable'},
      {'src':'icons/Icon-maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'},
    ]
    man.write_text(json.dumps(d, ensure_ascii=False, indent=2))
PY
fi

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
  if [ -f "$plist" ] && [ -x /usr/libexec/PlistBuddy ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName Transport Report TS" "$plist" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Set :CFBundleName Transport Report TS" "$plist" 2>/dev/null || true
  fi

  pbx="$ROOT/ios/Runner.xcodeproj/project.pbxproj"
  if [ -f "$pbx" ]; then
    python3 - "$pbx" "$IOS_BUNDLE_ID" <<'PY'
import pathlib, re, sys
p = pathlib.Path(sys.argv[1])
bundle = sys.argv[2]
text = p.read_text()
lines = []
for line in text.splitlines(True):
    if 'PRODUCT_BUNDLE_IDENTIFIER =' in line:
        suffix = '.RunnerTests' if 'RunnerTests' in line else ''
        line = re.sub(r'PRODUCT_BUNDLE_IDENTIFIER = [^;]+;', f'PRODUCT_BUNDLE_IDENTIFIER = {bundle}{suffix};', line)
    lines.append(line)
p.write_text(''.join(lines))
print(f'iOS Bundle ID pinned to {bundle}')
PY
  fi
fi

echo "Branding applied."
