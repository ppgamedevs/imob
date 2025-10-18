Design system (brief)

Overview
- This project uses Tailwind CSS tokens extended in `tailwind.config.cjs` and component primitives based on shadcn/ui.
- Visual tokens: rounded-2xl cards, glass-card utility, Poppins + Inter fonts.

Components added
- `src/components/ui/hero.tsx` — full-width hero with optional image and CTA. Use for landing/dashboard headers.
- `src/components/ui/card-lg.tsx` — large card wrapper with title/subtitle and content area.

Usage
- Hero example:

```tsx
import Hero from "@/components/ui/hero";

<Hero
  title="Analizează proprietatea ta"
  subtitle="Obține estimări rapide: preț, randament, risc seismic"
  cta={<button className="btn">Analizează</button>}
  image="https://images.unsplash.com/photo-..."
/>
```

- CardLg example:

```tsx
import CardLg from "@/components/ui/card-lg";

<CardLg title="Estimări" subtitle="Date din AVM și comps">
  <div>conținut</div>
</CardLg>
```

Notes
- Prefer `next/image` for external images. Configure `NEXT_PUBLIC_IMAGE_DOMAINS` in environment or update `next.config.ts`.
- Components are intentionally minimal and composable; expand them as needed.
