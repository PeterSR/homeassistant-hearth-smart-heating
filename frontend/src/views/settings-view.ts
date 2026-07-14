import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import { tokens, viewStyles } from "../styles";

const LABELS: Record<string, string> = {
  default_home_temp: "Home temperature",
  default_away_temp: "Away temperature",
  default_min_temp: "Minimum temperature",
  default_max_temp: "Maximum temperature",
  presence_entities: "Presence entities",
  auto_away_enabled: "Enable auto-away",
  auto_away_delay_minutes: "Delay before away",
  boiler_entity: "Boiler entity",
  boiler_demand_threshold: "Boiler demand threshold",
  low_battery_threshold: "Low battery warning (%)",
  ungrouped_position: "Ungrouped areas position",
};

const TEMP_SCHEMA = [
  {
    type: "grid" as const,
    name: "",
    schema: [
      { name: "default_home_temp", selector: { number: { min: 4, max: 35, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
      { name: "default_away_temp", selector: { number: { min: 4, max: 35, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
    ],
  },
  {
    type: "grid" as const,
    name: "",
    schema: [
      { name: "default_min_temp", selector: { number: { min: 4, max: 35, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
      { name: "default_max_temp", selector: { number: { min: 4, max: 35, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
    ],
  },
];

const PRESENCE_SCHEMA = [
  { name: "presence_entities", selector: { entity: { domain: ["person", "binary_sensor", "group", "input_boolean"], multiple: true } } },
  { name: "auto_away_enabled", selector: { boolean: {} } },
  { name: "auto_away_delay_minutes", selector: { number: { min: 0, max: 120, step: 1, unit_of_measurement: "min", mode: "box" as const } } },
];

const ALERTS_SCHEMA = [
  { name: "low_battery_threshold", selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: "%", mode: "box" as const } } },
];

const BOILER_SCHEMA = [
  { name: "boiler_entity", selector: { entity: { domain: ["switch", "input_boolean"] } } },
  { name: "boiler_demand_threshold", selector: { number: { min: 0, max: 100, step: 1, unit_of_measurement: "%", mode: "box" as const } } },
];

const ADVANCED_SCHEMA = [
  { name: "ungrouped_position", selector: { select: { mode: "dropdown" as const, options: [{ value: "top", label: "Top (before groups)" }, { value: "bottom", label: "Bottom (after groups)" }] } } },
];

@customElement("settings-view")
export class SettingsView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property({ type: Boolean }) narrow = false;

  @state() private _tempData: Record<string, any> = {};
  @state() private _presenceData: Record<string, any> = {};
  @state() private _alertsData: Record<string, any> = {};
  @state() private _advancedData: Record<string, any> = {};
  @state() private _vacationScheduleId: string = "";

  @state() private _dirty = false;
  @state() private _saving = false;

  private _initialized = false;

  connectedCallback(): void {
    super.connectedCallback();
    this._updateToolbar();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("hearthState") && this.hearthState && !this._dirty) {
      this._syncFromState();
    }
  }

  private _syncFromState(): void {
    const g = this.hearthState.global;
    this._tempData = {
      default_home_temp: g.default_home_temp,
      default_away_temp: g.default_away_temp,
      default_min_temp: g.default_min_temp,
      default_max_temp: g.default_max_temp,
    };
    this._presenceData = {
      presence_entities: g.presence_entities ?? [],
      auto_away_enabled: g.auto_away_enabled,
      auto_away_delay_minutes: g.auto_away_delay_minutes,
    };
    this._alertsData = {
      low_battery_threshold: g.low_battery_threshold,
    };
    this._advancedData = {
      boiler_entity: g.boiler_entity ?? "",
      boiler_demand_threshold: g.boiler_demand_threshold ?? 5,
      ungrouped_position: g.ungrouped_position ?? "top",
    };
    this._vacationScheduleId = g.vacation_schedule_id ?? "";
    this._initialized = true;
  }

  private _updateToolbar(): void {
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: { title: "Settings", backPath: "/" },
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

  private _computeLabel = (schema: any): string =>
    LABELS[schema.name] ?? schema.name;

  private _onTempChanged(e: CustomEvent): void {
    this._tempData = { ...this._tempData, ...e.detail.value };
    this._dirty = true;
  }

  private _onPresenceChanged(e: CustomEvent): void {
    this._presenceData = { ...this._presenceData, ...e.detail.value };
    this._dirty = true;
  }

  private _onAlertsChanged(e: CustomEvent): void {
    this._alertsData = { ...this._alertsData, ...e.detail.value };
    this._dirty = true;
  }

  private _onAdvancedChanged(e: CustomEvent): void {
    this._advancedData = { ...this._advancedData, ...e.detail.value };
    this._dirty = true;
  }

  private async _save(): Promise<void> {
    this._saving = true;
    try {
      await this.api.updateGlobalConfig({
        ...this._tempData,
        ...this._presenceData,
        ...this._alertsData,
        ...this._advancedData,
        vacation_schedule_id: this._vacationScheduleId || null,
        presence_entities: this._presenceData.presence_entities || [],
        boiler_entity: this._advancedData.boiler_entity || null,
      });
      this._dirty = false;
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
    this._saving = false;
  }

  render() {
    if (!this._initialized) {
      return html`<div class="container"><p>Loading...</p></div>`;
    }

    const schedules = Object.values(this.hearthState.schedules);

    return html`
      <div class="container">
        <ha-card>
          <div class="nav-row" @click=${() => this._navigate("/schedules")}>
            <ha-icon icon="mdi:calendar-clock" class="nav-icon"></ha-icon>
            <div class="nav-text">
              <span class="nav-label">Schedules</span>
              <span class="nav-meta">${Object.keys(this.hearthState.schedules).length} schedule${Object.keys(this.hearthState.schedules).length !== 1 ? "s" : ""}</span>
            </div>
            <ha-icon icon="mdi:chevron-right" class="nav-chevron"></ha-icon>
          </div>
          <div class="nav-row" @click=${() => this._navigate("/groups")}>
            <ha-icon icon="mdi:folder-multiple" class="nav-icon"></ha-icon>
            <div class="nav-text">
              <span class="nav-label">Area Groups</span>
              <span class="nav-meta">${Object.keys(this.hearthState.groups ?? {}).length} group${Object.keys(this.hearthState.groups ?? {}).length !== 1 ? "s" : ""}</span>
            </div>
            <ha-icon icon="mdi:chevron-right" class="nav-chevron"></ha-icon>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Default Temperatures</h3>
            <p class="section-desc">Applied when creating new areas.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${TEMP_SCHEMA}
              .data=${this._tempData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onTempChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Vacation</h3>
            <p class="section-desc">
              Default schedule to use when activating vacation mode.
              All areas will follow this schedule instead of their own.
            </p>
            <ha-form
              .hass=${this.hass}
              .schema=${[{
                name: "vacation_schedule_id",
                selector: { select: {
                  mode: "dropdown",
                  options: [
                    { value: "", label: "None (ask when activating)" },
                    ...schedules.map(s => ({ value: s.schedule_id, label: s.name })),
                  ],
                }},
              }]}
              .data=${{ vacation_schedule_id: this._vacationScheduleId }}
              .computeLabel=${() => "Vacation schedule"}
              @value-changed=${(e: CustomEvent) => {
                this._vacationScheduleId = e.detail.value.vacation_schedule_id ?? "";
                this._dirty = true;
              }}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Presence Detection</h3>
            <p class="section-desc">
              Automatically switch all areas to away when nobody is home.
            </p>
            <ha-form
              .hass=${this.hass}
              .schema=${PRESENCE_SCHEMA}
              .data=${this._presenceData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onPresenceChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Alerts</h3>
            <p class="section-desc">Show a warning on the overview when device batteries are low.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${ALERTS_SCHEMA}
              .data=${this._alertsData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onAlertsChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Boiler</h3>
            <p class="section-desc">Control a boiler relay based on aggregated heat demand.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${BOILER_SCHEMA}
              .data=${this._advancedData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onAdvancedChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Advanced</h3>
            <ha-form
              .hass=${this.hass}
              .schema=${ADVANCED_SCHEMA}
              .data=${this._advancedData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onAdvancedChanged}
            ></ha-form>
          </div>
        </ha-card>

        <div class="save-row">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty || this._saving}
          >
            ${this._saving ? "Saving..." : "Save"}
          </ha-button>
        </div>

        <div class="debug-link">
          <ha-button appearance="plain" @click=${() => this._navigate("/debug")}>
            <ha-icon icon="mdi:bug" slot="icon"></ha-icon>
            Debug / Troubleshooting
          </ha-button>
        </div>
      </div>
    `;
  }

  static styles = [
    tokens,
    viewStyles,
    css`
      ha-card {
        margin-bottom: var(--ha-space-6, 24px);
      }
      .card-content {
        padding: var(--ha-space-4, 16px);
      }
      .section-title {
        margin: 0 0 var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--primary-text-color);
      }
      .section-desc {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
        margin: 0 0 var(--ha-space-4, 16px);
      }
      .save-row {
        display: flex;
        justify-content: flex-end;
        margin-top: var(--ha-space-2, 8px);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-m, 14px);
        color: var(--primary-text-color);
      }
      .nav-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        cursor: pointer;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .nav-row:last-child, .nav-row:last-of-type {
        border-bottom: none;
      }
      .nav-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .nav-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 24px;
        flex-shrink: 0;
      }
      .nav-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav-label {
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .nav-meta {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .nav-chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        flex-shrink: 0;
      }
      .nav-setting {
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .debug-link {
        display: flex;
        justify-content: center;
        margin-top: var(--ha-space-6, 24px);
        padding-top: var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .field select {
        padding: var(--ha-space-2, 8px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        background: var(--card-background-color, white);
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-m, 14px);
        font-family: inherit;
      }
    `,
  ];
}
