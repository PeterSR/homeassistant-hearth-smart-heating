import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import { tokens, viewStyles, emptyStateStyles, sectionStyles, dialogStyles, formStyles } from "../styles";
import { SCHEDULE_TEMPLATES, type ScheduleTemplate } from "../schedule-templates";

@customElement("schedules-view")
export class SchedulesView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property({ type: Boolean }) narrow = false;

  @state() private _showCreateDialog = false;
  @state() private _newName = "";
  @state() private _creating = false;
  @state() private _selectedTemplate: ScheduleTemplate | null = null;

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
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: {
          title: "Schedules",
          backPath: "/",
          actions: html`
            <ha-icon-button
              .label=${"Create Schedule"}
              @click=${() => this._openCreateDialog()}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
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

  private _getAreaCount(groupId: string): number {
    return Object.values(this.hearthState.areas).filter(
      (a) => a.schedule_id === groupId
    ).length;
  }

  private _openCreateDialog(): void {
    this._newName = "";
    this._selectedTemplate = null;
    this._showCreateDialog = true;
  }

  private _closeCreateDialog(): void {
    this._showCreateDialog = false;
  }

  private async _createGroup(): Promise<void> {
    const name = this._newName.trim();
    if (!name) return;

    let groupId = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    // Ensure unique ID
    const existing = this.hearthState.schedules;
    if (existing[groupId]) {
      groupId = `${groupId}_${Date.now().toString(36)}`;
    }
    this._creating = true;
    try {
      await this.api.addSchedule({
        schedule_id: groupId,
        name,
        ...(this._selectedTemplate ? { schedule: this._selectedTemplate.schedule } : {}),
      });
      this._showCreateDialog = false;
      this._navigate(`/schedule/${groupId}`);
    } catch (e) {
      console.error("Failed to create schedule:", e);
    }
    this._creating = false;
  }

  render() {
    const groups = Object.values(this.hearthState.schedules);

    return html`
      <div class="container">
        ${groups.length === 0
          ? html`
              <div class="empty-state">
                <h2>No schedules</h2>
                <p>Create a schedule to get started.</p>
                <ha-button @click=${() => this._openCreateDialog()}>
                  <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                  Create Schedule
                </ha-button>
              </div>
            `
          : html`
              <div class="group-list">
                ${groups.map((group) => {
                  const areaCount = this._getAreaCount(group.schedule_id);
                  return html`
                    <ha-card
                      class="group-item"
                      @click=${() => this._navigate(`/schedule/${group.schedule_id}`)}
                    >
                      <div class="card-content group-row">
                        <div class="group-info">
                          <span class="group-name">${group.name}</span>
                          <span class="group-meta">
                            ${areaCount} area${areaCount !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <ha-icon icon="mdi:chevron-right"></ha-icon>
                      </div>
                    </ha-card>
                  `;
                })}
              </div>
            `}
      </div>

      ${this._showCreateDialog
        ? html`
            <div class="dialog-overlay" @click=${() => this._closeCreateDialog()}>
              <ha-card class="dialog-card" @click=${(e: Event) => e.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Create Schedule</h2>
                  <ha-icon-button .label=${"Close"} @click=${() => this._closeCreateDialog()}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <div class="form">
                    <label class="field">
                      Name
                      <input
                        type="text"
                        .value=${this._newName}
                        @input=${(e: Event) => (this._newName = (e.target as HTMLInputElement).value)}
                        @keydown=${(e: KeyboardEvent) => { if (e.key === "Enter") this._createGroup(); }}
                        placeholder="e.g. Default, Weekday, Weekend"
                      />
                    </label>
                    <div class="field-group">
                      <label>Start from template</label>
                      <div class="template-grid">
                        <button
                          class="template-option ${this._selectedTemplate === null ? "selected" : ""}"
                          @click=${() => { this._selectedTemplate = null; }}
                        >
                          <ha-icon icon="mdi:calendar-blank"></ha-icon>
                          <span class="template-name">Blank</span>
                          <span class="template-desc">Start from scratch</span>
                        </button>
                        ${SCHEDULE_TEMPLATES.map(
                          (t) => html`
                            <button
                              class="template-option ${this._selectedTemplate?.id === t.id ? "selected" : ""}"
                              @click=${() => { this._selectedTemplate = t; }}
                            >
                              <ha-icon icon=${t.icon}></ha-icon>
                              <span class="template-name">${t.name}</span>
                              <span class="template-desc">${t.description}</span>
                            </button>
                          `
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="dialog-actions">
                  <ha-button appearance="plain" @click=${() => this._closeCreateDialog()}>Cancel</ha-button>
                  <ha-button
                    @click=${() => this._createGroup()}
                    .disabled=${!this._newName.trim() || this._creating}
                  >
                    Create
                  </ha-button>
                </div>
              </ha-card>
            </div>
          `
        : nothing}
    `;
  }

  static styles = [
    tokens,
    viewStyles,
    emptyStateStyles,
    sectionStyles,
    dialogStyles,
    formStyles,
    css`
      .group-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2, 8px);
      }
      .group-item {
        cursor: pointer;
      }
      .group-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .group-info {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .group-name {
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .group-meta {
        font-size: var(--hearth-text-between-s-m, 13px);
        color: var(--secondary-text-color);
      }
      .template-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--ha-space-2, 8px);
      }
      .template-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ha-space-1, 4px);
        padding: var(--ha-space-3, 12px) var(--ha-space-2, 8px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        background: var(--card-background-color, white);
        color: var(--primary-text-color);
        cursor: pointer;
        font-family: inherit;
        text-align: center;
      }
      .template-option.selected {
        border-color: var(--primary-color, #03a9f4);
        background: rgba(3, 169, 244, 0.08);
      }
      .template-option:hover:not(.selected) {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .template-name {
        font-weight: var(--ha-font-weight-medium, 500);
        font-size: var(--ha-font-size-s, 12px);
      }
      .template-desc {
        font-size: var(--hearth-text-between-xs-s, 11px);
        color: var(--secondary-text-color);
      }
    `,
  ];
}
