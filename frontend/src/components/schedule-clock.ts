import { LitElement, html, svg, css, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { ScheduleEntry } from "../types";

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = 120;
const INNER_R = 80;
const LABEL_R = 138;
const HANDLE_R = (OUTER_R + INNER_R) / 2;
const HANDLE_SIZE = 10;
const MIN_SEGMENT_MINS = 30;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function minutesToAngle(mins: number): number {
  return (mins / 1440) * 360 - 90;
}
function angleToMinutes(angleDeg: number): number {
  return (((angleDeg + 90) % 360 + 360) % 360 / 360) * 1440;
}
function polarToXY(angleDeg: number, r: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}
function snapTo30(mins: number): number {
  return Math.round(mins / 30) * 30;
}

function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number): string {
  let sweep = endAngle - startAngle;
  if (sweep <= 0) sweep += 360;
  if (sweep >= 360) return fullRingPath(outerR, innerR);
  const largeArc = sweep > 180 ? 1 : 0;
  const [ox1, oy1] = polarToXY(startAngle, outerR);
  const [ox2, oy2] = polarToXY(endAngle, outerR);
  const [ix1, iy1] = polarToXY(endAngle, innerR);
  const [ix2, iy2] = polarToXY(startAngle, innerR);
  return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;
}
function fullRingPath(outerR: number, innerR: number): string {
  return `M ${CX-outerR} ${CY} A ${outerR} ${outerR} 0 1 1 ${CX+outerR} ${CY} A ${outerR} ${outerR} 0 1 1 ${CX-outerR} ${CY} M ${CX-innerR} ${CY} A ${innerR} ${innerR} 0 1 0 ${CX+innerR} ${CY} A ${innerR} ${innerR} 0 1 0 ${CX-innerR} ${CY} Z`;
}
function pointerToMinutes(e: PointerEvent, svgEl: SVGSVGElement): number {
  const rect = svgEl.getBoundingClientRect();
  const x = (e.clientX - rect.left) * SIZE / rect.width - CX;
  const y = (e.clientY - rect.top) * SIZE / rect.height - CY;
  return snapTo30(angleToMinutes((Math.atan2(y, x) * 180) / Math.PI)) % 1440;
}

interface Seg {
  startMins: number; endMins: number; duration: number;
  temp: string | number; entryIndex: number; nextEntryIndex: number; isFullCircle: boolean;
}

@customElement("schedule-clock")
export class ScheduleClock extends LitElement {
  @property({ attribute: false }) entries: ScheduleEntry[] = [];

  @state() private _pendingEntries: ScheduleEntry[] | null = null;
  @state() private _handleDrag: { index: number; mins: number } | null = null;
  @state() private _segDrag: {
    startIdx: number; endIdx: number; startMins: number; delta: number;
    maxForward: number; maxBackward: number;
  } | null = null;
  @state() private _selectedSeg: number | null = null;
  @state() private _tapMins: number | null = null; // where the tap landed (for split)
  @state() private _hoverMins: number | null = null;

  private _svgRef: SVGSVGElement | null = null;

  willUpdate(changed: PropertyValues): void {
    if (changed.has("entries") && this._pendingEntries) {
      this._pendingEntries = null;
    }
  }

  private _getSvg(): SVGSVGElement | null {
    return this._svgRef ?? (this._svgRef = this.renderRoot.querySelector("svg"));
  }
  private _base(): ScheduleEntry[] { return this._pendingEntries ?? this.entries; }

  private _getEntries(): ScheduleEntry[] {
    const base = this._base();
    if (this._handleDrag) {
      return base.map((e, i) =>
        i === this._handleDrag!.index ? { ...e, time: minutesToTime(this._handleDrag!.mins) } : e
      );
    }
    if (this._segDrag && this._segDrag.delta !== 0) {
      const { startIdx, endIdx, delta } = this._segDrag;
      return base.map((e, i) => {
        if (i === startIdx || (i === endIdx && endIdx !== startIdx))
          return { ...e, time: minutesToTime((timeToMinutes(e.time) + delta + 1440) % 1440) };
        return e;
      });
    }
    return base;
  }

