/**
 * Additional Lovelace cards for Hearth.
 *
 * - hearth-schedule-card: Today's schedule bar for an area
 * - hearth-actions-card: House-wide Home All / Away All / Vacation buttons
 * - hearth-status-card: Global state chip
 */

import { LitElement, html, css, nothing } from "lit";
import { state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaState } from "./types";
import { HearthApi } from "./api";
import { getGlobalState, getAreaDisplayName, formatNextTransition } from "./utils";
import { tokens } from "./styles";
import "./components/schedule-bar";

// ---------------------------------------------------------------------------
// Shared mixin: subscribe to Hearth state
// ---------------------------------------------------------------------------

/** Base class for Hearth Lovelace cards with state subscription. */
class HearthCardBase extends LitElement {
  _config: any = {};
  _hearthState: HearthState | null = null;
  _hass?: HomeAssistant;
  _api?: HearthApi;
  _unsub?: () => void;

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    if (!this._api && hass) {
      this._api = new HearthApi(hass);
      this._subscribe();
    } else if (this._api && hass) {
      this._api = new HearthApi(hass);
    }
    this.requestUpdate();
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this._api && !this._unsub) this._subscribe();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsub) { this._unsub(); this._unsub = undefined; }
  }

  async _subscribe(): Promise<void> {
    if (this._unsub) { this._unsub(); this._unsub = undefined; }
    if (!this._api) return;
    try {
      this._unsub = await this._api.subscribe((s: HearthState) => {
        this._hearthState = s;
        this.requestUpdate();
      });
    } catch (e) { console.error("Hearth card subscribe failed", e); }
  }
}

// ---------------------------------------------------------------------------
// Schedule Card
// ---------------------------------------------------------------------------

class HearthScheduleCard extends HearthCardBase {
  @state() _config: any = {};
  @state() _hearthState: HearthState | null = null;

  setConfig(config: any): void {
    if (!config.area_id) throw new Error("Please set area_id");
    this._config = config;
  }

  getCardSize(): number { return 3; }

