import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  HomeAssistant,
  HearthState,
  ScheduleConfig,
  ScheduleEntry,
  ToolbarConfig,
} from "../types";
import { HearthApi } from "../api";
import { tokens, viewStyles, sectionStyles, dialogStyles } from "../styles";
import { SCHEDULE_TEMPLATES, type ScheduleTemplate } from "../schedule-templates";
import { OptimisticState } from "../utils";
import "../components/schedule-clock";

const DAYS = [
  { key: "monday", short: "Mon" },
  { key: "tuesday", short: "Tue" },
  { key: "wednesday", short: "Wed" },
  { key: "thursday", short: "Thu" },
  { key: "friday", short: "Fri" },
  { key: "saturday", short: "Sat" },
  { key: "sunday", short: "Sun" },
];

@customElement("schedule-editor-view")
export class ScheduleEditorView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property() groupId = "";
  @property({ type: Boolean }) narrow = false;

  @state() private _selectedDay = "monday";
  @state() private _saving = false;
  @state() private _copyMenuOpen = false;
  @state() private _showTemplateDialog = false;
  @state() private _confirmDelete = false;
  private _scheduleState = new OptimisticState<Record<string, ScheduleEntry[]>>();

  private get _group(): ScheduleConfig | undefined {
    return this.hearthState.schedules[this.groupId];
  }

  /** Use optimistic state if saves are in-flight, otherwise use subscription state. */
  private _getSchedule(): Record<string, ScheduleEntry[]> {
    return this._scheduleState.get(this._group?.schedule ?? {});
  }

  connectedCallback(): void {
    super.connectedCallback();
    // Default to current day of week
    const today = DAYS[((new Date().getDay() + 6) % 7)].key; // JS Sunday=0, we want Monday=0
    this._selectedDay = today;
    this._updateToolbar();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("groupId") || changed.has("hearthState")) {
      this._updateToolbar();
    }
  }

  private _updateToolbar(): void {
    const group = this._group;
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: {
          title: `Schedules / ${group?.name ?? "Schedule"}`,
          backPath: "/schedules",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _getDayEntries(): ScheduleEntry[] {
    return this._getSchedule()[this._selectedDay] || [];
  }

  private async _saveSchedule(schedule: Record<string, ScheduleEntry[]>): Promise<void> {
    this._scheduleState.set(schedule);
    this._saving = true;
    this.requestUpdate();
    try {
      await this.api.updateSchedule(this.groupId, { schedule });
    } catch (err) {
      console.error("Failed to save schedule:", err);
    }
    this._scheduleState.resolve();
    this._saving = false;
  }

  private _getAreasUsingGroup(): Array<{ area_id: string; name: string }> {
    return Object.values(this.hearthState.areas)
      .filter((a) => a.schedule_id === this.groupId)
      .map((a) => ({ area_id: a.area_id, name: a.name }));
  }

  private async _onEntriesChanged(
    e: CustomEvent<{ entries: ScheduleEntry[] }>
  ): Promise<void> {
    const entries = e.detail.entries;
    if (!this._group) return;

    const schedule = { ...this._getSchedule(), [this._selectedDay]: entries };
    await this._saveSchedule(schedule);
  }

  private async _copyToDay(targetDay: string): Promise<void> {
    if (!this._group) return;
    const entries = this._getDayEntries();
    const schedule = { ...this._getSchedule(), [targetDay]: entries.map((e) => ({ ...e })) };
    this._copyMenuOpen = false;
    await this._saveSchedule(schedule);
  }

  private async _copyToWeekdays(): Promise<void> {
    if (!this._group) return;
    const entries = this._getDayEntries();
    const schedule = { ...this._getSchedule() };
    for (const day of ["monday", "tuesday", "wednesday", "thursday", "friday"]) {
      schedule[day] = entries.map((e) => ({ ...e }));
    }
    this._copyMenuOpen = false;
    await this._saveSchedule(schedule);
  }

  private async _copyToWeekend(): Promise<void> {
    if (!this._group) return;
    const entries = this._getDayEntries();
    const schedule = { ...this._getSchedule() };
    for (const day of ["saturday", "sunday"]) {
      schedule[day] = entries.map((e) => ({ ...e }));
    }
    this._copyMenuOpen = false;
    await this._saveSchedule(schedule);
  }

  private async _copyToAll(): Promise<void> {
    if (!this._group) return;
    const entries = this._getDayEntries();
    const schedule = { ...this._getSchedule() };
    for (const d of DAYS) {
      schedule[d.key] = entries.map((e) => ({ ...e }));
    }
    this._copyMenuOpen = false;
    await this._saveSchedule(schedule);
  }

  private _navigate(path: string): void {
    this.dispatchEvent(
      new CustomEvent("navigate", { detail: { path }, bubbles: true })
    );
  }

  render() {
    const group = this._group;
    if (!group) {
      return html`<div class="container"><p>Schedule not found.</p></div>`;
    }

    const entries = this._getDayEntries();
    const areas = this._getAreasUsingGroup();

    return html`
      <div class="container">
        <!-- Day selector -->
        <div class="day-selector">
          ${DAYS.map(
            (d) => html`
              <button
                class="day-btn ${this._selectedDay === d.key ? "active" : ""}"
                @click=${() => (this._selectedDay = d.key)}
              >
                ${d.short}
              </button>
            `
          )}
        </div>

        <!-- Clock -->
        <schedule-clock
          .entries=${entries}
          @entries-changed=${this._onEntriesChanged}
        ></schedule-clock>

        <!-- Legend -->
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot home"></span> Home
          </span>
          <span class="legend-item">
            <span class="legend-dot away"></span> Away / Sleep
          </span>
        </div>

        <!-- Actions -->
        <div class="actions">
          <ha-button appearance="plain" @click=${() => (this._showTemplateDialog = true)}>
            <ha-icon icon="mdi:file-document-outline" slot="icon"></ha-icon>
            Apply Template
          </ha-button>
          <div class="copy-wrapper">
            <ha-button appearance="plain" @click=${() => (this._copyMenuOpen = !this._copyMenuOpen)}>
              <ha-icon icon="mdi:content-copy" slot="icon"></ha-icon>
              Copy to...
            </ha-button>
            ${this._copyMenuOpen
              ? html`
                  <div class="copy-menu-backdrop" @click=${() => (this._copyMenuOpen = false)}></div>
                  <div class="copy-menu">
                    ${DAYS.filter((d) => d.key !== this._selectedDay).map(
                      (d) => html`
                        <button class="copy-option" @click=${() => this._copyToDay(d.key)}>
                          ${d.short}
                        </button>
                      `
                    )}
                    <button class="copy-option" @click=${this._copyToWeekdays}>
                      All weekdays
                    </button>
                    <button class="copy-option" @click=${this._copyToWeekend}>
                      Weekend
                    </button>
                    <button class="copy-option" @click=${this._copyToAll}>
                      All days
                    </button>
                  </div>
                `
              : nothing}
          </div>
        </div>

        <!-- Transition list -->
        ${entries.length > 0
          ? html`
              <div class="section">
                <h3>Transitions</h3>
                <div class="transition-list">
                  ${entries
                    .slice()
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(
                      (entry, _sortedIdx) => {
                        const origIdx = entries.indexOf(entry);
                        return html`
                          <div class="transition-row">
                            <span class="transition-time">${entry.time}</span>
                            <span class="transition-mode ${entry.temp}">
                              ${entry.temp === "home" ? "Home" : "Away"}
                            </span>
                            ${entries.length > 1
                              ? html`
                                  <ha-icon-button
                                    .label=${"Remove"}
                                    @click=${() => this._removeTransition(origIdx)}
                                  >
                                    <ha-icon icon="mdi:close"></ha-icon>
                                  </ha-icon-button>
                                `
                              : nothing}
                          </div>
                        `;
                      }
                    )}
                </div>
              </div>
            `
          : nothing}

        <!-- Areas using this schedule -->
        ${areas.length > 0
          ? html`
              <div class="section">
                <h3>Areas</h3>
                <div class="area-list">
                  ${areas.map(
                    (a) => html`
                      <div
                        class="area-row"
                        @click=${() => this._navigate(`/area/${a.area_id}`)}
                      >
                        <span>${a.name}</span>
                        <ha-icon icon="mdi:chevron-right"></ha-icon>
                      </div>
                    `
                  )}
                </div>
              </div>
            `
          : nothing}

        <!-- Delete -->
        ${this._deleteError
          ? html`<ha-alert alert-type="error" style="display:block;margin-bottom:var(--ha-space-2,8px)">${this._deleteError}</ha-alert>`
          : nothing}
        <div class="delete-row">
          ${this._confirmDelete
            ? html`
                <ha-button @click=${this._deleteSchedule}>
                  Confirm delete?
                </ha-button>
                <ha-button appearance="plain" @click=${() => { this._confirmDelete = false; this._deleteError = ""; }}>
                  Cancel
                </ha-button>
              `
            : html`
                <ha-button appearance="plain" @click=${() => (this._confirmDelete = true)}>
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  Delete schedule
                </ha-button>
              `}
        </div>
      </div>

      ${this._showTemplateDialog
        ? html`
            <div class="dialog-overlay" @click=${() => (this._showTemplateDialog = false)}>
              <ha-card class="dialog-card" @click=${(e: Event) => e.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Apply Template</h2>
                  <ha-icon-button .label=${"Close"} @click=${() => (this._showTemplateDialog = false)}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <p class="warning-text">This will replace the entire weekly schedule.</p>
                  <div class="template-list">
                    ${SCHEDULE_TEMPLATES.map(
                      (t) => html`
                        <button class="template-row" @click=${() => this._applyTemplate(t)}>
                          <ha-icon icon=${t.icon}></ha-icon>
                          <div class="template-info">
                            <span class="template-name">${t.name}</span>
                            <span class="template-desc">${t.description}</span>
                          </div>
                        </button>
                      `
                    )}
                  </div>
                </div>
              </ha-card>
            </div>
          `
        : nothing}
    `;
  }

  private async _applyTemplate(template: ScheduleTemplate): Promise<void> {
    this._showTemplateDialog = false;
    try {
      await this.api.updateSchedule(this.groupId, { schedule: template.schedule });
    } catch (err) {
      console.error("Failed to apply template:", err);
    }
  }

  @state() private _deleteError = "";

  private async _deleteSchedule(): Promise<void> {
    this._deleteError = "";
    try {
      await this.api.removeSchedule(this.groupId);
      this._navigate("/schedules");
    } catch (err: any) {
      const msg = err?.message || "Failed to delete schedule";
      this._deleteError = msg;
      console.error("Failed to delete schedule:", err);
    }
  }

  private _removeTransition(index: number): void {
    const clock = this.renderRoot.querySelector("schedule-clock") as any;
    clock?.removeTransition(index);
  }

  static styles = [
    tokens,
    viewStyles,
    sectionStyles,
    dialogStyles,
    css`
      .day-selector {
        display: flex;
        justify-content: center;
        gap: var(--ha-space-1, 4px);
        margin-bottom: var(--ha-space-4, 16px);
      }
      .day-btn {
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-pill, 9999px);
        background: var(--card-background-color, white);
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-s, 12px);
        font-family: inherit;
        cursor: pointer;
      }
      .day-btn.active {
        background: var(--primary-color, #03a9f4);
        color: white;
        border-color: var(--primary-color, #03a9f4);
      }
      .legend {
        display: flex;
        justify-content: center;
        gap: var(--ha-space-4, 16px);
        margin: var(--ha-space-3, 12px) 0;
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
      }
      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .legend-dot.home {
        background: var(--hearth-color-home, #039be5);
      }
      .legend-dot.away {
        background: var(--hearth-color-away, #9e9e9e);
      }
      .actions {
        display: flex;
        justify-content: center;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .copy-wrapper {
        position: relative;
      }
      .copy-menu-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 9;
      }
      .copy-menu {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 10;
        background: var(--card-background-color, white);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        box-shadow: var(--ha-box-shadow-m, 0 2px 8px rgba(0,0,0,0.15));
        padding: var(--ha-space-1, 4px) 0;
        min-width: 140px;
      }
      .copy-option {
        display: block;
        width: 100%;
        padding: var(--ha-space-2, 8px) var(--ha-space-4, 16px);
        background: none;
        border: none;
        text-align: left;
        font-size: var(--ha-font-size-m, 14px);
        font-family: inherit;
        color: var(--primary-text-color);
        cursor: pointer;
      }
      .copy-option:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .transition-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .transition-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        background: var(--card-background-color, white);
        border-radius: var(--ha-border-radius-md, 8px);
        min-height: 48px;
      }
      .transition-time {
        font-weight: var(--ha-font-weight-medium, 500);
        min-width: 50px;
      }
      .transition-mode {
        font-size: var(--ha-font-size-s, 12px);
        padding: 2px var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-pill, 9999px);
        color: white;
        flex: 1;
        text-align: center;
        max-width: 60px;
      }
      .transition-mode.home {
        background: var(--hearth-color-home, #039be5);
      }
      .transition-mode.away {
        background: var(--hearth-color-away, #9e9e9e);
      }
      .area-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .area-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ha-space-3, 12px);
        background: var(--card-background-color, white);
        border-radius: var(--ha-border-radius-md, 8px);
        cursor: pointer;
      }
      .area-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .actions {
        gap: var(--ha-space-2, 8px);
      }
      .delete-row {
        display: flex;
        justify-content: center;
        gap: var(--ha-space-2, 8px);
        margin-top: var(--ha-space-6, 24px);
        padding-top: var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .template-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .template-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        padding: var(--ha-space-3, 12px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        background: var(--card-background-color, white);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        width: 100%;
        color: var(--primary-text-color);
      }
      .template-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .template-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .template-name {
        font-weight: var(--ha-font-weight-medium, 500);
        font-size: var(--ha-font-size-m, 14px);
      }
      .template-desc {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .warning-text {
        color: var(--warning-color, #ff9800);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-3, 12px);
      }
    `,
  ];
}
