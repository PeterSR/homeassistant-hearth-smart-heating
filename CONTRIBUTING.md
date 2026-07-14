# Contributing to Hearth

## Repository layout

```
custom_components/hearth/   # HA custom component (Python)
  __init__.py                # Entry point, platform forwarding, frontend panel registration
  coordinator.py             # Tick loop, schedule evaluation, setpoint application
  models.py                  # Data models (AreaConfig, Schedule, GlobalConfig, etc.)
  store.py                   # Persistent storage (.storage/hearth)
  schedule_engine.py         # Materialized schedule evaluation
  sensor.py / binary_sensor.py
  websocket_api.py           # All WS commands (frontend <-> backend)
  services.py                # HA service definitions
  config_flow.py             # Integration setup flow
  adapters/                  # Device abstraction layer (Danfoss vs generic climate)
  features/                  # Danfoss-specific periodic features (time sync, schedule push, etc.)
  brand/                     # Brand icons served to Home Assistant

frontend/
  src/
    hearth-panel.ts          # Main panel with router
    hearth-card.ts           # Single-area Lovelace card
    hearth-cards.ts          # Additional Lovelace cards (schedule, actions, status)
    api.ts, types.ts, utils.ts, styles.ts
    views/                   # Panel views (overview, area detail, schedules, settings, etc.)
    components/              # Shared components (area cards, dialogs, schedule bar)

tests/                       # pytest suite for the pure-logic schedule engine
```

## Building the frontend

Requires Node.js 20+.

```sh
cd frontend
npm install
```

From the repository root:

```sh
make build
```

This syncs the frontend's `package.json` version from `manifest.json`, then runs the Vite production build into `custom_components/hearth/frontend/dist/`.

## Deploying to your own Home Assistant instance

The Makefile assumes an SSH-reachable Home Assistant host. Override it with `HA_HOST`:

```sh
HA_HOST=your-ssh-host make deploy           # build + rsync + enable dev mode
HA_HOST=your-ssh-host make dev              # build + deploy + restart HA
HA_HOST=your-ssh-host make deploy-frontend  # frontend bundle only, no HA restart needed
HA_HOST=your-ssh-host make deploy-backend   # Python only, skips the frontend build
HA_HOST=your-ssh-host make deploy-prod      # like deploy, but disables dev mode
HA_HOST=your-ssh-host make restart          # restart Home Assistant
HA_HOST=your-ssh-host make logs             # tail HA logs filtered to "hearth"
HA_HOST=your-ssh-host make clean            # remove the integration from the host
```

If `HA_HOST` is not set, it defaults to `homeassistant` (a common Home Assistant SSH alias).

### Dev mode

A `.dev` marker file in the deployed integration directory enables cache-busting redirects for the frontend bundle, so you don't need to bump a version number after every change. `make deploy` and `make dev` create this marker automatically; `make deploy-prod` removes it.

## Running the tests

```sh
pip install homeassistant pytest
python -m pytest tests/
```

The test suite covers the schedule engine's pure logic (materialization, overrides, chops, transitions). It requires the `homeassistant` package to be installed, since importing the integration's models module pulls in `homeassistant.components.frontend`.

## Conventions

- `manifest.json` is the single source of truth for the integration version; `make build` propagates it to `frontend/package.json`.
- The frontend uses Home Assistant's own design tokens (`--ha-space-*`, `--ha-font-size-*`, etc.) wherever possible, falling back to a small set of Hearth-specific custom properties only for values Home Assistant doesn't provide.
- `vite.config.ts` sets `base: "/hearth/frontend/"`, which must match the panel's registered URL path for lazy-loaded chunks to resolve correctly.
- Sensor entity IDs are set explicitly (via `self.entity_id`) for predictable, stable IDs. Once Home Assistant registers an entity ID, treat it as permanent.
