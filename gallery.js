// gallery.js — photo manifest for ishaansamantray.com
// To add a photo: run ./scripts/add-photo.sh <file> <category> <caption>
// Categories: lab | life | travel | events | research
// Set featured: true to pin to the top of the gallery

const GALLERY = [
  // ── Examples — replace with your own photos ──────────────────────────────
  // {
  //   file:     'uploads/photos/rpe-culture.jpg',
  //   caption:  'RPE cell culture — Duke Eye Center',
  //   category: 'lab',
  //   date:     '2024-08',
  //   featured: true,
  // },
  // {
  //   file:     'uploads/photos/cornell-slope.jpg',
  //   caption:  'Libe Slope, first snow of the year',
  //   category: 'life',
  //   date:     '2024-12',
  //   featured: false,
  // },
]

// ── Category config ───────────────────────────────────────────────────────────
const GALLERY_CATEGORIES = [
  { id: 'all',      label: 'all_photos' },
  { id: 'lab',      label: 'lab/'       },
  { id: 'research', label: 'research/'  },
  { id: 'life',     label: 'life/'      },
  { id: 'travel',   label: 'travel/'    },
  { id: 'events',   label: 'events/'    },
]

if (typeof module !== 'undefined') module.exports = { GALLERY, GALLERY_CATEGORIES }
