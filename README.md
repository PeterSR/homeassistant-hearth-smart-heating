# Hearth

Hearth is a local, self-hosted smart heating integration for Home Assistant. It manages Danfoss Ally TRVs (and, in generic mode, any `climate` entity) through weekly schedules, presence-based home/away detection, and vacation mode, with a full custom panel for day-to-day control. Everything runs locally on your Home Assistant instance: no cloud, no external accounts.

## Features

- Weekly schedules with a visual clock-style editor, shared across one or more areas
- Per-area control: current/target temperature, quick home/away toggles, min/max limits
- Area groups that share a single schedule across multiple rooms
- Home, away, and vacation modes, plus presence-based auto-away
- Manual overrides that expire at the next scheduled transition (or a chosen time)
- Danfoss-specific features: on-device schedule push (so TRVs keep working during a Home Assistant outage), daily time sync, external room-sensor temperature injection, multi-TRV load balancing, and automatic device health monitoring that detects TRV error states and resyncs schedules and time when they recover
- Experimental Danfoss features, not yet field-tested: window-open detection and aggregate boiler demand control
- Works with both ZHA and Zigbee2MQTT, auto-detected per device
- A custom panel: overview, per-area detail, schedule editor, statistics with charts, and a command log for diagnosing what was sent to each device and when
- Lovelace cards for embedding a single area, a schedule bar, quick actions, or a status chip on any dashboard

<!-- TODO: screenshots of overview, area detail, schedule editor -->

## Requirements

- Home Assistant 2026.3.0 or newer
- ZHA or Zigbee2MQTT if you want the Danfoss-specific features
- Danfoss Ally TRVs (model family 014G24xx) for those Danfoss-specific features
- Any `climate` entity works in generic mode (schedules, presence, and vacation, without the Danfoss extras)

## Installation

### HACS (recommended)

1. In Home Assistant, open HACS.
2. Open the three-dot menu in the top right and choose "Custom repositories".
3. Paste this repository's URL (`https://github.com/PeterSR/homeassistant-hearth-smart-heating`), pick category "Integration", and add it.
4. Find "Hearth" in HACS and install it.
5. Restart Home Assistant.
6. Go to Settings > Devices & Services > Add Integration, and search for "Hearth".

### Manual install

1. Copy `custom_components/hearth` from this repository into your Home Assistant `config/custom_components/` directory.
2. Restart Home Assistant.
3. Go to Settings > Devices & Services > Add Integration, and search for "Hearth".

## Configuration

Hearth is configured entirely through its own panel and config flow, not YAML. After adding the integration, open the "Hearth" entry in the sidebar to add areas, build schedules, set up area groups, and adjust global settings (default temperatures, presence entities, auto-away delay, boiler entity, and so on).

## Services

Hearth also exposes services for use in automations and scripts:

| Service | Description |
|---|---|
| `hearth.set_area_override` | Temporarily override an area's temperature until the next transition, a specific time, or indefinitely. |
| `hearth.clear_area_override` | Clear an area's active override. |
| `hearth.set_area_state` | Set an area to home or away, holding until the next scheduled transition. |
| `hearth.set_area_enabled` | Enable or disable an area entirely. |
| `hearth.resume_schedule` | Undo overrides and chops, returning an area to its schedule template. |
| `hearth.sync_schedule` | Re-apply the schedule template to an area, discarding today's chops. |
| `hearth.set_vacation` | Enable or disable vacation mode for all areas. |
| `hearth.trigger_home` | Set every area to home. |
| `hearth.trigger_away` | Set every area to away. |

## How it works

A coordinator ticks once a minute, evaluating every configured area and applying setpoints where needed. Each area's weekly schedule template is "materialized" into a concrete list of datetimes for the next couple of days; ad-hoc changes (a manual home/away tap, an override) are inserted as chops into that materialized schedule rather than mutating the template, so the underlying weekly plan is never lost. Vacation mode works the same way: it swaps in a different template at materialization time, so the evaluation logic does not need to know vacation is happening at all.

A device adapter layer abstracts away the difference between Danfoss Ally TRVs (controlled via raw Zigbee commands) and generic `climate` entities, and auto-detects whether a given Danfoss device is running on ZHA or Zigbee2MQTT. For Danfoss devices, the schedule is also pushed to the TRV's own on-device memory as a fallback, so heating keeps running to a sensible plan even if Home Assistant is down or unreachable.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for build instructions, the development workflow, and how to run the test suite.

## Disclaimer

Hearth is an independent, community-built project. It is not affiliated with, endorsed by, or supported by Danfoss A/S. "Danfoss" and "Ally" are trademarks of Danfoss A/S, used here only to identify the devices this integration works with. This software is provided as-is, without warranty of any kind. It controls physical heating equipment; review the code and use at your own risk.

## License

MIT, see [LICENSE](LICENSE).
