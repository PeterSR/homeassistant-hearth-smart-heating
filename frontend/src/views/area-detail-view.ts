import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaState, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import {
  tokens,
  viewStyles,
  tempDisplayStyles,
  secondaryTextStyles,
  sectionStyles,
  modeBadgeStyles,
} from "../styles";
import { getAreaDisplayName, formatTempWithUnit, batteryIcon, Debouncer } from "../utils";
import "../components/schedule-bar";
import "../components/device-status";

@customElement("area-detail-view")
export class AreaDetailView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property() areaId = "";
  @property({ type: Boolean }) narrow = false;

  /** Optimistic target temp - shown immediately on +/- clicks, cleared when backend catches up. */
  @state() private _optimisticTarget: number | null = null;
  private _setpointDebounce = new Debouncer<number>(
    (temp) => this.api.setOverride(this.areaId, temp),
    400,
  );

  private get _area(): AreaState | undefined {
    return this.hearthState.areas[this.areaId];
  }

  /** The displayed target temp: optimistic if set, otherwise from subscription state. */
  private get _displayTarget(): number | null {
    return this._optimisticTarget ?? this._area?.target_temp ?? null;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._updateToolbar();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._setpointDebounce.flush();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("areaId")) {
      // Reset optimistic state when navigating to a different area
      this._optimisticTarget = null;
      this._setpointDebounce.cancel();
    }
    if (changed.has("areaId") || changed.has("hearthState")) {
      // Clear optimistic target once backend catches up
      if (this._optimisticTarget !== null && this._area) {
        if (this._area.target_temp !== null &&
            Math.abs(this._area.target_temp - this._optimisticTarget) < 0.05) {
          this._optimisticTarget = null;
        }
      }
      this._updateToolbar();
    }
  }

  private _getDisplayName(): string {
    const area = this._area;
    if (!area) return this.areaId;
    return getAreaDisplayName(area);
  }

  private _updateToolbar(): void {
    const area = this._area;
    const state = area?.effective_state ?? "off";
    const hasOverride = area?.override != null;
    const badgeClass = hasOverride ? "override" : state;
    const badgeLabel = hasOverride ? `${state} - override` : state;

    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: {
          title: this._getDisplayName(),
          backPath: "/",
          actions: html`
            <span
              class="mode-badge ${badgeClass}"
              @click=${hasOverride ? () => this.api.clearOverride(this.areaId) : undefined}
              title=${hasOverride ? "Click to clear override" : ""}
            >${badgeLabel}${hasOverride ? " ✕" : ""}</span>
            <ha-icon-button
              .label=${"Statistics"}
              @click=${() => this._navigate(`/area/${this.areaId}/stats`)}
            >
              <ha-icon icon="mdi:chart-line"></ha-icon>
            </ha-icon-button>
            <ha-icon-button
              .label=${"Area Settings"}
              @click=${() => this._navigate(`/area/${this.areaId}/settings`)}
            >
              <ha-icon icon="mdi:cog"></ha-icon>
            </ha-icon-button>
          `,
        },
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

  private _adjustTemp(delta: number): void {
    const area = this._area;
    if (!area) return;
    const current = this._optimisticTarget ?? area.target_temp ?? area.home_temp;
    const clamped = Math.max(area.min_temp, Math.min(area.max_temp,
      Math.round((current + delta) * 2) / 2));
    this._optimisticTarget = clamped;
    this._setpointDebounce.call(clamped);
  }

  private async _setAreaState(state: "home" | "away"): Promise<void> {
    await this.api.setAreaState(this.areaId, state);
  }

  private async _toggleEnabled(): Promise<void> {
    const area = this._area;
    if (!area) return;
    await this.api.setAreaEnabled(this.areaId, !area.enabled);
  }

  private _formatTemp(temp: number | null): string {
    return formatTempWithUnit(temp);
  }

  private _isApplying(): boolean {
    const area = this._area;
    const target = this._displayTarget;
    if (!area || target === null) return false;
    // Suppress while TRVs are doing autonomous transition prep - they're
    // intentionally diverged from the area target until the transition fires.
    if (area.preheat) return false;
    return area.devices.some(
      (d: any) => d.target_temp !== null && Math.abs(target - d.target_temp) > 0.05
    );
  }

  private _openMoreInfo(entityId: string): void {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _batteryIcon(level: number): string {
    return batteryIcon(level);
  }

  render() {
    const area = this._area;
    if (!area) {
      return html`<div class="container"><p>Area not found.</p></div>`;
    }

    const todaySchedule = area.today_schedule ?? [];

    return html`
      <div class="container">
        ${area.preheat
          ? html`<div class="preheat-banner">
              <ha-icon icon=${area.preheat.direction === "setback" ? "mdi:snowflake" : "mdi:fire"}></ha-icon>
              ${area.preheat.direction === "setback" ? "Pre-cooling" : "Preheating"}:
              preparing for ${this._formatTemp(area.preheat.upcoming_temp ?? null)}°C
              ${area.preheat.transition_at
                ? `at ${new Date(area.preheat.transition_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : ""}
            </div>`
          : nothing}
        ${/* UNTESTED: Window open banner */ ""}
        ${area.window_open === true
          ? html`<div class="window-open-banner">
              <ha-icon icon="mdi:window-open-variant"></ha-icon>
              Window open: heating paused
            </div>`
          : nothing}
        <!-- Temperature display -->
        <ha-card>
          <div class="temp-section">
            <div class="target-display">
              <ha-icon-button
                .label=${"Decrease temperature"}
                @click=${() => this._adjustTemp(-0.5)}
                .disabled=${!area.enabled}
              >
                <ha-icon icon="mdi:minus"></ha-icon>
              </ha-icon-button>
              <div class="temp-display">
                ${this._formatTemp(this._displayTarget)}<span class="temp-unit">°C</span>
              </div>
              <ha-icon-button
                .label=${"Increase temperature"}
                @click=${() => this._adjustTemp(0.5)}
                .disabled=${!area.enabled}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </ha-icon-button>
            </div>
            <div class="secondary-text">
              Current: ${this._formatTemp(area.current_temp)}°C
            </div>
            ${this._isApplying()
              ? html`<div class="applying-text">
                  <ha-icon icon="mdi:sync" class="applying-icon"></ha-icon>
                  Applying to devices...
                </div>`
              : nothing}
            ${area.next_transition
              ? html`
                  <div class="secondary-text">
                    Next: ${area.next_transition.temp.toFixed(0)}°C at
                    ${new Date(area.next_transition.time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                `
              : nothing}
          </div>
        </ha-card>

        <!-- State controls -->
        <div class="state-controls">
          ${area.effective_state === "away" && area.enabled
            ? html`
                <ha-button @click=${() => this._setAreaState("home")}>
                  <ha-icon icon="mdi:home" slot="icon"></ha-icon>
                  Home
                </ha-button>
              `
            : nothing}
          ${area.effective_state === "home" && area.enabled
            ? html`
                <ha-button @click=${() => this._setAreaState("away")}>
                  <ha-icon icon="mdi:exit-run" slot="icon"></ha-icon>
                  Away
                </ha-button>
              `
            : nothing}
          <ha-button
            @click=${() => this._toggleEnabled()}
          >
            ${area.enabled ? "Turn Off" : "Turn On"}
          </ha-button>
        </div>

        <!-- Today's schedule (materialized) -->
        ${todaySchedule.length > 0
          ? html`
              <div class="section">
                <h3
                  class="clickable-heading"
                  @click=${() => this._navigate(`/schedule/${area.schedule_id}`)}
                >
                  Today's Schedule
                  <ha-icon icon="mdi:pencil" class="edit-icon"></ha-icon>
                </h3>
                <schedule-bar
                  .entries=${todaySchedule}
                  .homeTemp=${area.home_temp}
                  .awayTemp=${area.away_temp}
                ></schedule-bar>
              </div>
            `
          : nothing}

        <!-- Climate devices -->
        ${area.devices.length > 0
          ? html`
              <div class="section">
                <h3>Climate Devices</h3>
                ${area.devices.map(
                  (device: any) => html`
                    <device-status .device=${device} .areaTargetTemp=${area.target_temp} .suppressPending=${!!area.preheat} .lowBatteryThreshold=${this.hearthState.global.low_battery_threshold}></device-status>
                  `
                )}
              </div>
            `
          : nothing}

        <!-- Temperature sensors -->
        ${(area as any).temperature_sensor_details?.length > 0
          ? html`
              <div class="section">
                <h3>Temperature Sensors</h3>
                ${(area as any).temperature_sensor_details.map((sd: any) => html`
                  <div class="sensor-row" @click=${() => this._openMoreInfo(sd.entity_id)}>
                    <div class="sensor-name">${sd.friendly_name}</div>
                    <div class="sensor-info">
                      ${sd.battery != null ? html`
                        <span class="sensor-battery ${sd.battery <= this.hearthState.global.low_battery_threshold ? "low" : ""}">
                          <ha-icon icon=${this._batteryIcon(sd.battery)} style="--mdc-icon-size: 14px;"></ha-icon>
                          ${sd.battery}%
                        </span>
                      ` : nothing}
                      <span class="sensor-temp">${sd.current_temp != null ? `${sd.current_temp.toFixed(1)}°C` : "—"}</span>
                      <ha-icon icon="mdi:chevron-right" class="chevron"></ha-icon>
                    </div>
                  </div>
                `)}
              </div>
            `
          : nothing}
      </div>

    `;
  }

  static styles = [
    tokens,
    viewStyles,
    tempDisplayStyles,
    secondaryTextStyles,
    sectionStyles,
    modeBadgeStyles,
    css`
      .temp-section {
        text-align: center;
        padding: var(--ha-space-6, 24px) var(--ha-space-4, 16px);
      }
      .target-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-4, 16px);
      }
      ha-card {
        margin-bottom: var(--ha-space-4, 16px);
      }
      .state-controls {
        display: flex;
        gap: var(--ha-space-2, 8px);
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .override-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--hearth-color-manual, #ff5722);
        margin-top: var(--ha-space-2, 8px);
      }
      .clickable-heading {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
      }
      .clickable-heading:hover {
        color: var(--primary-color, #03a9f4);
      }
      .edit-icon {
        --mdc-icon-size: 14px;
      }
      .applying-text {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--warning-color, #ff9800);
        margin-top: var(--ha-space-1, 4px);
      }
      .applying-icon {
        --mdc-icon-size: 14px;
        animation: spin 1.5s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .preheat-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px);
        margin-bottom: var(--ha-space-4, 16px);
        background: var(--info-color, #03a9f4);
        color: white;
        border-radius: var(--ha-border-radius-md, 8px);
        font-size: var(--ha-font-size-m, 14px);
        --mdc-icon-size: 20px;
      }
      .window-open-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px);
        margin-bottom: var(--ha-space-4, 16px);
        background: var(--warning-color, #ff9800);
        color: white;
        border-radius: var(--ha-border-radius-md, 8px);
        font-size: var(--ha-font-size-m, 14px);
        --mdc-icon-size: 20px;
      }
      .sensor-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ha-space-2, 8px) 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        cursor: pointer;
      }
      .sensor-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
        margin: 0 calc(-1 * var(--ha-space-2, 8px));
        padding: var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-md, 8px);
        border-bottom-color: transparent;
      }
      .sensor-row:last-child {
        border-bottom: none;
      }
      .sensor-name {
        font-size: var(--ha-font-size-m, 14px);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sensor-info {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--hearth-text-between-s-m, 13px);
      }
      .sensor-temp {
        color: var(--primary-text-color);
      }
      .sensor-battery {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-xs-s, 11px);
        margin-right: var(--ha-space-3, 12px);
      }
      .sensor-battery.low {
        color: var(--error-color, #db4437);
      }
      .chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        margin-left: var(--ha-space-1, 4px);
      }
    `,
  ];
}
