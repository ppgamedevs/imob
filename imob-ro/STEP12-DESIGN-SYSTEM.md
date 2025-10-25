# Step 12 - Design System & Theming Finish

## ✅ Completed

### 1. Design Tokens v2 (`src/styles/tokens.css`)

**CSS Custom Properties:**

- **Colors**: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--muted`, `--primary`, `--success`, `--warn`, `--danger`, `--ad-tint`, `--chart-1` through `--chart-6`
- **Radii**: `--r-sm` (10px), `--r-md` (16px), `--r-xl` (24px)
- **Shadows**: `--elev0` through `--elev3` (progressive elevation)
- **Typography**: `--fs-xs` through `--fs-6xl`, `--font-sans`, `--font-mono`
- **Motion**: `--ease-smooth`, `--duration-fast/base/slow`
- **Spacing**: `--space-1` through `--space-8`, `--header-height`, `--page-max-width`

**Dark Mode Support:**

- Automatic via `@media (prefers-color-scheme: dark)`
- Manual via `.theme-dark` or `[data-theme="dark"]` classes
- All colors adjust automatically with proper contrast

**Brand Override:**

- `[data-brand]` attribute enables brand color override
- Controlled via BrandProvider component
- Works with Developer, Owner, and Org settings

**Reduced Motion:**

- `@media (prefers-reduced-motion: reduce)` disables animations
- All transitions respect user preferences

### 2. Core Components

#### Surface (`src/components/ui/Surface.tsx`)

Base container with elevation levels (0-3) and rounded corners.

```tsx
<Surface elevation={1} rounded="md">
  Content here
</Surface>
```

#### KpiTile (`src/components/ui/kpi-tile.tsx`)

Display key metrics with icon, label, value, and optional delta.

```tsx
<KpiTile
  icon={TrendingUp}
  label="Avg Price/m²"
  value="€2,450"
  delta="+8.5%"
  deltaVariant="positive"
/>
```

#### InlineStat (`src/components/ui/inline-stat.tsx`)

Compact label/value pairs for dense layouts.

```tsx
<InlineStat label="Units" value="24" />
```

#### Empty (`src/components/ui/empty.tsx`)

Consistent empty states with icon, title, description, and optional action.

```tsx
<Empty
  icon={Search}
  title="No results found"
  description="Try adjusting your filters"
  action={{ label: "Reset", onClick: () => {} }}
/>
```

#### Badge (`src/components/ui/badge.tsx`)

Updated with new variants: `default`, `neutral`, `success`, `warn`, `danger`, `sponsored`, `outline`.
Backward compatible with `secondary` (→ `neutral`) and `destructive` (→ `danger`).

#### Segmented (`src/components/ui/segmented.tsx`)

iOS-style segmented control for mutually exclusive options.

```tsx
<Segmented
  options={[
    { value: "list", label: "List" },
    { value: "grid", label: "Grid" },
  ]}
  value={view}
  onChange={setView}
/>
```

### 3. Theming System

#### BrandProvider (`src/components/theme/BrandProvider.tsx`)

Applies brand theming via CSS custom properties.

**Usage:**

```tsx
import { BrandProvider, getBrandFromDeveloper } from "@/components/theme/BrandProvider";

const brand = getBrandFromDeveloper(developer);

<BrandProvider brand={brand}>{children}</BrandProvider>;
```

**Brand Config:**

```typescript
interface BrandConfig {
  color?: string; // Hex color e.g., "#ff5733"
  logoUrl?: string; // URL to logo
  tone?: string; // Brand tone (for context)
}
```

**Helper Functions:**

- `getBrandFromDeveloper(developer)` - Extract brand from Developer model
- `getBrandFromOwner(owner)` - Extract brand from Owner (future)
- `getBrandFromOrg(org)` - Extract brand from Org settings

### 4. Ad System

#### AdSlot (`src/components/ads/AdSlot.tsx`)

Updated with Step 12 specs:

- **Fixed height**: Prevents layout shift (CLS)
- **Impression tracking**: 50% visible for 800ms (was 1000ms)
- **Token-based styling**: Uses `--ad-bg`, `--ad-border`, `--ad-label`
- **Proper labeling**: "Spațiu publicitar" with complementary role

**Sizes:**

- `banner`: 728×90 (desktop), 320×100 (mobile)
- `rectangle`: 300×250
- `skyscraper`: 300×600 (desktop), 300×250 (mobile)

**Usage:**

```tsx
<AdSlot
  id="discover-inline-1"
  position="inline"
  size="rectangle"
  adUrl="/ads/example.jpg"
  clickUrl="https://example.com"
