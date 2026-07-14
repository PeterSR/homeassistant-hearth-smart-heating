import { LitElement, html, css, nothing } from "lit";
import { property } from "lit/decorators.js";
import type { HomeAssistant, AreaState } from "../types";
import { tokens, modeBadgeStyles } from "../styles";
import { formatTemp, getAreaDisplayName, formatNextTransition } from "../utils";

export class AreaCard extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) area!: AreaState;
  @property({ type: Boolean }) hideStateBadge = false;

  render() {
    const name = getAreaDisplayName(this.area);
    const currentTemp = formatTemp(this.area.current_temp);
    const targetTemp = formatTemp(this.area.target_temp);
    const nextTrans = formatNextTransition(this.area);
    const state = this.area.effective_state;

    return html`
      <ha-card>
        <div class="card-content">
          <div class="row top-row">
            <span class="area-name">${name}</span>
            ${this.hideStateBadge
              ? nothing
              : html`<span class="mode-badge ${state}">
                  ${state}${!this.area.following_schedule && state !== "off" ? " *" : ""}
                </span>`}
          </div>
          <div class="row temp-row">
            <span class="current-temp">${currentTemp}</span>
            <span class="arrow">→</span>
            <span class="target-temp">${targetTemp}</span>
          </div>
          <div class="row bottom-row">
            <span class="device-count">
              ${this.area.device_count} TRV${this.area.device_count !== 1 ? "s" : ""}
            </span>
            ${nextTrans
              ? html`<span class="next-transition">Next: ${nextTrans}</span>`
              : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    tokens,
    modeBadgeStyles,
    css`
      :host {
        padding: 0;
      }
      ha-card {
        cursor: pointer;
        transition: box-shadow 0.2s;
      }
      ha-card:hover {
        box-shadow: var(--ha-box-shadow-m, 0 4px 8px 0 rgba(0, 0, 0, 0.08));
      }
      .card-content {
        padding: var(--ha-space-4, 16px);
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .top-row {
        margin-bottom: var(--ha-space-2, 8px);
      }
      .area-name {
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .temp-row {
        margin-bottom: var(--ha-space-2, 8px);
        gap: var(--ha-space-2, 8px);
        justify-content: flex-start;
      }
      .current-temp {
        font-size: var(--ha-font-size-3xl, 28px);
        font-weight: var(--ha-font-weight-light, 300);
      }
      .arrow {
        font-size: var(--ha-font-size-xl, 20px);
        color: var(--secondary-text-color);
      }
      .target-temp {
        font-size: var(--ha-font-size-3xl, 28px);
        font-weight: var(--ha-font-weight-normal, 400);
        color: var(--primary-color);
      }
      .bottom-row {
        font-size: var(--hearth-text-between-s-m, 13px);
        color: var(--secondary-text-color);
      }
      .next-transition {
        font-size: var(--hearth-text-between-xs-s, 11px);
      }
    `,
  ];
}

if (!customElements.get("area-card")) {
  customElements.define("area-card", AreaCard);
}
