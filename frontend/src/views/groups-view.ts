import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaGroupConfig, ToolbarConfig } from "../types";
import { HearthApi } from "../api";
import { tokens, viewStyles, dialogStyles } from "../styles";

@customElement("groups-view")
export class GroupsView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property({ type: Boolean }) narrow = false;

  @state() private _showCreateDialog = false;
  @state() private _newGroupName = "";
  @state() private _creating = false;

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
        detail: { title: "Area Groups", backPath: "/settings" },
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

  private async _createGroup(): Promise<void> {
    const name = this._newGroupName.trim();
    if (!name) return;
    const groupId = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    const order = Object.keys(this.hearthState.groups ?? {}).length;
    this._creating = true;
    try {
      await this.api.addGroup({ group_id: groupId, name, order });
      this._newGroupName = "";
      this._showCreateDialog = false;
      this._navigate(`/group/${groupId}/settings`);
    } catch (e) {
      console.error("Failed to create group:", e);
    }
    this._creating = false;
  }

  private _getSortedGroups(): AreaGroupConfig[] {
    return Object.values(this.hearthState.groups ?? {}).sort((a, b) => a.order - b.order);
  }

  private async _moveGroup(groupId: string, direction: -1 | 1): Promise<void> {
    const groups = this._getSortedGroups();
    const idx = groups.findIndex((g) => g.group_id === groupId);
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= groups.length) return;
    const reordered = [...groups];
    [reordered[idx], reordered[newIdx]] = [reordered[newIdx], reordered[idx]];
    await this.api.reorderGroups(reordered.map((g) => g.group_id));
  }

  render() {
    const groups = this._getSortedGroups();

    return html`
      <div class="container">
        ${groups.length === 0
          ? html`
              <div class="empty-state">
                <h2>No groups</h2>
                <p>Groups let you organize areas and optionally share a schedule across multiple areas.</p>
              </div>
            `
          : html`
              <div class="group-list">
                ${groups.map(
                  (g, idx) => html`
                    <div class="group-row">
                      <div
                        class="group-info"
                        @click=${() => this._navigate(`/group/${g.group_id}/settings`)}
                      >
                        <span class="group-name">${g.name}</span>
                        <span class="group-meta">
                          ${g.area_ids.length} area${g.area_ids.length !== 1 ? "s" : ""}${g.schedule_id && this.hearthState.schedules[g.schedule_id]
                            ? ` · ${this.hearthState.schedules[g.schedule_id].name}`
                            : ""}
                        </span>
                      </div>
                      <div class="group-actions">
                        <ha-icon-button
                          .label=${"Move up"}
                          .disabled=${idx === 0}
                          @click=${(e: Event) => { e.stopPropagation(); this._moveGroup(g.group_id, -1); }}
                        >
                          <ha-icon icon="mdi:arrow-up"></ha-icon>
                        </ha-icon-button>
                        <ha-icon-button
                          .label=${"Move down"}
                          .disabled=${idx === groups.length - 1}
                          @click=${(e: Event) => { e.stopPropagation(); this._moveGroup(g.group_id, 1); }}
                        >
                          <ha-icon icon="mdi:arrow-down"></ha-icon>
                        </ha-icon-button>
                        <ha-icon icon="mdi:chevron-right" class="chevron"
                          @click=${() => this._navigate(`/group/${g.group_id}/settings`)}
                        ></ha-icon>
                      </div>
                    </div>
                  `
                )}
              </div>
            `}
      </div>

      ${this._showCreateDialog
        ? html`
            <div class="dialog-overlay" @click=${() => (this._showCreateDialog = false)}>
              <ha-card class="dialog-card" @click=${(e: Event) => e.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Create Group</h2>
                  <ha-icon-button .label=${"Close"} @click=${() => (this._showCreateDialog = false)}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <ha-form
                    .hass=${this.hass}
                    .schema=${[{ name: "name", selector: { text: {} } }]}
                    .data=${{ name: this._newGroupName }}
                    .computeLabel=${() => "Group name"}
                    @value-changed=${(e: CustomEvent) => {
                      this._newGroupName = e.detail.value.name ?? "";
                    }}
                  ></ha-form>
                  <ha-button
                    style="margin-top: var(--ha-space-3, 12px)"
                    @click=${this._createGroup}
                    .disabled=${!this._newGroupName.trim() || this._creating}
                  >
                    Create
                  </ha-button>
                </div>
              </ha-card>
            </div>
          `
        : nothing}

      <button class="fab" @click=${() => (this._showCreateDialog = true)}>
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>
    `;
  }

  static styles = [
    tokens,
    viewStyles,
    dialogStyles,
    css`
      .empty-state {
        text-align: center;
        padding: var(--ha-space-6, 24px);
        color: var(--secondary-text-color);
      }
      .empty-state h2 {
        color: var(--primary-text-color);
        margin-bottom: var(--ha-space-2, 8px);
      }
      .group-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .group-row {
        display: flex;
        align-items: center;
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        background: var(--card-background-color, white);
        border-radius: var(--ha-border-radius-md, 8px);
      }
      .group-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .group-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
        cursor: pointer;
      }
      .group-name {
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .group-meta {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .group-actions {
        display: flex;
        align-items: center;
      }
      .chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
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
    `,
  ];
}
