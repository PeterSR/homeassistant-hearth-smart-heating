import { LitElement, html, css, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, PanelInfo, Route, HearthState, ToolbarConfig } from "./types";
import { HearthApi } from "./api";
import { tokens, modeBadgeStyles } from "./styles";

import "./views/overview-view";
import "./views/area-detail-view";
import "./views/schedules-view";
import "./views/schedule-editor-view";
import "./views/settings-view";
import "./views/debug-view";
import "./views/area-stats-view";
import "./views/area-settings-view";
import "./views/groups-view";
import "./views/group-settings-view";
import "./components/area-setup-dialog";

@customElement("hearth-panel")
export class HearthPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ type: Boolean, reflect: true }) public narrow = false;
  @property({ attribute: false }) public route!: Route;
  @property({ attribute: false }) public panel!: PanelInfo;

  @state() private _path = "";
  @state() private _hearthState: HearthState | null = null;
  @state() private _toolbar: ToolbarConfig = { title: "Hearth" };
  @state() private _haReady = false;

  private _api!: HearthApi;
  private _unsub?: () => void;
  private _lastConnection?: any;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("popstate", this._onPopState);
    this.addEventListener("add-area", this._handleAddArea);
    // Force re-subscribe on next willUpdate (subscription was torn down in disconnectedCallback)
    this._lastConnection = undefined;
    // Wait for HA elements to be registered (avoids "Illegal constructor"
    // errors from the scoped custom element registry polyfill during HA boot)
    if (customElements.get("ha-card")) {
      this._haReady = true;
    } else {
      customElements.whenDefined("ha-card").then(() => {
        this._haReady = true;
      });
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this._onPopState);
    this.removeEventListener("add-area", this._handleAddArea);
    this._unsubscribe();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("hass") && this.hass) {
      this._api = new HearthApi(this.hass);
      // Re-subscribe on first load or when connection changes (reconnect)
      if (this._lastConnection !== this.hass.connection) {
        this._lastConnection = this.hass.connection;
        this._subscribe();
      }
    }
    if (changed.has("route") && this.route) {
      this._path = this.route.path || "/";
    }
  }

  private async _subscribe(): Promise<void> {
    this._unsubscribe();
    try {
      this._unsub = await this._api.subscribe((state) => {
        this._hearthState = state;
      });
    } catch (e) {
      console.error("Failed to subscribe to Hearth state:", e);
    }
  }

  private _unsubscribe(): void {
    if (this._unsub) {
      this._unsub();
      this._unsub = undefined;
    }
  }

  private _onPopState = (): void => {
    this._path = this.route?.path || "/";
    this.requestUpdate();
  };

  private _toggleMenu(): void {
    this.dispatchEvent(
      new CustomEvent("hass-toggle-menu", { bubbles: true, composed: true })
    );
  }

  public navigate(path: string): void {
    const fullPath = `/hearth${path === "/" ? "" : path}`;
    history.pushState(null, "", fullPath);
    this._path = path;
  }

  private _handleAddArea = (): void => {
    const dialog = this.shadowRoot!.querySelector("area-setup-dialog");
    if (dialog) {
      (dialog as any).open();
    }
  };

  private _onSetToolbar = (e: CustomEvent<ToolbarConfig>): void => {
    this._toolbar = e.detail;
  };

  private _onNavigate = (e: CustomEvent<{ path: string }>): void => {
    this.navigate(e.detail.path);
  };

  render() {
    if (!this._haReady) {
      return html`<div class="loading">Loading...</div>`;
    }
    const tb = this._toolbar;

    return html`
      <div class="toolbar">
        ${this.narrow && !tb.backPath
          ? html`
              <ha-icon-button
                .label=${"Menu"}
                @click=${this._toggleMenu}
              >
                <ha-icon icon="mdi:menu"></ha-icon>
              </ha-icon-button>
            `
          : nothing}
        ${tb.backPath
          ? html`
              <ha-icon-button
                .label=${"Back"}
                @click=${() => this.navigate(tb.backPath!)}
              >
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </ha-icon-button>
            `
          : nothing}
        <div class="toolbar-title">${tb.title}</div>
        <div class="toolbar-actions">
          ${tb.actions ? tb.actions as TemplateResult : nothing}
        </div>
      </div>
      <div class="content">
        ${this._renderContent()}
      </div>

      ${this._hearthState
        ? html`
            <area-setup-dialog
              .hass=${this.hass}
              .api=${this._api}
              .hearthState=${this._hearthState}
            ></area-setup-dialog>
          `
        : nothing}
    `;
  }

  private _renderContent() {
    if (!this._hearthState) {
      return html`<div class="loading">Loading...</div>`;
    }

    const groupSettingsMatch = this._path.match(/^\/group\/(.+)\/settings$/);
    const areaStatsMatch = this._path.match(/^\/area\/(.+)\/stats$/);
    const areaSettingsMatch = this._path.match(/^\/area\/(.+)\/settings$/);
    const areaMatch = this._path.match(/^\/area\/(.+)$/);
    const scheduleMatch = this._path.match(/^\/schedule\/(.+)$/);

    if (this._path === "/groups") {
      return html`
        <groups-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></groups-view>
      `;
    }

    if (groupSettingsMatch) {
      const groupId = decodeURIComponent(groupSettingsMatch[1]);
      return html`
        <group-settings-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .groupId=${groupId}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></group-settings-view>
      `;
    }

    if (areaStatsMatch) {
      const areaId = decodeURIComponent(areaStatsMatch[1]);
      return html`
        <area-stats-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .areaId=${areaId}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></area-stats-view>
      `;
    }

    if (areaSettingsMatch) {
      const areaId = decodeURIComponent(areaSettingsMatch[1]);
      return html`
        <area-settings-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .areaId=${areaId}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></area-settings-view>
      `;
    }

    if (areaMatch) {
      const areaId = decodeURIComponent(areaMatch[1]);
      return html`
        <area-detail-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .areaId=${areaId}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></area-detail-view>
      `;
    }

    if (this._path === "/schedules") {
      return html`
        <schedules-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></schedules-view>
      `;
    }

    if (scheduleMatch) {
      const groupId = decodeURIComponent(scheduleMatch[1]);
      return html`
        <schedule-editor-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .groupId=${groupId}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></schedule-editor-view>
      `;
    }

    if (this._path === "/debug") {
      return html`
        <debug-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></debug-view>
      `;
    }

    if (this._path === "/settings") {
      return html`
        <settings-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></settings-view>
      `;
    }

    return html`
      <overview-view
        .hass=${this.hass}
        .api=${this._api}
        .hearthState=${this._hearthState}
        .narrow=${this.narrow}
        @navigate=${this._onNavigate}
        @set-toolbar=${this._onSetToolbar}
      ></overview-view>
    `;
  }

  static styles = [
    tokens,
    modeBadgeStyles,
    css`
      :host {
        display: block;
        height: 100%;
        --toolbar-height: var(--header-height, 56px);
      }
      .toolbar {
        display: flex;
        align-items: center;
        height: var(--toolbar-height);
        padding: 0 var(--ha-space-4, 16px);
        background: var(--app-header-background-color, var(--primary-background-color, white));
        color: var(--app-header-text-color, var(--primary-text-color));
        box-sizing: border-box;
        border-bottom: var(--app-header-border-bottom, 1px solid var(--divider-color));
        --mdc-icon-button-size: 48px;
      }
      .toolbar ha-icon-button {
        color: var(--app-header-text-color, var(--primary-text-color));
      }
      .toolbar-title {
        font-size: var(--ha-font-size-xl, 20px);
        font-weight: var(--ha-font-weight-normal, 400);
        margin: 0 0 0 var(--ha-space-3, 12px);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .toolbar-actions {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        flex-shrink: 0;
      }
      .content {
        height: calc(100% - var(--toolbar-height));
        overflow: auto;
        overscroll-behavior: none;
      }
      .loading {
        padding: var(--ha-space-4, 16px);
      }
    `,
  ];
}
