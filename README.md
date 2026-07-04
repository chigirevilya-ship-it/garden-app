# GardenOS

A responsive web app for managing a home garden: a spatial map of plantings, a personal plant
database with **reference + observed** data layers, auto-generated care tasks, a seasonal
calendar, journaling, and a seed & supply inventory.

This build implements the **GardenOS screens** from the design docs
(`gardenOS_user_stories.md`, `gardenOS_system_design.md`) as a client-side React app with an
in-browser data layer (Zustand + localStorage) standing in for the future API.

## Screens

| Route | Screen | Stories |
|---|---|---|
| `/` | Dashboard — This Week card, blooming now, alerts | US-402 |
| `/map` | Garden Map — season toggle, layer panel (height / spacing / sunlight / companions / drainage), tap-to-place, move, spacing & companion warnings | US-101–104, US-702 |
| `/plants` | Plant Database — card grid, filters (type / bed / blooming now / search), add-plant with reference autocomplete, Past Plants archive | US-201–203 |
| `/plants/:id` | Plant Detail — reference vs. ✎ observed attributes, provenance, journal timeline, archive/death log | US-204, US-501, US-502 |
| `/tasks` | Task View — urgency groups (Overdue / Due Soon / Upcoming), complete / snooze / dismiss, custom tasks, frost banner | US-301–303 |
| `/calendar` | Seasonal Calendar — 12 month tiles with bloom chips + task counts, month detail | US-401 |
| `/inventory` | Inventory — Good/Low/Out status, reorder list with source links | US-601, US-602 |
| `/settings` | Garden profile (zone, frost dates, dimensions, units), CSV export | US-801, US-802 |

The shell is responsive (NFR-1/2, US-803): persistent sidebar ≥1024px, bottom tab bar + sheets
below. The map is touch-first — pinch-zoom, drag-pan, tap-to-place (NFR-5). Fonts are
self-hosted so the app renders fully without network access.

## Two-layer plant data (US-204, NFR-8)

`src/lib/plant.ts#resolvePlant` merges reference species data with per-plant observed
overrides. Every consumer — the task engine, calendar, map layers, spacing and companion
checks — reads through this resolver. Setting or clearing an observed value regenerates the
affected tasks immediately (`src/lib/taskEngine.ts`, idempotent via `genKey`).

## Development

```bash
npm install
npm run dev       # local dev server
npm run build     # typecheck + production build
npm run preview   # serve the production build
```

Stack: React 19 · TypeScript · Vite · Tailwind CSS 4 · Zustand (persisted to localStorage) ·
React Router. Demo data seeds on first load; state persists per browser.
