import { LitElement, html, css, nothing, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { HomeAssistant, HearthState } from "../types";
import { getAreaTemperatureSensors } from "../utils";
import { tokens } from "../styles";

export interface AreaFormData {
  climate_entities: string[];
  covered_entities: string[];
  temperature_sensors: string[];
  window_sensors: string[];
  home_temp: number;
  away_temp: number;
  min_temp: number;
  max_temp: number;
  schedule_id: string;
}

@customElement("area-form")
export class AreaForm extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) hearthState!: HearthState;
  @property({ attribute: false }) data!: AreaFormData;
  /** HA area ID - used for temperature sensor filtering. */
  @property() areaId = "";
  /** Show min/max temp fields (edit mode). */
  @property({ type: Boolean }) showMinMax = false;
  /** Wrap each section in its own ha-card (for full-page settings). */
  @property({ type: Boolean }) useCards = false;
  /** Show "Customize schedule" button inside the schedule card. */
  @property({ type: Boolean }) showCustomizeSchedule = false;
  /** Climate entities to exclude from the picker (used by other areas). */
  @property({ attribute: false }) excludeClimateEntities: string[] = [];

  /** Wrap content in an ha-card when useCards is true, otherwise render bare. */
  private _section(content: TemplateResult): TemplateResult {
    if (!this.useCards) return content;
    return html`<ha-card><div class="card-content">${content}</div></ha-card>`;
  }

  private _emit(patch: Partial<AreaFormData>): void {
    this.dispatchEvent(
      new CustomEvent<AreaFormData>("data-changed", {
        detail: { ...this.data, ...patch },
        bubbles: true,
      })
    );
  }

  render() {
    const d = this.data;
    const g = this.hearthState.global;
    const schedules = Object.values(this.hearthState.schedules);

    const tempSchema = this.showMinMax
      ? [
          { type: "grid" as const, name: "", schema: [
            { name: "home_temp", selector: { number: { min: d.min_temp, max: d.max_temp, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
            { name: "away_temp", selector: { number: { min: d.min_temp, max: d.max_temp, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
          ]},
          { type: "grid" as const, name: "", schema: [
            { name: "min_temp", selector: { number: { min: g.default_min_temp, max: g.default_max_temp, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
            { name: "max_temp", selector: { number: { min: g.default_min_temp, max: g.default_max_temp, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
          ]},
        ]
      : [
          { type: "grid" as const, name: "", schema: [
            { name: "home_temp", selector: { number: { min: g.default_min_temp, max: g.default_max_temp, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
            { name: "away_temp", selector: { number: { min: g.default_min_temp, max: g.default_max_temp, step: 0.5, unit_of_measurement: "°C", mode: "box" as const } } },
          ]},
        ];

    const climateSchema = this.excludeClimateEntities.length > 0
      ? [{ name: "climate_entities", selector: { entity: { domain: ["climate"], multiple: true, exclude_entities: this.excludeClimateEntities } } }]
      : [{ name: "climate_entities", selector: { entity: { domain: ["climate"], multiple: true } } }];

    const unavailable = d.climate_entities.filter(eid => {
      const s = this.hass.states[eid];
      return !s || s.state === "unavailable";
    });

    return html`
      ${this._section(html`
        <h3 class="section-title first">Climate entities</h3>
        ${unavailable.length > 0
          ? html`<p class="warning-text">${unavailable.length} device${unavailable.length > 1 ? "s" : ""} unavailable</p>`
          : nothing}
        <ha-form
          .hass=${this.hass}
          .schema=${climateSchema}
          .data=${{ climate_entities: d.climate_entities }}
          .computeLabel=${() => "TRVs / thermostats"}
          @value-changed=${(e: CustomEvent) =>
            this._emit({ climate_entities: e.detail.value.climate_entities ?? [] })}
        ></ha-form>
      `)}

      ${this._section(html`
        <h3 class="section-title ${this.useCards ? "first" : ""}">Temperature sensors</h3>
        ${d.temperature_sensors.length === 0
          ? html`<p class="hint-text">No external sensors: room temperature will be read from the TRV's built-in sensor.</p>`
          : nothing}
        <ha-form
          .hass=${this.hass}
          .schema=${[{ name: "temperature_sensors", selector: { entity: { domain: ["sensor"], device_class: "temperature", multiple: true, include_entities: getAreaTemperatureSensors(this.hass, this.areaId) } } }]}
          .data=${{ temperature_sensors: d.temperature_sensors }}
          .computeLabel=${() => "External sensors"}
          @value-changed=${(e: CustomEvent) =>
            this._emit({ temperature_sensors: e.detail.value.temperature_sensors ?? [] })}
        ></ha-form>
      `)}

      ${d.climate_entities.length > 0 ? this._section(html`
        <h3 class="section-title ${this.useCards ? "first" : ""}">Radiator covered</h3>
        <p class="hint-text">Mark TRVs behind a radiator cover. Covered TRVs require an external temperature sensor.</p>
        ${d.climate_entities.map(eid => {
          const state = this.hass.states[eid];
          const name = state?.attributes?.friendly_name ?? eid;
          const checked = d.covered_entities.includes(eid);
          return html`
            <ha-formfield .label=${name}>
              <ha-switch
                .checked=${checked}
                @change=${(e: Event) => {
                  const on = (e.target as any).checked;
                  this._emit({
                    covered_entities: on
                      ? [...d.covered_entities, eid]
                      : d.covered_entities.filter(id => id !== eid),
                  });
                }}
              ></ha-switch>
            </ha-formfield>
          `;
        })}
        ${d.covered_entities.length > 0 && d.temperature_sensors.length === 0
          ? html`<p class="warning-text">Covered TRVs require an external temperature sensor.</p>`
          : nothing}
      `) : nothing}

      ${this._section(html`
        <h3 class="section-title ${this.useCards ? "first" : ""}">Window sensors <span class="untested-badge">UNTESTED</span></h3>
        <p class="hint-text">Optional: Reduce heating when windows are open.</p>
        <ha-form
          .hass=${this.hass}
          .schema=${[{ name: "window_sensors", selector: { entity: { domain: ["binary_sensor"], device_class: "window", multiple: true } } }]}
          .data=${{ window_sensors: d.window_sensors }}
          .computeLabel=${() => "Window sensors"}
          @value-changed=${(e: CustomEvent) =>
            this._emit({ window_sensors: e.detail.value.window_sensors ?? [] })}
        ></ha-form>
      `)}

      ${this._section(html`
        <h3 class="section-title ${this.useCards ? "first" : ""}">Temperatures</h3>
        <ha-form
          .hass=${this.hass}
          .schema=${tempSchema}
          .data=${{ home_temp: d.home_temp, away_temp: d.away_temp, min_temp: d.min_temp, max_temp: d.max_temp }}
          .computeLabel=${(s: any) => {
            const labels: Record<string, string> = { home_temp: "Home temp", away_temp: "Away temp", min_temp: "Min temp", max_temp: "Max temp" };
            return labels[s.name] ?? s.name;
          }}
          @value-changed=${(e: CustomEvent) => {
            const v = e.detail.value;
            this._emit({
              home_temp: v.home_temp,
              away_temp: v.away_temp,
              ...(this.showMinMax ? { min_temp: v.min_temp, max_temp: v.max_temp } : {}),
            });
          }}
        ></ha-form>
      `)}

      ${schedules.length > 0 ? this._section(html`
        <h3 class="section-title ${this.useCards ? "first" : ""}">Schedule</h3>
        <ha-form
          .hass=${this.hass}
          .schema=${[{
            name: "schedule_id",
            selector: { select: {
              mode: "dropdown",
              options: schedules.map(g => ({ value: g.schedule_id, label: g.name })),
            }},
          }]}
          .data=${{ schedule_id: d.schedule_id }}
          .computeLabel=${() => "Schedule"}
          @value-changed=${(e: CustomEvent) =>
            this._emit({ schedule_id: e.detail.value.schedule_id ?? "" })}
        ></ha-form>
        ${this.showCustomizeSchedule
          ? html`
              <ha-button appearance="plain" style="margin-top: var(--ha-space-3, 12px)" @click=${() =>
                this.dispatchEvent(new CustomEvent("customize-schedule", { bubbles: true }))}>
                <ha-icon icon="mdi:pencil-plus" slot="icon"></ha-icon>
                Customize schedule for this area
              </ha-button>
            `
          : nothing}
      `) : nothing}
    `;
  }

  static styles = [
    tokens,
    css`
      :host { display: block; }
      .section-title {
        margin: var(--ha-space-6, 24px) 0 var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .section-title.first { margin-top: 0; }
      ha-card { margin-bottom: var(--ha-space-6, 24px); }
      .card-content { padding: var(--ha-space-4, 16px); }
      .hint-text {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-1, 4px);
        font-style: italic;
      }
      .warning-text {
        color: var(--error-color, #db4437);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-1, 4px);
      }
      .untested-badge {
        font-size: 9px;
        background: var(--warning-color, #ff9800);
        color: white;
        padding: 1px 5px;
        border-radius: var(--ha-border-radius-pill, 9999px);
        vertical-align: middle;
        text-transform: none;
        letter-spacing: 0;
      }
    `,
  ];
}
