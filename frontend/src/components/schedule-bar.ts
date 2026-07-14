import { LitElement, html, css } from "lit";
import { property } from "lit/decorators.js";
import { tokens } from "../styles";

/**
 * Accepts either:
 * - Template entries: { time: "HH:MM", temp: "home"|"away"|number }
 * - Materialized entries: { time: ISO string, state: "home"|"away", source: "schedule"|"user" }
 */
interface AnyEntry {
  time: string;
  temp?: string | number;
  state?: string;
  source?: string;
}

export class ScheduleBar extends LitElement {
  @property({ attribute: false }) entries: AnyEntry[] = [];
  @property({ type: Number }) homeTemp = 21;
  @property({ type: Number }) awayTemp = 17;

  private _entryToMinutes(entry: AnyEntry): number {
    // ISO datetime string (materialized)
    if (entry.time.includes("T")) {
      const dt = new Date(entry.time);
      return dt.getHours() * 60 + dt.getMinutes();
    }
    // HH:MM string (template)
    const [h, m] = entry.time.split(":").map(Number);
    return h * 60 + m;
  }

  private _entryIsHome(entry: AnyEntry): boolean {
    if (entry.state !== undefined) return entry.state === "home";
    if (entry.temp === "home") return true;
    if (entry.temp === "away") return false;
    return Number(entry.temp) >= (this.homeTemp + this.awayTemp) / 2;
  }

  private _entryIsUser(entry: AnyEntry): boolean {
    return entry.source === "user";
  }

  private _entryTemp(entry: AnyEntry): number {
    if (entry.state !== undefined) {
      return entry.state === "home" ? this.homeTemp : this.awayTemp;
    }
    if (entry.temp === "home") return this.homeTemp;
    if (entry.temp === "away") return this.awayTemp;
    return Number(entry.temp);
  }

  private _entryTimeLabel(entry: AnyEntry): string {
    if (entry.time.includes("T")) {
      const dt = new Date(entry.time);
      return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return entry.time;
  }

  render() {
    if (this.entries.length === 0) {
      return html`<div class="bar-container">
        <div class="no-schedule">No schedule for today</div>
      </div>`;
    }

    const totalMinutes = 24 * 60;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const nowPercent = (nowMinutes / totalMinutes) * 100;

    const segments: Array<{
      start: number;
      end: number;
      isHome: boolean;
      isUser: boolean;
      temp: number;
    }> = [];

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      const start = this._entryToMinutes(entry);
      const end =
        i < this.entries.length - 1
          ? this._entryToMinutes(this.entries[i + 1])
          : totalMinutes;

      segments.push({
        start,
        end,
        isHome: this._entryIsHome(entry),
        isUser: this._entryIsUser(entry),
        temp: this._entryTemp(entry),
      });
    }

    // Add leading segment if first entry isn't at 00:00
    if (segments.length > 0 && segments[0].start > 0) {
      const lastEntry = this.entries[this.entries.length - 1];
      segments.unshift({
        start: 0,
        end: segments[0].start,
        isHome: this._entryIsHome(lastEntry),
        isUser: this._entryIsUser(lastEntry),
        temp: this._entryTemp(lastEntry),
      });
    }

    return html`
      <div class="bar-container">
        <div class="bar">
          ${segments.map((seg) => {
            const left = (seg.start / totalMinutes) * 100;
            const width = ((seg.end - seg.start) / totalMinutes) * 100;
            return html`
              <div
                class="segment ${seg.isHome ? "home" : "away"} ${seg.isUser ? "user" : ""}"
                style="left:${left}%;width:${width}%"
                title="${seg.temp}°C"
              ></div>
            `;
          })}
          <div class="now-marker" style="left:${nowPercent}%"></div>
        </div>
        <div class="labels">
          ${this.entries.map(
            (entry) => html`
              <span
                class="label"
                style="left:${(this._entryToMinutes(entry) / totalMinutes) * 100}%"
              >
                ${this._entryTimeLabel(entry)}
              </span>
            `
          )}
        </div>
      </div>
    `;
  }

  static styles = [
    tokens,
    css`
      .bar-container {
        position: relative;
        padding-bottom: 20px;
      }
      .bar {
        position: relative;
        height: var(--ha-space-6, 24px);
        border-radius: var(--ha-border-radius-sm, 4px);
        overflow: hidden;
        background: var(--divider-color, #e0e0e0);
      }
      .segment {
        position: absolute;
        top: 0;
        height: 100%;
      }
      .segment.home {
        background: var(--hearth-color-home, #039be5);
        opacity: 0.7;
      }
      .segment.away {
        background: var(--hearth-color-away, #9e9e9e);
        opacity: 0.4;
      }
      .segment.user {
        background-image: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 3px,
          rgba(255,255,255,0.3) 3px,
          rgba(255,255,255,0.3) 6px
        );
      }
      .now-marker {
        position: absolute;
        top: -2px;
        width: 2px;
        height: calc(var(--ha-space-6, 24px) + var(--ha-space-1, 4px));
        background: var(--hearth-color-now, #e91e63);
        z-index: 1;
      }
      .labels {
        position: relative;
        height: var(--ha-space-4, 16px);
        margin-top: 2px;
      }
      .label {
        position: absolute;
        font-size: var(--ha-font-size-xs, 10px);
        color: var(--secondary-text-color);
        transform: translateX(-50%);
      }
      .no-schedule {
        text-align: center;
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-s-m, 13px);
        padding: var(--ha-space-2, 8px);
      }
    `,
  ];
}

if (!customElements.get("schedule-bar")) {
  customElements.define("schedule-bar", ScheduleBar);
}
