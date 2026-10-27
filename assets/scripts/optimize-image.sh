#!/usr/bin/env bash
#
# optimize-images.sh
# Fixes the 4 images flagged by Lighthouse/PageSpeed on americantreeserviceco.com
# Requires: cwebp, dwebp (webp package) and ImageMagick (identify, magick/convert)
#
# Usage:
#   ./optimize-images.sh /path/to/site/root
#
# Expects these source files to exist:
#   images/halloween-boo.webp
#   images/jpg/dji_fly_20220331_103702_83_1683391413955_photo_optimized_mobile.jpg
#   images/jpg/IMG_8362.jpg
#   images/logo/AmericanTree_Logo_RGB.png (or AmericanTree_Logo_RGB@2x.png, preferred)
#
# Outputs optimized files alongside originals with "-optimized" suffix,
# so you can review before replacing anything live.

set -euo pipefail

SITE_ROOT="${1:-.}"
IMG_DIR="$SITE_ROOT/images"
JPG_DIR="$IMG_DIR/jpg"
LOGO_DIR="$IMG_DIR/logo"
OUT_DIR="$SITE_ROOT/images/optimized"

mkdir -p "$OUT_DIR"

# ---- helpers -----------------------------------------------------------

check_tools() {
  local missing=()
  for t in cwebp dwebp identify; do
    command -v "$t" >/dev/null 2>&1 || missing+=("$t")
  done
  if [ "${#missing[@]}" -gt 0 ]; then
    echo "Missing required tools: ${missing[*]}"
    echo "Install with: sudo apt install webp imagemagick"
    exit 1
  fi
}

human_size() {
  # prints size in KiB for a file
  du -k "$1" | cut -f1
}

report() {
  local label="$1" before="$2" after="$3"
  local before_kib after_kib saved
  before_kib=$(human_size "$before")
  after_kib=$(human_size "$after")
  saved=$((before_kib - after_kib))
  printf "%-28s %6s KiB -> %6s KiB   (saved %s KiB)\n" "$label" "$before_kib" "$after_kib" "$saved"
}

# ---- 1. Halloween hero icon: resize to 260x260 (2x of 130x130 display) --

optimize_halloween() {
  local src_webp="$IMG_DIR/halloween-boo.webp"
  local out="$OUT_DIR/halloween-boo.webp"

  if [ ! -f "$src_webp" ]; then
    echo "SKIP halloween-boo: no source found at $src_webp"
    return
  fi
  local tmp="$OUT_DIR/halloween-boo-tmp.png"
  dwebp -quiet "$src_webp" -o "$tmp"
  cwebp -quiet -q 85 -resize 260 260 "$tmp" -o "$out"
  rm -f "$tmp"
  report "halloween-boo.webp" "$src_webp" "$out"
}

# ---- 2. Hero DJI photo: convert JPG -> WebP (no resize, already sized) --

optimize_hero_dji() {
  local src
  src=$(find "$JPG_DIR" -iname "dji_fly_20220331*photo_optimized_mobile.jpg" | head -n1)
  local out="$OUT_DIR/dji-hero.webp"

  if [ -z "$src" ]; then
    echo "SKIP hero DJI photo: no matching file found in $IMG_DIR"
    return
  fi
  cwebp -quiet -q 80 "$src" -o "$out"
  report "dji-hero.webp" "$src" "$out"
}

# ---- 3. CTA strip photo: convert JPG -> WebP ----------------------------

optimize_cta_strip() {
  local src="$JPG_DIR/IMG_8362.jpg"
  local out="$OUT_DIR/cta-strip.webp"

  if [ ! -f "$src" ]; then
    echo "SKIP IMG_8362: not found at $src"
    return
  fi
  cwebp -quiet -q 80 "$src" -o "$out"
  report "cta-strip.webp" "$src" "$out"
}

# ---- 4. Logo: resize 587x288 -> 212x104 (2x of 106x52 display) ---------

optimize_logo() {
  local src="$LOGO_DIR/AmericanTree_Logo_RGB.png"
  local src_2x="$LOGO_DIR/AmericanTree_Logo_RGB@2x.png"
  local out="$OUT_DIR/AmericanTree_Logo_RGB.webp"
  local best_src="$src"

  # Prefer the @2x source if present — resizing down preserves more detail
  # than resizing/upscaling from the smaller 1x file.
  if [ -f "$src_2x" ]; then
    best_src="$src_2x"
  elif [ ! -f "$src" ]; then
    echo "SKIP logo: not found at $src or $src_2x"
    return
  fi
  cwebp -quiet -q 90 -resize 212 104 "$best_src" -o "$out"
  report "logo.webp" "$best_src" "$out"
}

# ---- run -----------------------------------------------------------------

check_tools
echo "Optimizing images from: $IMG_DIR"
echo "Output written to:      $OUT_DIR"
echo "----------------------------------------------------------------"

optimize_halloween
optimize_hero_dji
optimize_cta_strip
optimize_logo

echo "----------------------------------------------------------------"
echo "Done. Review files in $OUT_DIR, then swap them into place and"
echo "update any <img>/<picture> markup to point at the new paths."
