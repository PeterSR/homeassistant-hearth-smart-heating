import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, DiscoveredArea } from "../types";
import { HearthApi } from "../api";
import { clampTemp } from "../utils";
import { tokens, formStyles, dialogStyles } from "../styles";
import "./area-form";
import type { AreaFormData } from "./area-form";

@customElement("area-setup-dialog")
export class AreaSetupDialog extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;

  @state() private _open = false;
  @state() private _step = 0;
  @state() private _discovered: DiscoveredArea[] = [];
  @state() private _loading = false;
  @state() private _selectedArea: DiscoveredArea | null = null;
  @state() private _formData: AreaFormData = this._defaultFormData();

  private _defaultFormData(): AreaFormData {
    const g = this.hearthState?.global;
    const schedules = Object.values(this.hearthState?.schedules ?? {});
    return {
      climate_entities: [],
      covered_entities: [],
      temperature_sensors: [],
      window_sensors: [],
      home_temp: g?.default_home_temp ?? 21.0,
      away_temp: g?.default_away_temp ?? 17.0,
      min_temp: g?.default_min_temp ?? 4.0,
      max_temp: g?.default_max_temp ?? 35.0,
      schedule_id: schedules.length > 0 ? schedules[0].schedule_id : "",
    };
  }

  public async open(): Promise<void> {
    this._step = 0;
    this._selectedArea = null;
    this._formData = this._defaultFormData();
    this._open = true;
    this._loading = true;
    try {
      this._discovered = await this.api.discoverAreas();
    } catch (e) {
      console.error("Failed to discover areas:", e);
    }
    this._loading = false;
  }

  private _close(): void { this._open = false; }

  private _selectArea(area: DiscoveredArea): void {
    this._selectedArea = area;
    this._formData = {
      ...this._formData,
      climate_entities: [...area.climate_entities],
      temperature_sensors: area.temperature_sensors ?? [],
    };
    this._step = 1;
  }

  private async _save(): Promise<void> {
    if (!this._selectedArea || this._formData.climate_entities.length === 0) return;
    const d = this._formData;
    const gMin = this.hearthState.global.default_min_temp;
    const gMax = this.hearthState.global.default_max_temp;

    this._loading = true;
    try {
      await this.api.addArea({
        area_id: this._selectedArea.area_id,
        climate_entities: d.climate_entities,
        temperature_sensors: d.temperature_sensors.length > 0 ? d.temperature_sensors : undefined,
        covered_entities: d.covered_entities.length > 0 ? d.covered_entities : undefined,
        window_sensors: d.window_sensors.length > 0 ? d.window_sensors : undefined,
        home_temp: clampTemp(d.home_temp, gMin, gMax),
        away_temp: clampTemp(d.away_temp, gMin, gMax),
        schedule_id: d.schedule_id || undefined,
      });
      this._close();
    } catch (e) {
      console.error("Failed to add area:", e);
    }
    this._loading = false;
  }

  render() {
    if (!this._open) return nothing;

    const title = this._step === 0
      ? "Add Area"
      : this._selectedArea?.area_name ?? "Configure Area";

    return html`
      <div class="dialog-overlay" @click=${this._close}>
        <ha-card class="dialog-card" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <h2>${title}</h2>
            <ha-icon-button .label=${"Close"} @click=${this._close}>
              <ha-icon icon="mdi:close"></ha-icon>
            </ha-icon-button>
          </div>
          <div class="dialog-body">
            ${this._loading
              ? html`<p>Loading...</p>`
              : this._step === 0
                ? this._renderDiscovery()
                : this._renderConfigure()}
          </div>
        </ha-card>
      </div>
    `;
  }

  private _renderDiscovery() {
    const available = this._discovered.filter((d) => !d.already_configured);

    if (available.length === 0) {
      return html`<p>${this._discovered.length === 0
        ? "No areas with climate entities found."
        : "All areas with TRVs are already configured."}</p>`;
    }

    return html`
      <p>Select an area to add:</p>
      <div class="area-list">
        ${available.map(area => html`
          <ha-card @click=${() => this._selectArea(area)} class="area-item">
            <div class="card-content area-row">
              <span>${area.area_name}</span>
              <span class="secondary-label">
                ${area.climate_entities.length} TRV${area.climate_entities.length !== 1 ? "s" : ""}
              </span>
            </div>
          </ha-card>
        `)}
      </div>
    `;
  }

  private _renderConfigure() {
    return html`
      <div class="form">
        <area-form
          .hass=${this.hass}
          .hearthState=${this.hearthState}
          .data=${this._formData}
          .areaId=${this._selectedArea?.area_id ?? ""}
          @data-changed=${(e: CustomEvent<AreaFormData>) => (this._formData = e.detail)}
        ></area-form>
      </div>

      <div class="dialog-actions">
        <ha-button appearance="plain" @click=${() => (this._step = 0)}>Back</ha-button>
        <ha-button @click=${this._save} .disabled=${this._formData.climate_entities.length === 0}>
          Save
        </ha-button>
      </div>
    `;
  }

  static styles = [
    tokens,
    formStyles,
    dialogStyles,
    css`
      .area-list { display: flex; flex-direction: column; gap: var(--ha-space-2, 8px); }
      .area-item { cursor: pointer; }
      .area-row { display: flex; justify-content: space-between; align-items: center; }
      .secondary-label { color: var(--secondary-text-color); font-size: var(--hearth-text-between-s-m, 13px); }
    `,
  ];
}
