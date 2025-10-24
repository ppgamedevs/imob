# Design System Documentation

## Step 1 - Design System & Foundations ✅

Complete implementation of rock-solid UI foundations with ad framework built-in from day 1.

---

## 📁 File Structure

```
src/
├── styles/
│   └── tokens.css              # Single source of truth for design values
├── components/
│   ├── ui/
│   │   ├── Surface.tsx         # Base container with elevation levels
│   │   └── SponsoredLabel.tsx  # Badge for sponsored content
│   ├── ads/
│   │   ├── AdSlot.tsx          # Static ad slots with zero CLS
│   │   └── SponsoredCard.tsx   # Sponsored listing cards
│   └── layout/
│       ├── Container.tsx       # Responsive content wrapper
│       ├── AppHeader.tsx       # Main navigation header
│       └── AppFooter.tsx       # Site footer
└── app/
    └── ui/
        └── page.tsx            # Visual QA showcase
```

---

## 🎨 Design Tokens

All design values are defined as CSS custom properties in `src/styles/tokens.css`:

### Brand
- **Hue**: 252° (deep indigo)
- **Saturation**: 85%
- **Lightness**: 55%

### Color Palette (Dark Mode Default)
- `--color-bg`: #0b0c10 (background)
- `--color-surface`: #0f1116 (cards, panels)
- `--color-muted`: #1a1e27 (secondary backgrounds)
- `--color-border`: #232838 (borders)
- `--color-text`: #eef2ff (text)
- `--color-primary`: HSL brand colors
- Semantic: `--color-success`, `--color-warning`, `--color-danger`, `--color-info`

### Ad-Specific Tokens
- `--ad-bg`: #0c0f16 (ad background)
- `--ad-border`: #2a3246 (ad border)
- `--ad-label`: #93c5fd (readable label color)

### Elevation (Soft, Modern)
- `--elev-0`: Minimal border (subtle)
- `--elev-1`: Small shadow (cards, dropdowns)
- `--elev-2`: Large shadow (modals, popovers)

### Radius
- `--radius-sm`: 10px
- `--radius-md`: 16px
- `--radius-lg`: 24px
- `--radius-xl`: 28px

### Spacing (4px base)
- `--space-1` through `--space-8` (4px increments)
- Density mode reduces by ~20% via body class

### Typography
- **Fonts**: Inter (sans), SF Mono (mono)
- **Sizes**: xs (12px) → 3xl (28px)
- **Line heights**: tight (1.2), normal (1.5)

### Motion
- **Easing**: emph (emphasized), in-out (smooth)
- **Duration**: fast (120ms), med (220ms), slow (400ms)
- **Reduced Motion**: Respects `prefers-reduced-motion`

---

## 🧩 Core Components

### Surface (`src/components/ui/Surface.tsx`)
Base container primitive with elevation levels.

**Props:**
- `elevation?: 0 | 1 | 2` - Shadow depth (default: 0)
- `rounded?: "sm" | "md" | "lg" | "xl"` - Border radius (default: "xl")
- `asChild?: boolean` - Polymorphic rendering via Radix Slot

**Usage:**
```tsx
<Surface elevation={1} rounded="lg" className="p-6">
  Card content
</Surface>
```

### SponsoredLabel (`src/components/ui/SponsoredLabel.tsx`)
Badge for marking sponsored/ad content with WCAG-compliant styling.

**Props:**
- `variant?: "sponsored" | "ad"` - Label text
- `size?: "sm" | "md"` - Size variant

**Usage:**
```tsx
<SponsoredLabel variant="sponsored" size="md" />
```

### AdSlot (`src/components/ads/AdSlot.tsx`)
Static advertising slot with **zero CLS** (reserved height).

**Props:**
- `id: string` - Unique identifier for tracking
- `position: "top" | "inline" | "sidebar" | "footer"`
- `size: "banner" | "rectangle" | "skyscraper"`
- `adUrl?: string` - Creative image URL
- `clickUrl?: string` - Click-through URL

**Features:**
- Reserved dimensions (no layout shift)
- Viewability tracking (50% visible for 1s)
- Click tracking via `/api/track/ad-click`
- Responsive sizing (mobile/desktop)

**Sizes:**
- **Banner**: 728×90 (desktop) / 320×100 (mobile)
- **Rectangle**: 300×250 (all devices)
- **Skyscraper**: 300×600 (desktop) / 300×250 (mobile fallback)

**Usage:**
```tsx
<AdSlot
  id="discover-top"
  position="top"
  size="banner"
  adUrl="/ads/banner.jpg"
  clickUrl="https://advertiser.com"
/>
```

### SponsoredCard (`src/components/ads/SponsoredCard.tsx`)
Listing card variant for promoted content.

**Props:**
- `listing` - Property data (id, title, price, area, rooms, image, url)
- `position?: number` - Position in feed for tracking

**Features:**
- Same layout as `ListingCard` for consistency
- Clear "Sponsorizat" badge
- Subtle border tint (`border-adBorder`)
- Impression & click tracking
- Never masquerades as organic

**Usage:**
```tsx
<SponsoredCard
  listing={{
    id: "prop-123",
    title: "Apartament 3 camere",
    price: 185000,
    area: 85,
    rooms: 3,
    neighborhood: "Pipera",
    url: "https://listing.com"
  }}
  position={3}
/>
```

---

## 📐 Layout Components