/>
```

### 5. Global Styles (`src/app/globals.css`)

Updated to use new token system:

- Background: `rgb(var(--bg))`
- Text color: `rgb(var(--text))`
- Typography: `var(--font-sans)`, `var(--fs-base)`, `var(--lh-normal)`
- Container: `max-width: var(--page-max-width)`

## 🚧 In Progress

### Page-Specific Polish

#### `/discover` - Not started

- [ ] Update cards to v3 (Surface + fixed ratio + badges)
- [ ] Add ad slots after cards 3 & 10
- [ ] Update filter chips with Popover and Segmented

#### `/report` - Not started

- [ ] Update KPI row with big numbers + deltas
- [ ] Update right rail cards ordering
- [ ] Add photo grid masonry
- [ ] Add ad slot in right rail

#### `/area` - Not started

- [ ] Apply KpiTile components
- [ ] Update tabs styling
- [ ] Add ad slots (banner under hero, rectangle after listings)

#### `/developments` - Not started

- [ ] Add density toggle to Unit Finder
- [ ] Consistent button widths
- [ ] Proper hover states

#### `/owners` - Not started

- [ ] Update wizard header
- [ ] ROI checklist with icons
- [ ] Score dial styling

#### `/agent` (/a) - Not started

- [ ] Dense table theme
- [ ] Pill badges for Underpriced/Overpriced
- [ ] Monospace numeric columns

### Accessibility

- [ ] Verify color contrast ≥ 4.5:1
- [ ] Ensure 44×44 touch targets
- [ ] Add proper aria labels
- [ ] Test keyboard navigation
- [ ] Audit with Lighthouse

### Performance

- [ ] Verify SSR above the fold
- [ ] Optimize next/image usage
- [ ] Preload fonts (Inter variable)
- [ ] Add link prefetching on hover

## 📝 Usage Examples

### Using Design Tokens in Components

**With Tailwind (recommended):**

```tsx
<div className="bg-[rgb(var(--surface))] text-[rgb(var(--text))] rounded-[var(--r-md)]">
  Content
</div>
```

**With inline styles:**

```tsx
<div
  style={{
    backgroundColor: "rgb(var(--surface))",
    color: "rgb(var(--text))",
    borderRadius: "var(--r-md)",
  }}
>
  Content
</div>
```

### Motion & Transitions

```tsx
<div className="transition-all duration-[var(--duration-base)] ease-[var(--ease-smooth)]">
  Smooth animation
</div>
```

### Elevation & Hover Effects

```tsx
<div className="shadow-[var(--elev1)] hover:shadow-[var(--elev2)] hover:-translate-y-0.5">
  Hover to lift
</div>
```

### Dark Mode

Components automatically adapt to dark mode. To force a theme:

```tsx
<body data-theme="dark">
  <!-- All children will use dark mode -->
</body>
```

### Brand Theming

Wrap project pages with BrandProvider:

```tsx
// In /developments/[slug]/page.tsx
const brand = getBrandFromDeveloper(development.developer);

return (
  <BrandProvider brand={brand}>
    <ProjectPage development={development} />
  </BrandProvider>
);
```

## 🎨 Design Principles

1. **Consistency**: One visual language across all pages
2. **Accessibility**: WCAG 2.1 AA compliance minimum
3. **Performance**: Zero layout shift, smooth 60fps animations
4. **Brandable**: Easy theming for white-label partners
5. **Responsive**: Mobile-first, works on all devices
6. **Progressive**: Graceful degradation, respect user preferences

## 🔧 Tailwind Configuration

Update `tailwind.config.ts` to use tokens (if needed):

```typescript
theme: {
  extend: {
    colors: {
      bg: 'rgb(var(--bg))',
      surface: 'rgb(var(--surface))',
      primary: 'rgb(var(--primary))',
      // ... etc
    },
    borderRadius: {
      sm: 'var(--r-sm)',
      md: 'var(--r-md)',
      xl: 'var(--r-xl)',
    },
  },
}
```

## 📊 Success Metrics (To Be Measured)

- [ ] **Visual Consistency**: 100% of pages use design tokens
- [ ] **Accessibility Score**: Lighthouse ≥ 95
- [ ] **Performance**: LCP < 2.5s, CLS < 0.1
- [ ] **Brand Theming**: Works on 3+ test cases (developer, owner, org)
- [ ] **Zero Layout Shift**: All ad slots have fixed heights
- [ ] **Dark Mode**: All pages render correctly in dark mode

## 🐛 Known Issues

None yet - actively implementing.

## 📚 Next Steps

1. Complete page-specific polish (discover, report, area, developments, owners, agents)
2. Run full accessibility audit
3. Performance testing and optimization
4. Create component documentation/Storybook
5. Test brand theming with real developer data
6. Measure success metrics

---

**Status**: 🟡 In Progress (Foundation complete, page polish pending)
**Started**: October 25, 2025
**Target Completion**: TBD
