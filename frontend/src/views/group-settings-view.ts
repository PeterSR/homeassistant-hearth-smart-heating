import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaGroupConfig, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import { getAreaDisplayName } from "../utils";
import { tokens, viewStyles } from "../styles";

@customElement("group-settings-view")
export class GroupSettingsView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property() groupId = "";
  @property({ type: Boolean }) narrow = false;

  @state() private _name = "";
  @state() private _scheduleId: string | null = null;
  @state() private _areaIds: string[] = [];
  @state() private _dirty = false;
  @state() private _loading = false;
  @state() private _confirmDelete = false;

  private get _group(): AreaGroupConfig | undefined {
    return this.hearthState.groups?.[this.groupId];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._syncFromState();
    this._updateToolbar();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("groupId")) {
      this._syncFromState();
      this._updateToolbar();
    }
    if (changed.has("hearthState") && !this._dirty) {
      this._syncFromState();
    }
  }

  private _syncFromState(): void {
    const group = this._group;
    if (!group) return;
    this._name = group.name;
    this._scheduleId = group.schedule_id;
    this._areaIds = [...group.area_ids];
    this._dirty = false;
    this._confirmDelete = false;
  }

  private _updateToolbar(): void {
    const group = this._group;
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: {
          title: group ? `${group.name} - Settings` : "Group Settings",
          backPath: "/groups",
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

  private _getUngroupedAreas(): Array<{ area_id: string; name: string }> {
    const allGroupedIds = new Set<string>();
    for (const g of Object.values(this.hearthState.groups ?? {})) {
      for (const aid of g.area_ids) allGroupedIds.add(aid);
    }
    return Object.values(this.hearthState.areas)
      .filter((a) => !allGroupedIds.has(a.area_id) || this._areaIds.includes(a.area_id))
      .filter((a) => !this._areaIds.includes(a.area_id))
      .map((a) => ({ area_id: a.area_id, name: getAreaDisplayName(a) }));
  }

  private _moveArea(index: number, direction: -1 | 1): void {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= this._areaIds.length) return;
    const ids = [...this._areaIds];
    [ids[index], ids[newIndex]] = [ids[newIndex], ids[index]];
    this._areaIds = ids;
    this._dirty = true;
  }

  private _removeArea(areaId: string): void {
    this._areaIds = this._areaIds.filter((id) => id !== areaId);
    this._dirty = true;
  }

  private _addArea(areaId: string): void {
    if (!this._areaIds.includes(areaId)) {
      this._areaIds = [...this._areaIds, areaId];
      this._dirty = true;
    }
  }

  private async _save(): Promise<void> {
    this._loading = true;
    try {
      await this.api.updateGroup(this.groupId, {
        name: this._name,
        schedule_id: this._scheduleId || null,
        area_ids: this._areaIds,
      });
      this._dirty = false;
    } catch (e) {
      console.error("Failed to save group:", e);
    }
    this._loading = false;
  }

  private async _handleDelete(): Promise<void> {
    this._loading = true;
    try {
      await this.api.removeGroup(this.groupId);
      this._navigate("/");
    } catch (e) {
      console.error("Failed to delete group:", e);
    }
    this._loading = false;
  }

  render() {
    const group = this._group;
    if (!group) {
      return html`<div class="container"><p>Group not found.</p></div>`;
    }

    const schedules = Object.values(this.hearthState.schedules);
    const ungrouped = this._getUngroupedAreas();

    return html`
      <div class="container">
        <!-- Name -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Name</h3>
            <ha-form
              .hass=${this.hass}
              .schema=${[{ name: "name", selector: { text: {} } }]}
              .data=${{ name: this._name }}
              .computeLabel=${() => "Group name"}
              @value-changed=${(e: CustomEvent) => {
                this._name = e.detail.value.name ?? "";
                this._dirty = true;
              }}
            ></ha-form>
          </div>
        </ha-card>

        <!-- Schedule -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Schedule</h3>
            <p class="hint-text">When set, all areas in this group follow this schedule instead of their own.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${[{
                name: "schedule_id",
                selector: { select: {
                  mode: "dropdown",
                  options: [
                    { value: "", label: "None (use per-area schedules)" },
                    ...schedules.map((s) => ({ value: s.schedule_id, label: s.name })),
                  ],
                }},
              }]}
              .data=${{ schedule_id: this._scheduleId ?? "" }}
              .computeLabel=${() => "Group schedule"}
              @value-changed=${(e: CustomEvent) => {
                this._scheduleId = e.detail.value.schedule_id || null;
                this._dirty = true;
              }}
            ></ha-form>
          </div>
        </ha-card>

        <!-- Areas -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Areas</h3>
            ${this._areaIds.length === 0
              ? html`<p class="hint-text">No areas in this group yet.</p>`
              : html`
                  <div class="area-list">
                    ${this._areaIds.map((aid, idx) => {
                      const area = this.hearthState.areas[aid];
                      const name = area ? getAreaDisplayName(area) : aid;
                      return html`
                        <div class="area-row">
                          <span class="area-name">${name}</span>
                          <div class="area-actions">
                            <ha-icon-button
                              .label=${"Move up"}
                              .disabled=${idx === 0}
                              @click=${() => this._moveArea(idx, -1)}
                            >
                              <ha-icon icon="mdi:arrow-up"></ha-icon>
                            </ha-icon-button>
                            <ha-icon-button
                              .label=${"Move down"}
                              .disabled=${idx === this._areaIds.length - 1}
                              @click=${() => this._moveArea(idx, 1)}
                            >
                              <ha-icon icon="mdi:arrow-down"></ha-icon>
                            </ha-icon-button>
                            <ha-icon-button
                              .label=${"Remove"}
                              @click=${() => this._removeArea(aid)}
                            >
                              <ha-icon icon="mdi:close"></ha-icon>
                            </ha-icon-button>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
            ${ungrouped.length > 0
              ? html`
                  <div class="add-area-section">
                    <ha-form
                      .hass=${this.hass}
                      .schema=${[{
                        name: "add_area",
                        selector: { select: {
                          mode: "dropdown",
                          options: ungrouped.map((a) => ({ value: a.area_id, label: a.name })),
                        }},
                      }]}
                      .data=${{ add_area: "" }}
                      .computeLabel=${() => "Add area to group"}
                      @value-changed=${(e: CustomEvent) => {
                        const aid = e.detail.value.add_area;
                        if (aid) this._addArea(aid);
                      }}
                    ></ha-form>
                  </div>
                `
              : nothing}
          </div>
        </ha-card>

        <!-- Save -->
        <div class="save-row">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty || this._loading}
          >
            ${this._loading ? "Saving..." : "Save"}
          </ha-button>
        </div>

        <!-- Delete -->
        <div class="actions-section">
          ${this._confirmDelete
            ? html`
                <ha-button appearance="plain" variant="danger"
                  @click=${() => this._handleDelete()} .disabled=${this._loading}>
                  Confirm delete group?
                </ha-button>
                <ha-button appearance="plain" @click=${() => (this._confirmDelete = false)}>
                  Cancel
                </ha-button>
              `
            : html`
                <ha-button appearance="plain" variant="danger"
                  @click=${() => (this._confirmDelete = true)}>
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  Delete group
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
      ha-card { margin-bottom: var(--ha-space-6, 24px); }
      .card-content { padding: var(--ha-space-4, 16px); }
      .section-title {
        margin: 0 0 var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--primary-text-color);
      }
      .hint-text {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-3, 12px);
        font-style: italic;
      }
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
      .area-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .area-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: var(--ha-border-radius-md, 8px);
      }
      .area-name {
        font-size: var(--ha-font-size-m, 14px);
      }
      .area-actions {
        display: flex;
        align-items: center;
      }
      .add-area-section {
        margin-top: var(--ha-space-3, 12px);
      }
    `,
  ];
}