  render() {
    if (!this._hearthState) return html`<ha-card><div class="loading">Loading...</div></ha-card>`;
    const area: AreaState | undefined = this._hearthState.areas[this._config.area_id];
    if (!area) return html`<ha-card><div class="loading">Area not found</div></ha-card>`;

    const entries = area.today_schedule ?? [];
    const next = formatNextTransition(area);

    return html`
      <ha-card>
        <div class="content">
          <div class="header">
            <span class="name">${getAreaDisplayName(area)}</span>
            ${next ? html`<span class="next">${next}</span>` : nothing}
          </div>
          <schedule-bar
            .entries=${entries}
            .homeTemp=${area.home_temp}
            .awayTemp=${area.away_temp}
          ></schedule-bar>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    tokens,
    css`
      .content { padding: var(--ha-space-4, 16px); }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--ha-space-2, 8px);
      }
      .name {
        font-weight: var(--ha-font-weight-medium, 500);
        font-size: var(--ha-font-size-m, 14px);
      }
      .next {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .loading {
        padding: var(--ha-space-4, 16px);
        color: var(--secondary-text-color);
      }
    `,
  ];
}

// ---------------------------------------------------------------------------
// Actions Card
// ---------------------------------------------------------------------------

class HearthActionsCard extends HearthCardBase {
  @state() _config: any = {};
  @state() _hearthState: HearthState | null = null;

  setConfig(config: any): void { this._config = config; }
  getCardSize(): number { return 2; }

  private async _homeAll(): Promise<void> {
    if (!this._api || !this._hearthState) return;
    await this._api.setVacation(false);
    for (const areaId of Object.keys(this._hearthState.areas)) {
      await this._api.setAreaState(areaId, "home");
    }
  }

  private async _awayAll(): Promise<void> {
    if (!this._api || !this._hearthState) return;
    for (const areaId of Object.keys(this._hearthState.areas)) {
      await this._api.setAreaState(areaId, "away");
    }
  }

  private async _toggleVacation(): Promise<void> {
    if (!this._api || !this._hearthState) return;
    const isOn = this._hearthState.global.vacation_mode;
    if (isOn) {
      await this._api.setVacation(false);
    } else {
      // Use default vacation schedule, or first available
      const defaultId = this._hearthState.global.vacation_schedule_id;
      const schedules = this._hearthState.schedules;
      if (defaultId && schedules[defaultId]) {
        await this._api.setVacation(true);
      } else {
        const firstId = Object.keys(schedules)[0];
        if (firstId) {
          await this._api.setVacation(true, firstId);
        }
      }
    }
  }

  render() {
    if (!this._hearthState) return html`<ha-card><div class="loading">Loading...</div></ha-card>`;
    const vacationOn = this._hearthState.global.vacation_mode;

    return html`
      <ha-card>
        <div class="content">
          <ha-button @click=${this._homeAll}>
            <ha-icon icon="mdi:home" slot="icon"></ha-icon>
            Home All
          </ha-button>
          <ha-button @click=${this._awayAll}>
            <ha-icon icon="mdi:exit-run" slot="icon"></ha-icon>
            Away All
          </ha-button>
          <ha-button @click=${this._toggleVacation}>
            <ha-icon icon="mdi:beach" slot="icon"></ha-icon>
            ${vacationOn ? "Vacation Off" : "Vacation On"}
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    .content {
      display: flex;
      gap: var(--ha-space-2, 8px);
      padding: var(--ha-space-4, 16px);
      justify-content: center;
      flex-wrap: wrap;
    }
    .loading {
      padding: var(--ha-space-4, 16px);
      color: var(--secondary-text-color);
    }
  `;
}

// ---------------------------------------------------------------------------
// Status Card
// ---------------------------------------------------------------------------

const STATE_COLORS: Record<string, string> = {
  home: "var(--hearth-color-home, #039be5)",
  away: "var(--hearth-color-away, #9e9e9e)",
  off: "var(--hearth-color-off, #bdbdbd)",
  vacation: "var(--hearth-color-vacation, #ffb300)",
};

class HearthStatusCard extends HearthCardBase {
  @state() _config: any = {};
  @state() _hearthState: HearthState | null = null;

  setConfig(config: any): void { this._config = config; }
  getCardSize(): number { return 1; }

  render() {
    if (!this._hearthState) return html`<ha-card><div class="chip loading">...</div></ha-card>`;

    const globalState = getGlobalState(this._hearthState);
    const label = globalState ?? "mixed";
    const color = globalState ? STATE_COLORS[globalState] ?? STATE_COLORS.off : "var(--secondary-text-color)";
    const autoAway = this._hearthState.global.auto_away_active;

    return html`
      <ha-card>
        <div class="chip" style="--chip-color: ${color}">
          <ha-icon icon=${this._stateIcon(globalState)}></ha-icon>
          <span class="label">${label}${autoAway ? " (auto)" : ""}</span>
        </div>
      </ha-card>
    `;
  }

  private _stateIcon(state: string | null): string {
    switch (state) {
      case "home": return "mdi:home";
      case "away": return "mdi:exit-run";
      case "vacation": return "mdi:beach";
      case "off": return "mdi:power-off";
      default: return "mdi:home-thermometer";
    }
  }

  static styles = [
    tokens,
    css`
      ha-card {
        overflow: hidden;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        color: white;
        background: var(--chip-color);
        font-weight: var(--ha-font-weight-medium, 500);
        text-transform: capitalize;
      }
      .chip.loading {
        background: var(--divider-color);
        color: var(--secondary-text-color);
      }
      .label {
        font-size: var(--ha-font-size-m, 14px);
      }
    `,
  ];
}

// ---------------------------------------------------------------------------
// Register cards
// ---------------------------------------------------------------------------

if (!customElements.get("hearth-schedule-card")) {
  customElements.define("hearth-schedule-card", HearthScheduleCard);
}
if (!customElements.get("hearth-actions-card")) {
  customElements.define("hearth-actions-card", HearthActionsCard);
}
if (!customElements.get("hearth-status-card")) {
  customElements.define("hearth-status-card", HearthStatusCard);
}

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push(
  {
    type: "hearth-schedule-card",
    name: "Hearth Schedule",
    description: "Today's heating schedule for an area",
    preview: true,
  },
  {
    type: "hearth-actions-card",
    name: "Hearth Actions",
    description: "Home All / Away All / Vacation buttons",
    preview: true,
  },
  {
    type: "hearth-status-card",
    name: "Hearth Status",
    description: "Shows the current global heating state",
    preview: true,
  },
);
