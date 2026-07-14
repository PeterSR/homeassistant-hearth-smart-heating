import { LitElement, html, css } from "lit";
import { state } from "lit/decorators.js";
import type { HomeAssistant, HearthState } from "./types";
import { HearthApi } from "./api";
import "./components/area-card";

/**
 * Lovelace card for displaying a single Hearth area.
 * Can be added to any HA dashboard. Wraps area-card internally.
 */
class HearthAreaCard extends LitElement {
  @state() private _config: any = {};
  @state() private _hearthState: HearthState | null = null;

  private _hass?: HomeAssistant;
  private _api?: HearthApi;
  private _unsub?: () => void;

  setConfig(config: any): void {
    if (!config.area_id) {
      throw new Error("Please select an area");
    }
    this._config = config;
  }

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

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._unsub) {
      this._unsub();
      this._unsub = undefined;
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    if (this._api && !this._unsub) {
      this._subscribe();
    }
  }

  private async _subscribe(): Promise<void> {
    if (this._unsub) {
      this._unsub();
      this._unsub = undefined;
    }
    if (!this._api) return;
    try {
      this._unsub = await this._api.subscribe((state) => {
        this._hearthState = state;
      });
    } catch (e) {
      console.error("Hearth card: subscribe failed", e);
    }
  }

  getCardSize(): number {
    return 3;
  }

  private _navigate(): void {
    window.location.href = `/hearth/area/${this._config.area_id}`;
  }

  render() {
    if (!this._hearthState) {
      return html`<ha-card><div class="loading">Loading...</div></ha-card>`;
    }

    const area = this._hearthState.areas[this._config.area_id];
    if (!area) {
      return html`<ha-card><div class="loading">Area not found</div></ha-card>`;
    }

    return html`
      <area-card
        .hass=${this._hass}
        .area=${area}
        @click=${this._navigate}
      ></area-card>
    `;
  }

  static styles = css`
    .loading {
      padding: var(--ha-space-4, 16px);
      color: var(--secondary-text-color);
    }
  `;
}

customElements.define("hearth-area-card", HearthAreaCard);

(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "hearth-area-card",
  name: "Hearth Area",
  description: "Displays a Hearth area with current/target temperature and state",
  preview: true,
});
