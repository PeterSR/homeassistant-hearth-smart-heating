import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaState, AreaGroupConfig, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import {
  tokens,
  viewStyles,
  gridStyles,
  emptyStateStyles,
  modeBadgeStyles,
  dialogStyles,
} from "../styles";
import { getGlobalState, getLowBatteryDevices } from "../utils";
import "../components/area-card";

@customElement("overview-view")
export class OverviewView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property({ type: Boolean }) narrow = false;

  @state() private _showVacationPicker = false;
  @state() private _menuOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    this._updateToolbar();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("hearthState")) {
      this._updateToolbar();
    }
  }

  private _updateToolbar(): void {
    const globalState = this.hearthState ? getGlobalState(this.hearthState) : null;

    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: {
          title: "Hearth",
          actions: html`
            ${globalState
              ? html`<span class="mode-badge ${globalState}">${globalState}</span>`
              : nothing}
            <ha-icon-button
              .label=${"Menu"}
              @click=${() => (this._menuOpen = !this._menuOpen)}
            >
              <ha-icon icon="mdi:dots-vertical"></ha-icon>
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

  private async _handleHomeAll(): Promise<void> {
    this._menuOpen = false;
    await this.api.setVacation(false);
    for (const areaId of Object.keys(this.hearthState.areas)) {
      await this.api.setAreaState(areaId, "home");
    }
  }

  private async _handleAwayAll(): Promise<void> {
    this._menuOpen = false;
    for (const areaId of Object.keys(this.hearthState.areas)) {
      await this.api.setAreaState(areaId, "away");
    }
  }

  private async _handleVacationToggle(): Promise<void> {
    this._menuOpen = false;
    const isOn = this.hearthState.global.vacation_mode;
    if (isOn) {
      await this.api.setVacation(false);
      return;
    }

    const defaultId = this.hearthState.global.vacation_schedule_id;
    if (defaultId && this.hearthState.schedules[defaultId]) {
      await this.api.setVacation(true);
    } else {
      this._showVacationPicker = true;
    }
  }

  private async _activateVacationWithSchedule(scheduleId: string): Promise<void> {
    this._showVacationPicker = false;
    await this.api.setVacation(true, scheduleId);
  }

  private _handleAddArea(): void {
    if (Object.keys(this.hearthState.schedules).length === 0) {
      this._navigate("/schedules");
      return;
    }
    this.dispatchEvent(
      new CustomEvent("add-area", { bubbles: true, composed: true })
    );
  }

  private _getVacationScheduleName(): string {
    const id = this.hearthState.global.vacation_schedule_id;
    if (!id) return "";
    const sched = this.hearthState.schedules[id];
    return sched?.name ?? id;
  }

  /** Derive the state for a group of areas. Returns null if areas disagree. */
  private _getGroupState(areaIds: string[]): string | null {
    const areas = areaIds
      .map((id) => this.hearthState.areas[id])
      .filter((a) => a && a.enabled);
    if (areas.length === 0) return null;
    const first = areas[0].effective_state;
    return areas.every((a) => a.effective_state === first) ? first : null;
  }

  private _renderAreaCard(area: AreaState, hideStateBadge: boolean) {
    return html`
      <area-card
        .hass=${this.hass}
        .area=${area}
        .hideStateBadge=${hideStateBadge}
        @click=${() => this._navigate(`/area/${area.area_id}`)}
      ></area-card>
    `;
  }

  render() {
    const allAreas = Object.values(this.hearthState.areas);
    const vacationOn = this.hearthState.global.vacation_mode;
    const globalState = getGlobalState(this.hearthState);
    const lowBattery = getLowBatteryDevices(
      this.hearthState,
      this.hearthState.global.low_battery_threshold
    );

    // Group areas
    const groups = Object.values(this.hearthState.groups ?? {}).sort((a, b) => a.order - b.order);
    const groupedAreaIds = new Set<string>();
    for (const g of groups) {
      for (const aid of g.area_ids) groupedAreaIds.add(aid);
    }
    const ungroupedAreas = allAreas.filter((a) => !groupedAreaIds.has(a.area_id));
    const hasGroups = groups.length > 0;

    return html`
      <div class="container">
        ${lowBattery.length > 0
          ? html`<ha-alert class="battery-banner" alert-type="warning">
              Low battery: ${lowBattery.map((d) => `${d.area_name} (${d.battery}%)`).join(", ")}
            </ha-alert>`
          : nothing}
        ${vacationOn
          ? html`<ha-alert class="vacation-banner" alert-type="warning" dismissable
              @alert-dismissed-clicked=${this._handleVacationToggle}>
              Vacation mode: following "${this._getVacationScheduleName()}"
            </ha-alert>`
          : nothing}
        ${this.hearthState.global.auto_away_active
          ? html`<ha-alert class="auto-away-banner" alert-type="info">
              Auto-away is active: presence not detected
            </ha-alert>`
          : nothing}
        ${allAreas.length === 0
          ? html`
              <div class="empty-state">
                ${Object.keys(this.hearthState.schedules).length === 0
                  ? html`
                      <h2>No areas configured</h2>
                      <p>Before adding your first area, you need to create a schedule. Areas follow schedules to know when to heat.</p>
                      <ha-button @click=${() => this._navigate("/schedules")}>
                        <ha-icon icon="mdi:calendar-clock" slot="icon"></ha-icon>
                        Create a Schedule
                      </ha-button>
                    `
                  : html`
                      <h2>No areas configured</h2>
                      <p>Add your first area to get started.</p>
                      <ha-button @click=${this._handleAddArea}>
                        <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                        Add Area
                      </ha-button>
                    `}
              </div>
            `
          : (() => {
              const ungroupedIds = ungroupedAreas.map((a) => a.area_id);
              const ungroupedState = hasGroups ? this._getGroupState(ungroupedIds) : null;
              const ungroupedAtTop = this.hearthState.global.ungrouped_position !== "bottom";

              const ungroupedBlock = ungroupedAreas.length > 0
                ? html`
                    <div class="group-section">
                      ${hasGroups
                        ? html`
                            <div class="group-header ungrouped">
                              <span class="group-name">Ungrouped</span>
                              ${ungroupedState && !globalState
                                ? html`<span class="mode-badge ${ungroupedState}">${ungroupedState}</span>`
                                : nothing}
                            </div>
                          `
                        : nothing}
                      <div class="card-grid">
                        ${ungroupedAreas.map((a) => this._renderAreaCard(a,
                          globalState !== null || (hasGroups && ungroupedState !== null)
                        ))}
                      </div>
                    </div>
                  `
                : nothing;

              const groupedBlocks = groups.map((group) => {
                const groupAreas = group.area_ids
                  .map((aid) => this.hearthState.areas[aid])
                  .filter(Boolean);
                if (groupAreas.length === 0) return nothing;
                const groupState = globalState === null
                  ? this._getGroupState(group.area_ids)
                  : null;
                const schedName = group.schedule_id
                  ? this.hearthState.schedules[group.schedule_id]?.name
                  : null;
                return html`
                  <div class="group-section">
                    <div
                      class="group-header"
                      @click=${() => this._navigate(`/group/${group.group_id}/settings`)}
                    >
                      <span class="group-name">${group.name}</span>
                      ${groupState && !globalState
                        ? html`<span class="mode-badge ${groupState}">${groupState}</span>`
                        : nothing}
                      ${schedName
                        ? html`<span class="group-schedule">${schedName}</span>`
                        : nothing}
                      <ha-icon icon="mdi:chevron-right" class="group-chevron"></ha-icon>
                    </div>
                    <div class="card-grid">
                      ${groupAreas.map((a) => this._renderAreaCard(a,
                        globalState !== null || groupState !== null
                      ))}
                    </div>
                  </div>
                `;
              });

              return ungroupedAtTop
                ? html`${ungroupedBlock}${groupedBlocks}`
                : html`${groupedBlocks}${ungroupedBlock}`;
            })()}
      </div>

      ${this._showVacationPicker
        ? html`
            <div class="dialog-overlay" @click=${() => (this._showVacationPicker = false)}>
              <ha-card class="dialog-card" @click=${(e: Event) => e.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Vacation Schedule</h2>
                  <ha-icon-button .label=${"Close"} @click=${() => (this._showVacationPicker = false)}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <p>Choose which schedule to follow during vacation:</p>
                  <div class="vacation-schedule-list">
                    ${Object.values(this.hearthState.schedules).map(
                      (s) => html`
                        <ha-button
                          class="vacation-schedule-btn"
                          @click=${() => this._activateVacationWithSchedule(s.schedule_id)}
                        >
                          <ha-icon icon="mdi:calendar-clock" slot="icon"></ha-icon>
                          ${s.name}
                        </ha-button>
                      `
                    )}
                  </div>
                </div>
              </ha-card>
            </div>
          `
        : nothing}

      ${this._menuOpen
        ? html`
            <div class="menu-backdrop" @click=${() => (this._menuOpen = false)}></div>
            <div class="toolbar-menu">
              <button class="menu-item" @click=${this._handleHomeAll}>
                <ha-icon icon="mdi:home"></ha-icon> Home All
              </button>
              <button class="menu-item" @click=${this._handleAwayAll}>
                <ha-icon icon="mdi:exit-run"></ha-icon> Away All
              </button>
              <button class="menu-item" @click=${this._handleVacationToggle}>
                <ha-icon icon="mdi:beach"></ha-icon>
                ${vacationOn ? "Vacation Off" : "Vacation On"}
              </button>
              <div class="menu-divider"></div>
              <button class="menu-item" @click=${() => { this._menuOpen = false; this._navigate("/schedules"); }}>
                <ha-icon icon="mdi:calendar-clock"></ha-icon> Schedules
              </button>
              <button class="menu-item" @click=${() => { this._menuOpen = false; this._navigate("/settings"); }}>
                <ha-icon icon="mdi:cog"></ha-icon> Settings
              </button>
            </div>
          `
        : nothing}

      ${allAreas.length > 0
        ? html`
            <button class="fab" @click=${this._handleAddArea}>
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          `
        : nothing}
    `;
  }

  static styles = [
    tokens,
    viewStyles,
    gridStyles,
    emptyStateStyles,
    modeBadgeStyles,
    dialogStyles,
    css`
      area-card {
        cursor: pointer;
      }
      .fab {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--primary-color, #03a9f4);
        color: white;
        border: none;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 5;
        --mdc-icon-size: 24px;
      }
      .fab:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
      }
      .fab:active {
        transform: scale(0.95);
      }
      .battery-banner,
      .vacation-banner,
      .auto-away-banner {
        display: block;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .vacation-schedule-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2, 8px);
      }
      .vacation-schedule-btn {
        width: 100%;
      }
      /* Three-dot menu */
      .menu-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 9;
      }
      .toolbar-menu {
        position: fixed;
        top: var(--header-height, 56px);
        right: var(--ha-space-4, 16px);
        z-index: 10;
        background: var(--card-background-color, white);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        box-shadow: var(--ha-box-shadow-m, 0 2px 8px rgba(0,0,0,0.15));
        padding: var(--ha-space-1, 4px) 0;
        min-width: 160px;
      }
      .menu-item {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        width: 100%;
        padding: var(--ha-space-2, 8px) var(--ha-space-4, 16px);
        background: none;
        border: none;
        text-align: left;
        font-size: var(--ha-font-size-m, 14px);
        font-family: inherit;
        color: var(--primary-text-color);
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .menu-item:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .menu-divider {
        height: 1px;
        background: var(--divider-color, #e0e0e0);
        margin: var(--ha-space-1, 4px) 0;
      }
      /* Group sections */
      .group-section {
        margin-top: var(--ha-space-4, 16px);
      }
      .group-heading {
        margin: 0 0 var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .group-header {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        margin-bottom: var(--ha-space-2, 8px);
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        cursor: pointer;
        border-radius: var(--ha-border-radius-md, 8px);
      }
      .group-header:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .group-name {
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--primary-text-color);
        flex: 1;
      }
      .group-schedule {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
        padding: 2px var(--ha-space-2, 8px);
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: var(--ha-border-radius-pill, 9999px);
      }
      .group-chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
      }
    `,
  ];
}
