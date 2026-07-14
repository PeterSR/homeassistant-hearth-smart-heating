import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaState, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import { getAreaDisplayName, clampTemp } from "../utils";
import { tokens, viewStyles } from "../styles";
import "../components/area-form";
import type { AreaFormData } from "../components/area-form";

@customElement("area-settings-view")
export class AreaSettingsView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property() areaId = "";
  @property({ type: Boolean }) narrow = false;

  @state() private _formData: AreaFormData | null = null;
  @state() private _loading = false;
  @state() private _confirmDelete = false;
  @state() private _dirty = false;

  private get _area(): AreaState | undefined {
    return this.hearthState.areas[this.areaId];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._syncFromState();
    this._updateToolbar();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("areaId")) {
      this._syncFromState();
      this._updateToolbar();
    }
    if (changed.has("hearthState") && !this._dirty) {
      this._syncFromState();
    }
  }

  private _syncFromState(): void {
    const area = this._area;
    if (!area) return;
    this._formData = {
      climate_entities: [...(area.climate_entities ?? [])],
      covered_entities: [...(area.covered_entities ?? [])],
      temperature_sensors: area.temperature_sensors ?? [],
      window_sensors: area.window_sensors ?? [],
      home_temp: area.home_temp,
      away_temp: area.away_temp,
      min_temp: area.min_temp,
      max_temp: area.max_temp,
      schedule_id: area.schedule_id ?? "",
    };
    this._dirty = false;
    this._confirmDelete = false;
  }

  private _updateToolbar(): void {
    const area = this._area;
    const name = area ? getAreaDisplayName(area) : this.areaId;
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: { title: `${name} - Settings`, backPath: `/area/${this.areaId}` },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _navigate(path: string): void {
    this.dispatchEvent(
      new CustomEvent("navigate", { detail: { path }, bubbles: true })
    );
  }

  private _onFormChanged(e: CustomEvent<AreaFormData>): void {
    this._formData = e.detail;
    this._dirty = true;
  }

  private async _save(): Promise<void> {
    if (!this._formData) return;
    const d = this._formData;
    const absMin = this.hearthState.global.default_min_temp;
    const absMax = this.hearthState.global.default_max_temp;
    const minTemp = clampTemp(d.min_temp, absMin, absMax);
    const maxTemp = clampTemp(d.max_temp, absMin, absMax);

    this._loading = true;
    try {
      await this.api.updateArea(this.areaId, {
        home_temp: clampTemp(d.home_temp, minTemp, maxTemp),
        away_temp: clampTemp(d.away_temp, minTemp, maxTemp),
        min_temp: minTemp,
        max_temp: maxTemp,
        climate_entities: d.climate_entities,
        covered_entities: d.covered_entities,
        temperature_sensors: d.temperature_sensors,
        window_sensors: d.window_sensors,
        schedule_id: d.schedule_id || null,
      });
      this._dirty = false;
    } catch (e) {
      console.error("Failed to save area settings:", e);
    }
    this._loading = false;
  }

  private _isSharedSchedule(): boolean {
    if (!this._formData?.schedule_id) return false;
    return Object.values(this.hearthState.areas).filter(
      a => a.schedule_id === this._formData!.schedule_id
    ).length > 1;
  }

  private async _customizeSchedule(): Promise<void> {
    const area = this._area;
    if (!area || !this._formData?.schedule_id) return;

    this._loading = true;
    try {
      const newId = `${this.areaId}_custom`;
      await this.api.duplicateSchedule({
        source_schedule_id: this._formData.schedule_id,
        new_schedule_id: newId,
        new_name: `${getAreaDisplayName(area)} Schedule`,
        area_id: this.areaId,
      });
      this._formData = { ...this._formData, schedule_id: newId };
    } catch (e) {
      console.error("Failed to customize schedule:", e);
    }
    this._loading = false;
  }

  private async _syncSchedule(): Promise<void> {
    this._loading = true;
    try {
      await this.api.syncSchedule(this.areaId);
    } catch (e) {
      console.error("Failed to sync schedule:", e);
    }
    this._loading = false;
  }

  private async _handleDelete(): Promise<void> {
    this._loading = true;
    try {
      await this.api.removeArea(this.areaId);
      this._navigate("/");
    } catch (e) {
      console.error("Failed to remove area:", e);
    }
    this._loading = false;
  }

  private _getExcludedClimateEntities(): string[] {
    const excluded: string[] = [];
    for (const [areaId, area] of Object.entries(this.hearthState.areas)) {
      if (areaId === this.areaId) continue;
      for (const eid of area.climate_entities) excluded.push(eid);
    }
    return excluded;
  }

  render() {
    if (!this._formData || !this._area) {
      return html`<div class="container"><p>Area not found.</p></div>`;
    }

    return html`
      <div class="container">
        <area-form
          .hass=${this.hass}
          .hearthState=${this.hearthState}
          .data=${this._formData}
          .areaId=${this.areaId}
          .showMinMax=${true}
          .useCards=${true}
          .showCustomizeSchedule=${!!(this._formData.schedule_id && this._isSharedSchedule())}
          .excludeClimateEntities=${this._getExcludedClimateEntities()}
          @data-changed=${this._onFormChanged}
          @customize-schedule=${() => this._customizeSchedule()}
        ></area-form>

        <div class="save-row">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty || this._loading}
          >
            ${this._loading ? "Saving..." : "Save"}
          </ha-button>
        </div>

        <div class="actions-section">
          <ha-button appearance="plain" @click=${() => this._syncSchedule()}>
            <ha-icon icon="mdi:calendar-sync" slot="icon"></ha-icon>
            Sync schedule
          </ha-button>

          ${this._confirmDelete
            ? html`
                <ha-button appearance="plain" variant="danger"
                  @click=${() => this._handleDelete()} .disabled=${this._loading}>
                  Confirm remove area?
                </ha-button>
              `
            : html`
                <ha-button appearance="plain" variant="danger"
                  @click=${() => (this._confirmDelete = true)}>
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  Remove area
                </ha-button>
              `}
        </div>
      </div>
    `;
  }

  static styles = [
    tokens,
    viewStyles,
    css`
      .save-row {
        display: flex;
        justify-content: flex-end;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .actions-section {
        display: flex;
        gap: var(--ha-space-2, 8px);
        justify-content: center;
        padding-top: var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
    `,
  ];
}
