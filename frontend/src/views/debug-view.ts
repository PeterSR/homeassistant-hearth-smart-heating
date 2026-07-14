import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import { tokens, viewStyles } from "../styles";

import type { DeviceDiagnostics } from "../types";

interface DeviceDiag {
  entity_id: string;
  area_id: string;
  adapter_type: "danfoss_ally" | "generic";
  zigbee_backend: "zha" | "z2m" | null;
  current_temp: number | null;
  target_temp: number | null;
  battery: number | null;
  state: string;
  friendly_name: string;
  ieee?: string;
  diagnostics?: DeviceDiagnostics;
}

@customElement("debug-view")
export class DebugView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property({ type: Boolean }) narrow = false;

  @state() private _devices: DeviceDiag[] = [];
  @state() private _loading = true;
  @state() private _actionStatus: Record<string, string> = {};

  connectedCallback(): void {
    super.connectedCallback();
    this._updateToolbar();
    this._loadDiagnostics();
  }

  private _updateToolbar(): void {
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: { title: "Debug", backPath: "/settings" },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _loadDiagnostics(): Promise<void> {
    this._loading = true;
    try {
      const result = await this.api.getDiagnostics();
      this._devices = result.devices;
    } catch (e) {
      console.error("Failed to load diagnostics:", e);
    }
    this._loading = false;
  }

  private async _doAction(entityId: string, action: string): Promise<void> {
    this._actionStatus = { ...this._actionStatus, [entityId]: `${action}...` };
    try {
      await this.api.deviceAction(entityId, action);
      this._actionStatus = { ...this._actionStatus, [entityId]: `${action} OK` };
    } catch (e: any) {
      this._actionStatus = {
        ...this._actionStatus,
        [entityId]: `${action} failed: ${e.message ?? e}`,
      };
    }
    // Clear status after 3s
    setTimeout(() => {
      this._actionStatus = { ...this._actionStatus, [entityId]: "" };
    }, 3000);
  }

  render() {
    if (this._loading) {
      return html`<div class="container"><p>Loading diagnostics...</p></div>`;
    }

    if (this._devices.length === 0) {
      return html`<div class="container"><p>No devices configured.</p></div>`;
    }

    return html`
      <div class="container">
        <ha-button appearance="plain" @click=${() => this._loadDiagnostics()}>
          <ha-icon icon="mdi:refresh" slot="icon"></ha-icon>
          Refresh
        </ha-button>

        ${this._renderGroupedDevices()}
      </div>
    `;
  }

  private _renderGroupedDevices() {
    const grouped = new Map<string, DeviceDiag[]>();
    for (const d of this._devices) {
      const areaName = this.hearthState?.areas[d.area_id]?.name ?? d.area_id;
      if (!grouped.has(areaName)) grouped.set(areaName, []);
      grouped.get(areaName)!.push(d);
    }

    return Array.from(grouped.entries()).map(
      ([areaName, devices]) => html`
        <h3 class="area-heading">${areaName}</h3>
        ${devices.map((d) => this._renderDevice(d))}
      `
    );
  }

  private _renderDevice(d: DeviceDiag) {
    const isDanfoss = d.adapter_type === "danfoss_ally";
    const status = this._actionStatus[d.entity_id] || "";

    return html`
      <ha-card>
        <div class="card-content">
          <div class="device-header">
            <span class="device-name">${d.friendly_name}</span>
            <span class="badge-row">
              ${d.zigbee_backend
                ? html`<span class="adapter-badge zigbee">${d.zigbee_backend.toUpperCase()}</span>`
                : nothing}
              <span class="adapter-badge ${d.adapter_type}">
                ${isDanfoss ? "Danfoss" : "Generic"}
              </span>
            </span>
          </div>

          <div class="info-grid">
            <span class="label">Entity</span>
            <span class="value mono">${d.entity_id}</span>

            <span class="label">State</span>
            <span class="value">${d.state}</span>

            <span class="label">Current</span>
            <span class="value">${d.current_temp != null ? `${d.current_temp.toFixed(1)}°C` : "—"}</span>

            <span class="label">Target</span>
            <span class="value">${d.target_temp != null ? `${d.target_temp.toFixed(1)}°C` : "—"}</span>

            ${d.battery != null ? html`
              <span class="label">Battery</span>
              <span class="value">${d.battery}%</span>
            ` : nothing}

            ${isDanfoss ? html`
              <span class="label">IEEE</span>
              <span class="value mono">${d.ieee ?? "unknown"}</span>

              ${d.diagnostics ? html`
                <span class="label">Software error</span>
                <span class="value ${d.diagnostics.has_error ? "error" : ""}">${d.diagnostics.software_error ?? "—"}</span>

                <span class="label">Heating demand</span>
                <span class="value">${d.diagnostics.pi_heating_demand != null ? `${d.diagnostics.pi_heating_demand}%` : "—"}</span>

                <span class="label">Setpoint source</span>
                <span class="value ${d.diagnostics.setpoint_change_source && d.diagnostics.setpoint_change_source !== "External" ? "warn" : ""}">${d.diagnostics.setpoint_change_source ?? "—"}</span>

                <span class="label">Adaptation</span>
                <span class="value">${d.diagnostics.adaptation_run_status ?? "—"}</span>

                <span class="label">Motor steps</span>
                <span class="value">${d.diagnostics.motor_step_counter != null ? d.diagnostics.motor_step_counter.toLocaleString() : "—"}</span>

                <span class="label">Link quality</span>
                <span class="value">${d.diagnostics.linkquality ?? "—"}</span>

                <span class="label">Pre-heat</span>
                <span class="value">${d.diagnostics.preheat_status ?? "—"}</span>
              ` : html`
                <span class="label">Diagnostics</span>
                <span class="value">Waiting for first health check...</span>
              `}
            ` : nothing}
          </div>

          ${isDanfoss ? html`
            <div class="actions">
              <ha-button @click=${() => this._doAction(d.entity_id, "identify")}>
                <ha-icon icon="mdi:flash" slot="icon"></ha-icon>
                Identify
              </ha-button>
              <ha-button @click=${() => this._doAction(d.entity_id, "time_sync")}>
                <ha-icon icon="mdi:clock-sync" slot="icon"></ha-icon>
                Sync time
              </ha-button>
              <ha-button @click=${() => this._doAction(d.entity_id, "close_mounting_mode")}>
                <ha-icon icon="mdi:check" slot="icon"></ha-icon>
                Close mounting mode
              </ha-button>
              <ha-button @click=${() => this._doAction(d.entity_id, "resync")}>
                <ha-icon icon="mdi:sync" slot="icon"></ha-icon>
                Resync
              </ha-button>
            </div>
          ` : nothing}

          ${status ? html`<div class="status">${status}</div>` : nothing}
        </div>
      </ha-card>
    `;
  }

  static styles = [
    tokens,
    viewStyles,
    css`
      .area-heading {
        margin: var(--ha-space-4, 16px) 0 var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .area-heading:first-of-type {
        margin-top: 0;
      }
      ha-card {
        margin-bottom: var(--ha-space-4, 16px);
      }
      .card-content {
        padding: var(--ha-space-4, 16px);
      }
      .device-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--ha-space-3, 12px);
      }
      .device-name {
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .badge-row {
        display: flex;
        gap: var(--ha-space-1, 4px);
      }
      .adapter-badge {
        font-size: var(--ha-font-size-s, 12px);
        padding: 2px var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-pill, 9999px);
        color: white;
      }
      .adapter-badge.danfoss_ally {
        background: var(--primary-color, #03a9f4);
      }
      .adapter-badge.zigbee {
        background: var(--success-color, #4caf50);
      }
      .adapter-badge.generic {
        background: var(--secondary-text-color, #9e9e9e);
      }
      .info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--ha-space-1, 4px) var(--ha-space-3, 12px);
        margin-bottom: var(--ha-space-3, 12px);
        font-size: var(--ha-font-size-m, 14px);
      }
      .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 12px);
      }
      .value {
        color: var(--primary-text-color);
      }
      .value.mono {
        font-family: monospace;
        font-size: var(--ha-font-size-s, 12px);
      }
      .value.warn {
        color: var(--warning-color, #ff9800);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .value.error {
        color: var(--error-color, #db4437);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .actions {
        display: flex;
        gap: var(--ha-space-2, 8px);
        flex-wrap: wrap;
      }
      .status {
        margin-top: var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
    `,
  ];
}
