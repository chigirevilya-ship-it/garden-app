# GardenOS

A multi-user web app for managing home gardens: a spatial map of plantings, a plant catalog
with **reference + observed** data layers, auto-generated and recurring care tasks, AI-assisted
plant lookup, a seasonal calendar, journaling, and a seed & supply inventory.

## Architecture

- **Frontend:** React 19 + TypeScript + Vite + Tailwind 4 SPA. State in Zustand; each garden's
  data hydrates into the store and syncs back (debounced) to storage.
- **Backend:** small Express server (`server/`) — cookie-session auth (scrypt-hashed passwords),
  per-user gardens stored as JSON files under `data/`, and a server-side proxy for AI plant
  lookups using `ANTHROPIC_API_KEY`. One container serves both API and static app.
- **Demo/local mode:** if no backend is reachable (e.g. a static hosting of `dist/`), the app
  falls back to browser-localStorage gardens automatically — no accounts, single device.

## Key concepts

- **Catalog vs. garden:** the Plants screen has two tabs. The *catalog* holds plant definitions
  (species-level: care data, colors, recommended tasks). "Add to garden" — or tapping a spot on
  the map and picking from the catalog — creates a *planting* (instance) you manage individually,
  including per-instance observed overrides (bloom time, size) via `resolvePlant`.
- **AI lookup:** enter a common and/or scientific name, and Claude fills in the care fields,
  four seasonal palette colors, and 1–4 recommended care tasks (deadheading, dividing, mulching…)
  which are instantiated for every planting of that catalog plant.
- **Recurring tasks:** tasks can repeat yearly or every N weeks; completing one schedules the
  next occurrence, dismissing ends the series.
- **Colors:** seasonal colors come from a curated ~30-swatch garden palette (AI results are
  snapped to it), picked per season in four taps.

## Development

```bash
npm install
node server/index.mjs &   # API on :8787 (uses ./data)
npm run dev               # Vite dev server, proxies /api -> :8787
npm run build             # typecheck + production build
```

## Self-hosting (NAS / home server)

```bash
cp .env.example .env      # set ANTHROPIC_API_KEY (optional), tunnel token, etc.
docker compose up -d --build
```

Serves on port 8420. Gardens/users persist in `./data` on the host (back this folder up).
Environment variables:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Optional. Enables AI plant lookup for all users, server-side. Without it, each browser can supply its own key in Settings. |
| `REGISTRATION_OPEN` | Default `true`. Set `false` to stop new sign-ups once your household has accounts. |
| `DATA_DIR` | Storage directory (default `/app/data` in the container). |

First visit: create an account, then create your first garden (optionally seeded with sample
data). If the browser previously used the single-user version of GardenOS, its garden is
migrated into the account automatically on first login.

### Make it reachable from anywhere (tunnel)

`docker-compose.tunnel.yml` adds a Cloudflare Tunnel sidecar:

```bash
docker compose -f docker-compose.yml -f docker-compose.tunnel.yml up -d --build
```

Point the tunnel's public hostname at **HTTP → `gardenos:80`**. Alternatively use Tailscale
(`tailscale funnel --bg 8420`). Since the app now has accounts, set `REGISTRATION_OPEN=false`
after your users have registered if the URL is publicly reachable.
