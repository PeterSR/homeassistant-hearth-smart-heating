import { LitElement, html, css, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { DeviceState } from "../types";
import { tokens } from "../styles";
import { batteryIcon } from "../utils";

@customElement("device-status")
export class DeviceStatusComponent extends LitElement {
  @property({ attribute: false }) device!: DeviceState;
  @property({ type: Number }) areaTargetTemp: number | null = null;
  @property({ type: Number }) lowBatteryThreshold = 10;
  @property({ type: Boolean }) suppressPending = false;

  private _formatTemp(temp: number | null): string {
    if (temp === null) return "--";
    return `${temp.toFixed(1)}°C`;
  }

  private _openMoreInfo(): void {
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId: this.device.entity_id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _isPending(): boolean {
    if (this.suppressPending) return false;
    if (this.areaTargetTemp === null || this.device.target_temp === null) return false;
    return Math.abs(this.areaTargetTemp - this.device.target_temp) > 0.05;
  }

  render() {
    const d = this.device;
    const isLow = d.battery !== null && d.battery <= this.lowBatteryThreshold;
    const pending = this._isPending();

    return html`
      <div class="device-row" @click=${this._openMoreInfo}>
        <div class="device-name">${d.friendly_name || d.entity_id}</div>
        <div class="device-info">
          ${d.diagnostics?.has_error
            ? html`<span class="error-badge" title=${d.diagnostics.error_code ?? "Error"}>
                <ha-icon icon="mdi:alert" style="--mdc-icon-size: 14px;"></ha-icon>
              </span>`
            : nothing}
          ${d.diagnostics?.pi_heating_demand != null
            ? html`<span class="demand">
                <ha-icon icon="mdi:fire" style="--mdc-icon-size: 14px;"></ha-icon>
                ${d.diagnostics.pi_heating_demand}%
              </span>`
            : nothing}
          ${d.battery !== null
            ? html`<span class="battery ${isLow ? "low" : ""}">
                <ha-icon icon=${batteryIcon(d.battery)} style="--mdc-icon-size: 14px;"></ha-icon>
                ${d.battery}%
              </span>`
            : nothing}
          <span class="temp">${this._formatTemp(d.current_temp)}</span>
          <span class="separator">→</span>
          ${pending
            ? html`
                <span class="target stale">${this._formatTemp(d.target_temp)}</span>
                <span class="separator">→</span>
                <span class="target pending">${this._formatTemp(this.areaTargetTemp)}</span>
                <ha-icon icon="mdi:sync" class="sync-icon"></ha-icon>`
            : html`<span class="target">${this._formatTemp(d.target_temp)}</span>`}
          <ha-icon icon="mdi:chevron-right" class="chevron"></ha-icon>
        </div>
      </div>
    `;
  }

  static styles = [
    tokens,
    css`
      .device-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ha-space-2, 8px) 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        cursor: pointer;
      }
      .device-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
        margin: 0 calc(-1 * var(--ha-space-2, 8px));
        padding: var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-md, 8px);
        border-bottom-color: transparent;
      }
      .device-row:last-child {
        border-bottom: none;
      }
      .device-name {
        font-size: var(--ha-font-size-m, 14px);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .device-info {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--hearth-text-between-s-m, 13px);
      }
      .temp {
        color: var(--primary-text-color);
      }
      .separator {
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-xs-s, 11px);
      }
      .target {
        color: var(--primary-color);
      }
      .target.stale {
        color: var(--secondary-text-color);
        text-decoration: line-through;
        font-size: var(--hearth-text-between-xs-s, 11px);
      }
      .target.pending {
        color: var(--warning-color, #ff9800);
      }
      .sync-icon {
        --mdc-icon-size: 14px;
        color: var(--warning-color, #ff9800);
        animation: spin 1.5s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .battery {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-xs-s, 11px);
        margin-right: var(--ha-space-3, 12px);
      }
      .battery.low {
        color: var(--error-color, #db4437);
      }
      .error-badge {
        color: var(--error-color, #db4437);
        display: inline-flex;
        align-items: center;
        margin-right: var(--ha-space-1, 4px);
      }
      .demand {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: var(--hearth-text-between-xs-s, 11px);
        color: var(--secondary-text-color);
        margin-right: var(--ha-space-2, 8px);
      }
      .chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        margin-left: var(--ha-space-1, 4px);
      }
    `,
  ];
}