  private _getSegments(entries?: ScheduleEntry[]): Seg[] {
    const ents = entries ?? this._getEntries();
    if (ents.length === 0)
      return [{ startMins: 0, endMins: 1440, duration: 1440, temp: "home", entryIndex: -1, nextEntryIndex: -1, isFullCircle: true }];
    const sorted = ents.map((e, i) => ({ ...e, originalIndex: i, mins: timeToMinutes(e.time) })).sort((a, b) => a.mins - b.mins);
    if (sorted.length === 1)
      return [{ startMins: 0, endMins: 1440, duration: 1440, temp: sorted[0].temp, entryIndex: sorted[0].originalIndex, nextEntryIndex: sorted[0].originalIndex, isFullCircle: true }];
    return sorted.map((entry, i) => {
      const next = sorted[(i + 1) % sorted.length];
      let endMins = next.mins; if (endMins <= entry.mins) endMins += 1440;
      return { startMins: entry.mins, endMins, duration: endMins - entry.mins, temp: entry.temp, entryIndex: entry.originalIndex, nextEntryIndex: next.originalIndex, isFullCircle: false };
    });
  }

  private _getColor(temp: string | number): string {
    if (temp === "home") return "var(--hearth-color-home, #039be5)";
    if (temp === "away") return "var(--hearth-color-away, #9e9e9e)";
    return "var(--hearth-color-manual, #ff5722)";
  }

  /** Find the drag limits for a handle - can't cross its neighbors */
  private _handleLimits(index: number): { min: number; max: number } {
    const baseSegs = this._getSegments(this._base());
    // Find which segments this handle borders
    // The handle at entry[index] is the START of one segment and the END of the previous
    const segStarting = baseSegs.find(s => s.entryIndex === index);
    const segEnding = baseSegs.find(s => s.nextEntryIndex === index);
    if (!segStarting || !segEnding || baseSegs.length < 2) return { min: 0, max: 1440 };

    // Can't move into the previous segment's start + MIN
    const prevStart = segEnding.startMins;
    const minMins = (prevStart + MIN_SEGMENT_MINS) % 1440;
    // Can't move into the next segment's end - MIN
    const nextEnd = segStarting.endMins;
    const maxMins = ((nextEnd - MIN_SEGMENT_MINS) % 1440 + 1440) % 1440;
    return { min: minMins, max: maxMins };
  }

  // --- Segment pointer: tap selects, drag moves ---

