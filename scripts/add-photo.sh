#!/usr/bin/env bash
# add-photo.sh — add a photo to your gallery
# Usage: ./scripts/add-photo.sh <image-path> <category> "caption text" [YYYY-MM] [featured]
#
# Examples:
#   ./scripts/add-photo.sh uploads/photos/rpe.jpg lab "RPE cell culture at Duke Eye Center" 2024-08
#   ./scripts/add-photo.sh uploads/photos/slope.jpg life "Libe Slope, first snow" 2024-12 featured
#
# Categories: lab | life | travel | events | research

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FILE="$1"
CATEGORY="${2:-life}"
CAPTION="${3:-}"
DATE="${4:-}"
FEATURED="${5:-}"

if [[ -z "$FILE" ]]; then
  echo "Usage: $0 <image-path> <category> \"caption\" [YYYY-MM] [featured]"
  exit 1
fi

# If the file exists locally but isn't under uploads/photos/, copy it there
BASENAME=$(basename "$FILE")
DEST="uploads/photos/$BASENAME"
if [[ -f "$ROOT/$FILE" && "$FILE" != uploads/photos/* ]]; then
  cp "$ROOT/$FILE" "$ROOT/uploads/photos/$BASENAME"
  FILE="$DEST"
  echo "→ Copied to $FILE"
fi

GALLERY_JS="$ROOT/gallery.js"

# Build the entry
FEATURED_VAL="false"
[[ "$FEATURED" == "featured" ]] && FEATURED_VAL="true"

DATE_LINE=""
[[ -n "$DATE" ]] && DATE_LINE="
    date:     '$DATE',"

ENTRY="  {
    file:     '$FILE',
    caption:  '$(echo "$CAPTION" | sed "s/'/\\\\'/g")',$DATE_LINE
    category: '$CATEGORY',
    featured: $FEATURED_VAL,
  },"

# Insert before the closing ] of GALLERY
TMPFILE=$(mktemp)
awk -v entry="$ENTRY" '
  /^]$/ && !done { print entry; done=1 }
  { print }
' "$GALLERY_JS" > "$TMPFILE" && mv "$TMPFILE" "$GALLERY_JS"

echo "✓ Added to gallery.js:"
echo "  file: $FILE"
echo "  category: $CATEGORY"
echo "  caption: $CAPTION"
echo ""
echo "Next: git add uploads/photos/$BASENAME gallery.js && git commit -m 'photos: add $BASENAME' && git push"
