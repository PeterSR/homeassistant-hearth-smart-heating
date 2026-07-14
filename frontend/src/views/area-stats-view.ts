import { LitElement, html, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { HomeAssistant, HearthState, AreaState, ToolbarConfig, CommandLogEntry } from "../types";
import { HearthApi } from "../api";
import { tokens, viewStyles, modeBadgeStyles } from "../styles";
import { getAreaDisplayName } from "../utils";

let echartsModule: typeof import("echarts/core") | null = null;

async function loadEcharts() {
  if (echartsModule) return echartsModule;
  const [core, charts, components, renderers] = await Promise.all([
    import("echarts/core"),
    import("echarts/charts"),
    import("echarts/components"),
    import("echarts/renderers"),
  ]);
  core.use([charts.LineChart, components.GridComponent, components.TooltipComponent, components.LegendComponent, components.MarkLineComponent, renderers.CanvasRenderer]);
  echartsModule = core;
  return core;
}

interface StatPoint {
  start: number;
  mean: number;
}

interface SeriesData {
  name: string;
  points: StatPoint[];
  color: string;
  width: number;
  dashed: boolean;
  step: boolean;
}

interface TransitionEntry {
  time: number;
  state: string;
  duration: number | null;
}

@customElement("area-stats-view")
export class AreaStatsView extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @property({ attribute: false }) api!: HearthApi;
  @property({ attribute: false }) hearthState!: HearthState;
  @property() areaId = "";
  @property({ type: Boolean }) narrow = false;

  @state() private _series: SeriesData[] = [];
  @state() private _stateHistory: TransitionEntry[] = [];
  @state() private _commandLog: CommandLogEntry[] = [];
  @state() private _loading = true;
  @state() private _hours = 24;

  private _chart: import("echarts/core").ECharts | null = null;
  private _resizeObserver: ResizeObserver | null = null;

  private get _area(): AreaState | undefined {
    return this.hearthState.areas[this.areaId];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._updateToolbar();
    this._loadData();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._disposeChart();
  }

  willUpdate(changed: PropertyValues): void {
    if (changed.has("areaId")) {
      this._updateToolbar();
      this._loadData();
    }
  }

  updated(changed: PropertyValues): void {
    if (changed.has("_series") || changed.has("_loading")) {
      this._updateChart();
    }
  }

  private _updateToolbar(): void {
    const area = this._area;
    const name = area ? getAreaDisplayName(area) : this.areaId;
    this.dispatchEvent(
      new CustomEvent<ToolbarConfig>("set-toolbar", {
        detail: { title: `${name} - Stats`, backPath: `/area/${this.areaId}` },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async _loadData(): Promise<void> {
    this._loading = true;
    await Promise.all([this._loadAllSeries(), this._loadTransitions(), this._loadCommandLog()]);
    this._loading = false;
  }

  // --- Data loading ---

  private async _loadAllSeries(): Promise<void> {
    const area = this._area;
    if (!area) { this._series = []; return; }

    // Colors for per-device lines (cycle through)
    const deviceColors = ["#4fc3f7", "#81c784", "#ffb74d", "#e57373", "#ba68c8", "#4db6ac"];

    // 1. Area aggregate sensors (our custom sensors)
    const areaCurrentId = `sensor.hearth_${this.areaId}_current_temperature`;
    const areaTargetId = `sensor.hearth_${this.areaId}_target_temperature`;

    // 2. Per-device climate entities (HA's native climate entities have history)
    const climateEntityIds = area.climate_entities ?? [];

    // 3. External temperature sensors
    const tempSensorIds = area.temperature_sensors ?? [];

    // Collect all entity IDs to query
    const allIds = [areaCurrentId, areaTargetId, ...climateEntityIds, ...tempSensorIds];
    const start = new Date(Date.now() - this._hours * 3600_000);

    // Try statistics API first, fall back to raw history
    let rawData: Record<string, StatPoint[]> = {};
    try {
      const statsResult = await this.hass.callWS<Record<string, any[]>>({
        type: "recorder/statistics_during_period",
        start_time: start.toISOString(),
        statistic_ids: [areaCurrentId, areaTargetId, ...tempSensorIds],
        period: this._hours <= 12 ? "5minute" : "hour",
        types: ["mean"],
      });

      for (const [id, entries] of Object.entries(statsResult)) {
        rawData[id] = this._parseStats(entries);
      }
    } catch { /* stats API not available for some entities */ }

    // For climate entities, use raw history (they have current_temperature as attribute)
    // Also fall back for any entity with too few stats points
    const needsHistory: string[] = [];
    for (const id of allIds) {
      if (!rawData[id] || rawData[id].length < 3) {
        needsHistory.push(id);
      }
    }

    if (needsHistory.length > 0) {
      try {
        const histResult = await this.hass.callWS<Record<string, any[]>>({
          type: "history/history_during_period",
          start_time: start.toISOString(),
          entity_ids: needsHistory,
          significant_changes_only: false,
          minimal_response: false,
          no_attributes: false,
        });

        for (const [id, entries] of Object.entries(histResult)) {
          if (climateEntityIds.includes(id)) {
            // For climate entities, extract current_temperature and temperature from attributes
            rawData[`${id}__current`] = this._parseClimateHistory(entries, "current_temperature");
            rawData[`${id}__target`] = this._parseClimateHistory(entries, "temperature");
          } else if (!rawData[id] || rawData[id].length < 3) {
            rawData[id] = this._parseHistoryAsStats(entries);
          }
        }
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }

    // Build series
    const series: SeriesData[] = [];

    // Area aggregates (thick lines)
    if (rawData[areaCurrentId]?.length) {
      series.push({
        name: "Area Current",
        points: rawData[areaCurrentId],
        color: "#03a9f4",
        width: 2.5,
        dashed: false,
        step: true,
      });
    }
    if (rawData[areaTargetId]?.length) {
      series.push({
        name: "Area Target",
        points: rawData[areaTargetId],
        color: "#ff9800",
        width: 2,
        dashed: true,
        step: true,
      });
    }

    // Per-device TRV lines (thin)
    climateEntityIds.forEach((eid, i) => {
      const color = deviceColors[i % deviceColors.length];
      const name = this.hass.states[eid]?.attributes?.friendly_name ?? eid;
      const shortName = name.replace(/^Danfoss\s*(TRV\s*)?/i, "");

      const currentKey = `${eid}__current`;
      const targetKey = `${eid}__target`;
      if (rawData[currentKey]?.length) {
        series.push({
          name: `${shortName} current`,
          points: rawData[currentKey],
          color,
          width: 1,
          dashed: false,
          step: false,
        });
      }
      if (rawData[targetKey]?.length) {
        series.push({
          name: `${shortName} target`,
          points: rawData[targetKey],
          color,
          width: 1,
          dashed: true,
          step: true,
        });
      }
    });

    // External sensor lines (dotted)
    tempSensorIds.forEach((sid, i) => {
      const color = "#ab47bc"; // purple for external sensors
      const name = this.hass.states[sid]?.attributes?.friendly_name ?? sid;
      if (rawData[sid]?.length) {
        series.push({
          name,
          points: rawData[sid],
          color,
          width: 1.5,
          dashed: false,
          step: false,
        });
      }
    });

    this._series = series;
  }

  private async _loadTransitions(): Promise<void> {
    const stateId = `sensor.hearth_${this.areaId}_state`;
    const start = new Date(Date.now() - this._hours * 3600_000);
    try {
      const result = await this.hass.callWS<Record<string, any[]>>({
        type: "history/history_during_period",
        start_time: start.toISOString(),
        entity_ids: [stateId],
        significant_changes_only: false,
        minimal_response: true,
        no_attributes: true,
      });
      const rawStates = (result[stateId] ?? []).filter((e: any) => {
        const s = e.s ?? e.state;
        return s && s !== "unavailable" && s !== "unknown";
      });
      this._stateHistory = this._parseStateHistory(rawStates);
    } catch {
      this._stateHistory = [];
    }
  }

  private async _loadCommandLog(): Promise<void> {
    try {
      const result = await this.api.getCommandLog({ areaId: this.areaId });
      this._commandLog = result.log;
    } catch {
      this._commandLog = [];
    }
  }

  // --- Parsers ---

  private _parseStats(entries: any[]): StatPoint[] {
    return entries
      .filter((e: any) => e.mean != null)
      .map((e: any) => ({ start: new Date(e.start).getTime(), mean: e.mean }));
  }

  private _parseHistoryAsStats(entries: any[]): StatPoint[] {
    return entries
      .filter((e: any) => { const v = parseFloat(e.s ?? e.state); return !isNaN(v); })
      .map((e: any) => ({
        start: e.lu ? e.lu * 1000 : new Date(e.last_updated ?? e.last_changed).getTime(),
        mean: parseFloat(e.s ?? e.state),
      }));
  }

  private _parseClimateHistory(entries: any[], attr: string): StatPoint[] {
    const points: StatPoint[] = [];
    for (const e of entries) {
      const val = e.a?.[attr] ?? e.attributes?.[attr];
      if (val != null && !isNaN(parseFloat(val))) {
        const time = e.lu ? e.lu * 1000 : new Date(e.last_updated ?? e.last_changed).getTime();
        points.push({ start: time, mean: parseFloat(val) });
      }
    }
    return points;
  }

  private _parseStateHistory(entries: any[]): TransitionEntry[] {
    const result: TransitionEntry[] = [];
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const time = e.lu ? e.lu * 1000 : new Date(e.last_updated ?? e.last_changed).getTime();
      const s = e.s ?? e.state;
      const nextTime = i < entries.length - 1
        ? (entries[i + 1].lu ? entries[i + 1].lu * 1000 : new Date(entries[i + 1].last_updated ?? entries[i + 1].last_changed).getTime())
        : null;
      result.push({ time, state: s, duration: nextTime ? (nextTime - time) / 1000 : null });
    }
    return result;
  }

  private _setHours(hours: number): void {
    this._hours = hours;
    this._disposeChart();
    this._loadData();
  }

  // --- ECharts ---

  private _getChartContainer(): HTMLElement | null {
    return this.renderRoot.querySelector("#chart-container") as HTMLElement | null;
  }

  private async _updateChart(): Promise<void> {
    const container = this._getChartContainer();
    if (!container) return;

    if (this._series.length === 0) {
      this._disposeChart();
      return;
    }

    if (!this._chart) {
      const ec = await loadEcharts();
      this._chart = ec.init(container);
      this._resizeObserver = new ResizeObserver(() => this._chart?.resize());
      this._resizeObserver.observe(container);
    }

    const computedStyle = getComputedStyle(this);
    const textColor = computedStyle.getPropertyValue("--secondary-text-color").trim() || "#9e9e9e";
    const dividerColor = computedStyle.getPropertyValue("--divider-color").trim() || "#e0e0e0";

    this._chart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        valueFormatter: (v: number) => `${v.toFixed(1)}°C`,
      },
      legend: {
        data: this._series.map(s => s.name),
        textStyle: { color: textColor, fontSize: 11 },
        bottom: 0,
        type: "scroll",
      },
      grid: {
        left: 45,
        right: 15,
        top: 10,
        bottom: 50,
      },
      xAxis: {
        type: "time",
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { show: false },
        axisLine: { lineStyle: { color: dividerColor } },
      },
      yAxis: {
        type: "value",
        min: this._area?.min_temp ?? 4,
        max: this._area?.max_temp ?? 35,
        axisLabel: { color: textColor, fontSize: 11, formatter: "{value}°" },
        splitLine: { lineStyle: { color: dividerColor, type: "dashed" } },
      },
      series: this._series.map(s => ({
        name: s.name,
        type: "line",
        step: s.step ? "end" : false,
        data: s.points.map(p => [p.start, p.mean]),
        lineStyle: {
          color: s.color,
          width: s.width,
          type: s.dashed ? "dashed" : "solid",
        },
        itemStyle: { color: s.color },
        symbol: s.points.length < 10 ? "circle" : "none",
        symbolSize: 3,
        smooth: false,
      })),
      animation: false,
    }, true);
  }

  private _disposeChart(): void {
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
    this._chart?.dispose();
    this._chart = null;
  }

  // --- Render ---

  render() {
    if (this._loading) {
      return html`<div class="container"><p>Loading statistics...</p></div>`;
    }

    const area = this._area;
    if (!area) {
      return html`<div class="container"><p>Area not found.</p></div>`;
    }

    return html`
      <div class="container">
        <div class="top-actions">
          <ha-button appearance="plain" @click=${() => this._loadData()}>
            <ha-icon icon="mdi:refresh" slot="icon"></ha-icon>
            Refresh
          </ha-button>
        </div>

        <div class="time-range">
          ${[6, 12, 24, 48, 72].map(h => html`
            <ha-button
              .outlined=${this._hours !== h}
              @click=${() => this._setHours(h)}
              class=${this._hours === h ? "active" : ""}
            >${h}h</ha-button>
          `)}
        </div>

        <!-- Temperature chart -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Temperature History</h3>
            ${this._series.length > 0
              ? html`<div id="chart-container" style="width:100%;height:300px;"></div>`
              : html`<p class="empty-text">No temperature data recorded yet.</p>`}
          </div>
        </ha-card>

        <!-- Climate devices -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Climate Devices</h3>
            ${area.devices.map((d: any) => html`
              <div class="device-card">
                <div class="device-header-row">
                  <span class="device-name">${d.friendly_name || d.entity_id}</span>
                  <span class="badge-row">
                    ${d.covered ? html`<span class="badge covered">Covered</span>` : nothing}
                    ${d.zigbee_backend ? html`<span class="badge zigbee">${d.zigbee_backend.toUpperCase()}</span>` : nothing}
                    ${d.adapter_type === "danfoss_ally" ? html`<span class="badge danfoss">Danfoss</span>` : nothing}
                  </span>
                </div>
                <div class="device-stats">
                  <span>Current: ${d.current_temp != null ? `${d.current_temp.toFixed(1)}°C` : "—"}</span>
                  <span class=${d.target_temp != null && area.target_temp != null && Math.abs(d.target_temp - area.target_temp) > 0.05 ? "pending" : ""}>Target: ${d.target_temp != null ? `${d.target_temp.toFixed(1)}°C` : "—"}</span>
                  <span>Battery: ${d.battery != null ? `${d.battery}%` : "—"}</span>
                </div>
                ${d.diagnostics ? html`
                  <div class="device-stats diagnostics">
                    ${d.diagnostics.software_error != null ? html`<span class=${d.diagnostics.has_error ? "error" : ""}>Error: ${d.diagnostics.software_error}</span>` : nothing}
                    ${d.diagnostics.pi_heating_demand != null ? html`<span>Demand: ${d.diagnostics.pi_heating_demand}%</span>` : nothing}
                    ${d.diagnostics.setpoint_change_source != null ? html`<span class=${d.diagnostics.setpoint_change_source !== "External" ? "warn" : ""}>Source: ${d.diagnostics.setpoint_change_source}</span>` : nothing}
                    ${d.diagnostics.adaptation_run_status != null ? html`<span>Adaptation: ${d.diagnostics.adaptation_run_status}</span>` : nothing}
                    ${d.diagnostics.motor_step_counter != null ? html`<span>Steps: ${d.diagnostics.motor_step_counter.toLocaleString()}</span>` : nothing}
                    ${d.diagnostics.linkquality != null ? html`<span>LQI: ${d.diagnostics.linkquality}</span>` : nothing}
                  </div>
                ` : nothing}
                ${d.feature_status && Object.keys(d.feature_status).length > 0 ? html`
                  <div class="feature-status">
                    ${Object.entries(d.feature_status as Record<string, string>).map(([cmd, ts]) => html`
                      <span class="feat-item" title=${ts}>${cmd}: ${this._relativeTime(ts)}</span>
                    `)}
                  </div>
                ` : nothing}
              </div>
            `)}
          </div>
        </ha-card>

        <!-- Temperature sensors -->
        ${(area as any).temperature_sensor_details?.length > 0 ? html`
          <ha-card>
            <div class="card-content">
              <h3 class="section-title">Temperature Sensors</h3>
              ${(area as any).temperature_sensor_details.map((sd: any) => html`
                <div class="device-card">
                  <div class="device-header-row">
                    <span class="device-name">${sd.friendly_name}</span>
                    <span class="badge-row">
                      <span class="badge sensor">Sensor</span>
                    </span>
                  </div>
                  <div class="device-stats">
                    <span>Reading: ${sd.current_temp != null ? `${sd.current_temp.toFixed(1)}°C` : "—"}</span>
                    ${sd.battery != null ? html`<span>Battery: ${sd.battery}%</span>` : nothing}
                  </div>
                </div>
              `)}
            </div>
          </ha-card>
        ` : nothing}

        <!-- Transition log -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Transition Log</h3>
            ${this._stateHistory.length === 0
              ? html`<p class="empty-text">No transitions recorded yet.</p>`
              : html`
                <div class="transition-list">
                  ${this._stateHistory.slice().reverse().slice(0, 50).map(t => html`
                    <div class="transition-row">
                      <span class="trans-time">${new Date(t.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      <span class="mode-badge ${t.state}">${t.state}</span>
                      <span class="trans-duration">${t.duration != null ? this._formatDuration(t.duration) : "ongoing"}</span>
                    </div>
                  `)}
                </div>
              `}
          </div>
        </ha-card>

        <!-- Danfoss command log -->
        ${this._commandLog.length > 0 ? html`
          <ha-card>
            <div class="card-content">
              <h3 class="section-title">Danfoss Command Log</h3>
              <div class="command-list">
                ${this._commandLog.slice().reverse().slice(0, 50).map(c => html`
                  <div class="command-row">
                    <span class="cmd-time">${new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    <span class="cmd-name ${c.success ? "ok" : "fail"}">${c.command}</span>
                    <span class="cmd-detail">
                      ${c.detail}
                      ${c.repeat_count && c.repeat_count > 1 ? html`
                        <span class="cmd-repeat" title="last at ${c.last_timestamp ? new Date(c.last_timestamp).toLocaleTimeString() : ""}">×${c.repeat_count}</span>
                      ` : nothing}
                    </span>
                  </div>
                `)}
              </div>
            </div>
          </ha-card>
        ` : nothing}
      </div>
    `;
  }

  private _relativeTime(isoTs: string): string {
    const seconds = (Date.now() - new Date(isoTs).getTime()) / 1000;
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h ago`;
    return `${Math.round(seconds / 86400)}d ago`;
  }

  private _formatDuration(seconds: number): string {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  static styles = [
    tokens,
    viewStyles,
    modeBadgeStyles,
    css`
      ha-card { margin-bottom: var(--ha-space-4, 16px); }
      .card-content { padding: var(--ha-space-4, 16px); }
      .section-title {
        margin: 0 0 var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--primary-text-color);
      }
      .top-actions { display: flex; justify-content: flex-end; margin-bottom: var(--ha-space-2, 8px); }
      .time-range {
        display: flex; gap: var(--ha-space-2, 8px);
        justify-content: center; margin-bottom: var(--ha-space-4, 16px);
      }
      .time-range ha-button.active { --mdc-theme-primary: var(--primary-color); }
      .empty-text {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 12px);
        font-style: italic;
      }
      .device-card {
        padding: var(--ha-space-3, 12px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        margin-bottom: var(--ha-space-2, 8px);
      }
      .device-header-row {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: var(--ha-space-1, 4px);
      }
      .device-name {
        font-weight: var(--ha-font-weight-medium, 500);
        font-size: var(--ha-font-size-m, 14px);
      }
      .badge-row { display: flex; gap: var(--ha-space-1, 4px); }
      .badge {
        font-size: 10px; padding: 1px 6px;
        border-radius: var(--ha-border-radius-pill, 9999px);
        color: white;
      }
      .badge.danfoss { background: var(--primary-color, #03a9f4); }
      .badge.zigbee { background: var(--success-color, #4caf50); }
      .badge.covered { background: var(--warning-color, #ff9800); }
      .badge.sensor { background: #ab47bc; }
      .device-stats {
        display: flex; gap: var(--ha-space-3, 12px); flex-wrap: wrap;
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .device-stats .error { color: var(--error-color, #db4437); font-weight: 500; }
      .device-stats .warn { color: var(--warning-color, #ff9800); }
      .device-stats.diagnostics { margin-top: var(--ha-space-1, 4px); }
      .feature-status {
        display: flex; flex-wrap: wrap; gap: var(--ha-space-2, 8px);
        margin-top: var(--ha-space-1, 4px);
        font-size: 11px; color: var(--secondary-text-color);
      }
      .feat-item { font-family: monospace; }
      .pending { color: var(--warning-color, #ff9800); }
      .transition-list { display: flex; flex-direction: column; gap: var(--ha-space-1, 4px); }
      .transition-row { display: flex; align-items: center; gap: var(--ha-space-2, 8px); font-size: var(--ha-font-size-m, 14px); }
      .trans-time { font-family: monospace; font-size: var(--ha-font-size-s, 12px); color: var(--secondary-text-color); min-width: 50px; }
      .trans-duration { color: var(--secondary-text-color); font-size: var(--ha-font-size-s, 12px); }
      .command-list { display: flex; flex-direction: column; gap: var(--ha-space-1, 4px); }
      .command-row { display: flex; align-items: center; gap: var(--ha-space-2, 8px); font-size: var(--ha-font-size-s, 12px); }
      .cmd-time { font-family: monospace; color: var(--secondary-text-color); min-width: 70px; flex-shrink: 0; }
      .cmd-name { font-weight: var(--ha-font-weight-medium, 500); min-width: 100px; flex-shrink: 0; }
      .cmd-name.ok { color: var(--success-color, #4caf50); }
      .cmd-name.fail { color: var(--error-color, #db4437); }
      .cmd-detail { color: var(--secondary-text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
      .cmd-repeat { margin-left: var(--ha-space-2, 8px); padding: 0 6px; border-radius: 4px; background: var(--secondary-background-color); color: var(--primary-text-color); font-family: monospace; font-size: var(--ha-font-size-xs, 11px); }
    `,
  ];
}