### Container (`src/components/layout/Container.tsx`)
Responsive content wrapper with max-width constraints.

**Props:**
- `width?: "default" | "wide" | "full"` - Max width (1200px / 1440px / 100%)
- `noPadding?: boolean` - Disable horizontal padding

### AppHeader (`src/components/layout/AppHeader.tsx`)
Main navigation with search, auth, and mobile menu.

**Features:**
- Sticky positioning with backdrop blur
- Prominent search input
- Desktop nav + mobile sheet
- Auth state display

### AppFooter (`src/components/layout/AppFooter.tsx`)
Site footer with multi-column links and legal.

---

## 🎯 Ad Placement Framework

### Discover Page
- **Mobile**: 1 sponsored card per 6 organic results (max 2/page)
- **Desktop**: Top banner under filters + 1 inline card after row 2

### Report Page
- **Right column**: Rectangle (300×250)
- **Below gallery**: Inline banner

### Area Pages
- **Top**: Banner
- **Inline**: Rectangle in "best listings" list

---

## ♿ Accessibility

### Color Contrast
- Minimum 4.5:1 for text on surfaces
- Ad labels use `--ad-label` (#93c5fd) for readability

### Focus States
- Visible 2px primary outline with 2px offset
- Applied via `.focus-ring` utility class
- `:focus-visible` on all interactive elements

### Touch Targets
- Minimum 44×44px for all buttons/links

### Motion
- Respects `prefers-reduced-motion`
- Disables large transitions, keeps essential affordances

### ARIA Labels
- Ad slots: `aria-label="Spațiu publicitar"` + `role="complementary"`
- Sponsored cards: `aria-label="Anunț sponsorizat: {title}"`
- Sponsored labels: `aria-label="Conținut {sponsorizat|publicitate}"` + `role="note"`

---

## 🔧 Tailwind Integration

All tokens are mapped to Tailwind utilities in `tailwind.config.cjs`:

```javascript
colors: {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  primary: "var(--color-primary)",
  // ...
},
boxShadow: {
  elev0: "var(--elev-0)",
  elev1: "var(--elev-1)",
  elev2: "var(--elev-2)",
},
transitionDuration: {
  fast: "var(--dur-fast)",
  med: "var(--dur-med)",
  slow: "var(--dur-slow)",
}
```

**Usage:**
```tsx
<div className="bg-surface text-text shadow-elev1 rounded-xl transition-shadow duration-med" />
```

---

## 📊 Analytics & Tracking

### Events
All tracking uses first-party endpoints (GDPR-friendly):

**Ad Impressions:**
- Endpoint: `POST /api/track/ad-impression`
- Payload: `{ slotId, position, size, timestamp }`
- Trigger: 50% visible for 1s (IntersectionObserver)

**Ad Clicks:**
- Endpoint: `POST /api/track/ad-click`
- Payload: `{ slotId, position, size, clickUrl, timestamp }`

**Sponsored Impressions:**
- Endpoint: `POST /api/track/sponsored-impression`
- Payload: `{ groupId, sponsorId, position, timestamp }`

**Sponsored Clicks:**
- Endpoint: `POST /api/track/sponsored-click`
- Payload: `{ groupId, sponsorId, position, url, timestamp }`

---

## 🎨 Visual QA

Visit **`/ui`** route for comprehensive showcase:
- All color tokens
- Surface elevations
- Sponsored labels
- Ad slots (all sizes)
- Sponsored cards
- Typography scale
- Spacing scale
- Border radius variants
- Motion timing demos
- Accessibility checklist

---

## ✅ Acceptance Criteria

- [x] **Tokens wired** - Single source of truth in CSS vars
- [x] **Dark/Light auto** - `prefers-color-scheme` support
- [x] **Zero CLS** - All ad slots have reserved height
- [x] **Primitives render** - Surface, labels, buttons with tokens
- [x] **Ad components exist** - AdSlot + SponsoredCard with tracking
- [x] **Layout ready** - Header, Footer, Container components
- [x] **Accessibility validated** - Focus, contrast, ARIA labels
- [x] **Motion language** - Subtle, premium, reduced-motion support
- [x] **Visual QA route** - `/ui` showcase for all primitives

---

## 🚀 Next Steps

**Step 2 - Discover/Search (Feed + Map)**
- 2-pane layout (list + map)
- Filter toolbar with chips
- Inject SponsoredCard at intervals
- Add top AdSlot banner

**Step 3 - Report Detail Page**
- Media gallery + KPI cards
- Sticky CTA row
- Right column AdSlot (rectangle)
- Inline AdSlot below gallery

**Step 4 - Area Pages**
- Hero with KPIs
- "Best listings" list
- Top banner AdSlot
- Inline SponsoredCard

---

## 📝 Notes

- **Legacy compatibility**: Kept existing `brand` color palette alongside new tokens
- **CSS lint errors**: Tailwind `@` rules show warnings but compile correctly
- **Production**: Remove `/ui` route or gate behind env var
- **API stubs**: Tracking endpoints need backend implementation
- **Density mode**: Toggle via `body.density-compact` class (reduces spacing ~20%)

---

## 🎯 Design Principles

1. **Predictable** - Same patterns everywhere
2. **Fast** - Optimized motion, zero CLS
3. **Accessible** - WCAG AA minimum
4. **Transparent** - Sponsored content clearly labeled
5. **Future-proof** - Easy to extend, tokens drive everything