  private _onSegmentPointerDown(seg: Seg, e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const svgEl = this._getSvg();
    if (!svgEl) return;
    const startMins = pointerToMinutes(e, svgEl);

    if (seg.isFullCircle && this._base().length <= 1) {
      this._selectedSeg = seg.entryIndex;
      this._tapMins = startMins;
      return;
    }

    const baseSegments = this._getSegments(this._base());
    const segIdx = baseSegments.findIndex(s => s.entryIndex === seg.entryIndex);
    let maxForward = 1440, maxBackward = 1440;
    if (segIdx >= 0 && baseSegments.length >= 2) {
      const nextSeg = baseSegments[(segIdx + 1) % baseSegments.length];
      const prevSeg = baseSegments[(segIdx - 1 + baseSegments.length) % baseSegments.length];
      maxForward = Math.max(0, nextSeg.duration - MIN_SEGMENT_MINS);
      maxBackward = Math.max(0, prevSeg.duration - MIN_SEGMENT_MINS);
    }

    this._segDrag = { startIdx: seg.entryIndex, endIdx: seg.nextEntryIndex, startMins, delta: 0, maxForward, maxBackward };

    const onMove = (ev: PointerEvent) => {
      if (!this._segDrag) return;
      const svgEl = this._getSvg(); if (!svgEl) return;
      let delta = pointerToMinutes(ev, svgEl) - this._segDrag.startMins;
      if (delta > 720) delta -= 1440; if (delta < -720) delta += 1440;
      delta = Math.round(delta / 30) * 30;
      delta = Math.max(-this._segDrag.maxBackward, Math.min(this._segDrag.maxForward, delta));
      this._segDrag = { ...this._segDrag, delta };
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (Math.abs(this._segDrag?.delta ?? 0) < 15) {
        this._segDrag = null;
        this._selectedSeg = seg.entryIndex;
        this._tapMins = startMins;
      } else {
        this._commitSegmentDrag();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private _commitSegmentDrag(): void {
    if (!this._segDrag || this._segDrag.delta === 0) { this._segDrag = null; return; }
    const updated = this._getEntries();
    this._segDrag = null;
    this._pendingEntries = updated;
    this._dispatchChange(updated);
  }

  // --- Handle drag with constraints ---

  private _onHandlePointerDown(index: number, e: PointerEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this._selectedSeg = null;
    this._tapMins = null;
    this._handleDrag = { index, mins: timeToMinutes(this._base()[index].time) };

    const limits = this._handleLimits(index);

    const onMove = (ev: PointerEvent) => {
      if (!this._handleDrag) return;
      const svgEl = this._getSvg(); if (!svgEl) return;
      let mins = pointerToMinutes(ev, svgEl);
      // Constrain: keep within limits
      // This is circular so we need to check carefully
      const { min, max } = limits;
      if (min <= max) {
        mins = Math.max(min, Math.min(max, mins));
      } else {
        // Wraps around midnight
        if (mins < min && mins > max) {
          mins = (min - mins < mins - max) ? min : max;
        }
      }
      this._handleDrag = { ...this._handleDrag, mins };
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this._commitHandleDrag();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  private _commitHandleDrag(): void {
    if (!this._handleDrag) return;
    const updated = this._getEntries();
    this._handleDrag = null;
    this._pendingEntries = updated;
    this._dispatchChange(updated);
  }

  // --- Hover (mouse only, snap line) ---

  private _onSvgPointerMove(e: PointerEvent): void {
    if (e.pointerType !== "mouse" || this._segDrag || this._handleDrag) {
      this._hoverMins = null; return;
    }
    const svgEl = this._getSvg(); if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * SIZE / rect.width - CX;
    const y = (e.clientY - rect.top) * SIZE / rect.height - CY;
    const dist = Math.sqrt(x * x + y * y);
    if (dist < INNER_R - 15 || dist > OUTER_R + 15) { this._hoverMins = null; return; }
    this._hoverMins = pointerToMinutes(e, svgEl);
  }

  private _onSvgPointerLeave(): void { this._hoverMins = null; }

  // --- Actions ---

  private _splitSelected(): void {
    if (this._selectedSeg === null) return;
    const segments = this._getSegments();
    const seg = segments.find(s => s.entryIndex === this._selectedSeg);
    if (!seg) return;

    // Use tap position if available and within the segment, otherwise midpoint
    let splitMins: number;
    if (this._tapMins !== null) {
      const d = ((this._tapMins - seg.startMins) % 1440 + 1440) % 1440;
      if (d < seg.duration || seg.isFullCircle) {
        splitMins = this._tapMins;
      } else {
        splitMins = snapTo30((seg.startMins + seg.duration / 2) % 1440);
      }
    } else {
      splitMins = snapTo30((seg.startMins + seg.duration / 2) % 1440);
    }

    const base = this._base();
    const origTemp = seg.entryIndex >= 0 ? base[seg.entryIndex].temp : "home";
    const oppositeTemp = origTemp === "home" ? "away" : "home";
    const endMins = (splitMins + MIN_SEGMENT_MINS) % 1440;
    const raw = [
      ...base,
      { time: minutesToTime(splitMins), temp: oppositeTemp },
      { time: minutesToTime(endMins), temp: origTemp as string },
    ];
    const result = this._mergeConsecutive(raw);
    this._pendingEntries = result;
    this._selectedSeg = null;
    this._tapMins = null;
    this._dispatchChange(result);
  }

  private _changeSelected(): void {
    if (this._selectedSeg === null) return;
    const base = this._base();
    const idx = this._selectedSeg;
    if (idx < 0 || idx >= base.length) return;
    const newTemp = base[idx].temp === "home" ? "away" : "home";
    const updated = base.map((e, i) => (i === idx ? { ...e, temp: newTemp } : e));
    const result = this._mergeConsecutive(updated);
    this._pendingEntries = result;
    this._selectedSeg = null;
    this._tapMins = null;
    this._dispatchChange(result);
  }

  private _deleteSelected(): void {
    if (this._selectedSeg === null) return;
    this.removeTransition(this._selectedSeg);
    this._selectedSeg = null;
    this._tapMins = null;
  }

  public removeTransition(index: number): void {
    const base = this._base();
    if (base.length <= 1) return;
    const filtered = base.filter((_, i) => i !== index);
    const result = this._mergeConsecutive(filtered);
    this._pendingEntries = result;
    this._dispatchChange(result);
  }

  /** Sort and merge consecutive same-type entries. */
  private _mergeConsecutive(entries: ScheduleEntry[]): ScheduleEntry[] {
    const sorted = [...entries].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const merged: ScheduleEntry[] = [];
    for (const e of sorted) {
      if (merged.length > 0 && merged[merged.length - 1].temp === e.temp) continue;
      merged.push(e);
    }
    if (merged.length > 1 && merged[0].temp === merged[merged.length - 1].temp) merged.shift();
    return merged.length > 0 ? merged : [{ time: "00:00", temp: "home" }];
  }

  private _dispatchChange(entries: ScheduleEntry[]): void {
    this.dispatchEvent(new CustomEvent("entries-changed", { detail: { entries }, bubbles: true, composed: true }));
  }

  private _deselectIfOutside(e: PointerEvent): void {
    const svgEl = this._getSvg(); if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const x = (e.clientX - rect.left) * SIZE / rect.width - CX;
    const y = (e.clientY - rect.top) * SIZE / rect.height - CY;
    if (Math.sqrt(x * x + y * y) < INNER_R) { this._selectedSeg = null; this._tapMins = null; }
  }

  // --- Render ---

  render() {
    const segments = this._getSegments();
    const entries = this._getEntries();
    const isDragging = this._segDrag !== null || this._handleDrag !== null;
    const hasSelection = this._selectedSeg !== null;
    const canDelete = hasSelection && this._base().length > 1;

    return html`
      <svg viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg"
        class="${isDragging ? "dragging" : ""}"
        @pointermove=${(e: PointerEvent) => this._onSvgPointerMove(e)}
        @pointerleave=${() => this._onSvgPointerLeave()}
        @pointerdown=${(e: PointerEvent) => this._deselectIfOutside(e)}>

        <circle cx="${CX}" cy="${CY}" r="${OUTER_R}" fill="var(--card-background-color, #fff)" stroke="var(--divider-color, #e0e0e0)" stroke-width="1" />
        <circle cx="${CX}" cy="${CY}" r="${INNER_R}" fill="var(--primary-background-color, #fafafa)" stroke="var(--divider-color, #e0e0e0)" stroke-width="1" />

        ${segments.map(seg => svg`
          <path d="${arcPath(minutesToAngle(seg.startMins), minutesToAngle(seg.endMins), OUTER_R, INNER_R)}"
            fill="${this._getColor(seg.temp)}" fill-rule="evenodd"
            class="segment ${this._selectedSeg === seg.entryIndex ? "selected" : ""}"
            @pointerdown=${(e: PointerEvent) => this._onSegmentPointerDown(seg, e)} />
        `)}

        ${[0, 3, 6, 9, 12, 15, 18, 21].map(h => {
          const [x, y] = polarToXY(minutesToAngle(h * 60), LABEL_R);
          return svg`<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" class="hour-label">${h}</text>`;
        })}
        ${Array.from({ length: 24 }, (_, h) => {
          const a = minutesToAngle(h * 60);
          const [x1, y1] = polarToXY(a, OUTER_R);
          const [x2, y2] = polarToXY(a, OUTER_R + 4);
          return svg`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--secondary-text-color, #999)" stroke-width="${h % 3 === 0 ? 1.5 : 0.5}" />`;
        })}

        ${this._renderNowIndicator()}

        ${entries.map((entry, i) => {
          const [x, y] = polarToXY(minutesToAngle(timeToMinutes(entry.time)), HANDLE_R);
          return svg`
            <circle cx="${x}" cy="${y}" r="${HANDLE_SIZE}" class="handle"
              @pointerdown=${(e: PointerEvent) => this._onHandlePointerDown(i, e)} />
            <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
              class="handle-label" style="pointer-events:none">${entry.time}</text>
          `;
        })}

        <!-- Hover/tap snap line -->
        ${(this._hoverMins !== null || this._tapMins !== null) && !isDragging ? (() => {
          const mins = this._hoverMins ?? this._tapMins!;
          const a = minutesToAngle(mins);
          const [x1, y1] = polarToXY(a, INNER_R);
          const [x2, y2] = polarToXY(a, OUTER_R);
          return svg`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
            stroke="var(--primary-text-color, #333)" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"
            style="pointer-events:none" />`;
        })() : nothing}

        <text x="${CX}" y="${CY}" text-anchor="middle" dominant-baseline="central" class="center-label">24h</text>
      </svg>

      <!-- Action buttons - fixed height area to prevent layout jump -->
      <div class="action-bar">
        ${hasSelection ? html`
          <button class="action-btn" @click=${() => this._splitSelected()}>
            <ha-icon icon="mdi:content-cut"></ha-icon> Split
          </button>
          <button class="action-btn" @click=${() => this._changeSelected()}>
            <ha-icon icon="mdi:swap-horizontal"></ha-icon> Change
          </button>
          ${canDelete ? html`
            <button class="action-btn delete" @click=${() => this._deleteSelected()}>
              <ha-icon icon="mdi:delete"></ha-icon> Delete
            </button>
          ` : nothing}
        ` : nothing}
      </div>

      <div class="hint">Tap segment to select · Drag to move</div>
    `;
  }

  private _renderNowIndicator() {
    const now = new Date();
    const angle = minutesToAngle(now.getHours() * 60 + now.getMinutes());
    const [x1, y1] = polarToXY(angle, INNER_R - 5);
    const [x2, y2] = polarToXY(angle, OUTER_R + 2);
    return svg`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--hearth-color-now, #e91e63)" stroke-width="2" stroke-linecap="round" />`;
  }

  static styles = css`
    :host { display: block; max-width: 320px; margin: 0 auto; touch-action: none; }
    svg { width: 100%; height: auto; user-select: none; }
    svg.dragging { cursor: grabbing; }
    .segment { cursor: grab; transition: opacity 0.15s; }
    .segment:hover { opacity: 0.85; }
    .segment.selected { stroke: var(--primary-text-color, #333); stroke-width: 2; }
    .hour-label { font-size: 11px; fill: var(--secondary-text-color, #666); font-family: var(--ha-font-family-body, Roboto, sans-serif); pointer-events: none; }
    .handle { fill: var(--primary-background-color, white); stroke: var(--primary-text-color, #333); stroke-width: 2; cursor: grab; touch-action: none; }
    .handle:hover { fill: var(--primary-color, #03a9f4); stroke: var(--primary-color, #03a9f4); }
    .handle-label { font-size: 7px; fill: var(--primary-text-color, #333); font-family: var(--ha-font-family-body, Roboto, sans-serif); font-weight: 500; }
    .center-label { font-size: 14px; fill: var(--secondary-text-color, #999); font-family: var(--ha-font-family-body, Roboto, sans-serif); pointer-events: none; }
    .action-bar {
      display: flex; justify-content: center; gap: var(--ha-space-2, 8px);
      margin-top: var(--ha-space-2, 8px);
      min-height: 40px; align-items: center;
    }
    .action-btn {
      display: flex; align-items: center; gap: var(--ha-space-1, 4px);
      padding: var(--ha-space-1, 4px) var(--ha-space-3, 12px);
      border: 1px solid var(--divider-color, #e0e0e0);
      border-radius: var(--ha-border-radius-md, 8px);
      background: var(--card-background-color, white);
      color: var(--primary-text-color); font-family: inherit;
      font-size: var(--ha-font-size-s, 12px); cursor: pointer;
    }
    .action-btn:hover { background: var(--secondary-background-color, #f5f5f5); }
    .action-btn.delete { color: var(--error-color, #db4437); border-color: var(--error-color, #db4437); }
    .action-btn.delete:hover { background: var(--error-color, #db4437); color: white; }
    .hint {
      text-align: center; font-size: var(--ha-font-size-s, 12px);
      color: var(--secondary-text-color); margin-top: var(--ha-space-1, 4px);
    }
  `;
}
