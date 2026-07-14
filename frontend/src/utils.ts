/**
 * Shared utility functions used across components.
 */
import type { AreaState, HearthState, EffectiveState, HomeAssistant } from "./types";

/** Format a temperature for display. */
export function formatTemp(temp: number | null, placeholder = "--"): string {
  if (temp === null) return placeholder;
  return `${temp.toFixed(1)}°`;
}

/** Format temperature with unit for detail views. */
export function formatTempWithUnit(temp: number | null): string {
  if (temp === null) return "--.-";
  return temp.toFixed(1);
}

/** Get the display name for an area. */
export function getAreaDisplayName(area: AreaState): string {
  if (area.name) return area.name;
  return area.area_id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

/** Format a next-transition for display. */
export function formatNextTransition(area: AreaState): string {
  if (!area.next_transition) return "";
  const dt = new Date(area.next_transition.time);
  const time = dt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${area.next_transition.temp.toFixed(0)}° at ${time}`;
}

/** Clamp and round a temperature value to valid range (0.5 steps). */
export function clampTemp(value: number, min: number, max: number): number {
  const rounded = Math.round(value * 2) / 2;
  return Math.max(min, Math.min(max, rounded));
}

/** Get temperature sensor entity IDs that belong to a given area or have no area. */
export function getAreaTemperatureSensors(hass: HomeAssistant, areaId: string): string[] {
  const entities = (hass as any).entities as Record<string, any> | undefined;
  const devices = (hass as any).devices as Record<string, any> | undefined;
  if (!entities) return [];

  return Object.values(entities)
    .filter((ent: any) => {
      if (!ent.entity_id?.startsWith("sensor.")) return false;
      const state = hass.states[ent.entity_id];
      if (state?.attributes?.device_class !== "temperature") return false;

      // Entity's own area
      if (ent.area_id === areaId) return true;
      // Device's area
      if (!ent.area_id && ent.device_id && devices) {
        const device = devices[ent.device_id];
        if (device?.area_id === areaId) return true;
      }
      // No area at all
      if (!ent.area_id && (!ent.device_id || !devices?.[ent.device_id]?.area_id)) return true;

      return false;
    })
    .map((ent: any) => ent.entity_id as string);
}

/** Get the appropriate battery icon for a given level. */
export function batteryIcon(level: number): string {
  if (level <= 5) return "mdi:battery-alert";
  if (level <= 15) return "mdi:battery-10";
  if (level <= 25) return "mdi:battery-20";
  if (level <= 35) return "mdi:battery-30";
  if (level <= 45) return "mdi:battery-40";
  if (level <= 55) return "mdi:battery-50";
  if (level <= 65) return "mdi:battery-60";
  if (level <= 75) return "mdi:battery-70";
  if (level <= 85) return "mdi:battery-80";
  if (level <= 95) return "mdi:battery-90";
  return "mdi:battery";
}

/** Get devices with low battery across all areas. */
export function getLowBatteryDevices(
  hearthState: HearthState,
  threshold: number
): Array<{ entity_id: string; area_name: string; battery: number }> {
  const result: Array<{ entity_id: string; area_name: string; battery: number }> = [];
  for (const area of Object.values(hearthState.areas)) {
    for (const device of area.devices) {
      if (device.battery !== null && device.battery <= threshold) {
        result.push({
          entity_id: device.entity_id,
          area_name: area.name,
          battery: device.battery,
        });
      }
    }
  }
  return result;
}

// --- Async helpers ---

/**
 * Debounced action: accumulates rapid calls and only fires the last one
 * after `ms` milliseconds of silence.
 */
export class Debouncer<T> {
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private _pending: T | undefined;

  constructor(
    private _action: (value: T) => void | Promise<void>,
    private _ms: number,
  ) {}

  /** Schedule the action with a new value. Resets the timer. */
  call(value: T): void {
    this._pending = value;
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this._timer = null;
      this._action(this._pending!);
    }, this._ms);
  }

  /** Cancel any pending action. */
  cancel(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** Flush: fire the pending action immediately if one exists. */
  flush(): void {
    if (this._timer && this._pending !== undefined) {
      clearTimeout(this._timer);
      this._timer = null;
      this._action(this._pending);
    }
  }
}

/**
 * Tracks an optimistic value alongside an in-flight save counter.
 * Use `get()` to read (returns optimistic if saves pending, else serverValue).
 * Call `set()` before each save, `resolve()` after each save completes.
 * When all saves resolve, optimistic state clears automatically.
 */
export class OptimisticState<T> {
  private _value: T | null = null;
  private _pending = 0;

  /** Read the current best value: optimistic if saves in-flight, else server. */
  get(serverValue: T): T {
    return this._pending > 0 && this._value !== null ? this._value : serverValue;
  }

  /** Set the optimistic value and increment the pending counter. */
  set(value: T): void {
    this._value = value;
    this._pending++;
  }

  /** Decrement pending counter. Clears optimistic value when all saves resolve. */
  resolve(): void {
    this._pending = Math.max(0, this._pending - 1);
    if (this._pending === 0) this._value = null;
  }

  /** Whether any saves are still in-flight. */
  get isPending(): boolean {
    return this._pending > 0;
  }

  /** Reset all state. */
  clear(): void {
    this._value = null;
    this._pending = 0;
  }
}

/** Derive a global state from all areas. Returns null if areas disagree. */
export function getGlobalState(hearthState: HearthState): EffectiveState | null {
  if (hearthState.global.vacation_mode) return "vacation";

  const areas = Object.values(hearthState.areas);
  if (areas.length === 0) return null;

  const enabledAreas = areas.filter((a) => a.enabled);
  if (enabledAreas.length === 0) return "off";

  const first = enabledAreas[0].effective_state;
  const allSame = enabledAreas.every((a) => a.effective_state === first);
  return allSame ? first : null;
}
