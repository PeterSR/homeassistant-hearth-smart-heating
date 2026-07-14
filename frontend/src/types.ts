/**
 * TypeScript interfaces matching backend WebSocket payloads.
 */

export interface HomeAssistant {
  callWS: <T = any>(msg: Record<string, unknown>) => Promise<T>;
  connection: {
    subscribeMessage: <T>(
      callback: (msg: T) => void,
      params: Record<string, unknown>
    ) => Promise<() => void>;
  };
  states: Record<string, HassState>;
  language: string;
}

export interface HassState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
}

export interface PanelInfo {
  config: Record<string, any>;
  url_path: string;
  title: string;
}

export interface Route {
  path: string;
  prefix: string;
}

export interface DeviceDiagnostics {
  software_error: string | null;
  pi_heating_demand: number | null;
  setpoint_change_source: string | null;
  adaptation_run_status: string | null;
  preheat_status: string | null;
  preheat_time: string | null;
  motor_step_counter: number | null;
  linkquality: number | null;
  has_error: boolean;
  error_code: string | null;
}

export interface BoilerState {
  boiler_on: boolean;
  aggregate_demand: number;
  demand_per_device: Record<string, number>;
}

export interface DeviceState {
  entity_id: string;
  friendly_name: string;
  current_temp: number | null;
  target_temp: number | null;
  battery: number | null;
  adapter_type?: string;
  zigbee_backend?: string | null;
  covered?: boolean;
  feature_status?: Record<string, string>;
  diagnostics?: DeviceDiagnostics;
}

export interface NextTransition {
  time: string;
  temp: number;
}

export interface OverrideState {
  temp: number;
  until: string | null;
  created_at: string;
}

/** The effective state as computed by the backend. */
export type EffectiveState = "home" | "away" | "off" | "vacation";

export interface MaterializedEntry {
  time: string; // ISO datetime
  state: "home" | "away";
  source: "schedule" | "user";
}

export interface ScheduleEntry {
  time: string;
  temp: string; // "home" or "away"
}

export interface AreaGroupConfig {
  group_id: string;
  name: string;
  area_ids: string[];
  schedule_id: string | null;
  order: number;
}

export interface AreaState {
  area_id: string;
  name: string;
  group_id: string | null;
  current_temp: number | null;
  target_temp: number | null;
  effective_state: EffectiveState;
  schedule_state: "home" | "away" | null;
  following_schedule: boolean;
  enabled: boolean;
  override: OverrideState | null;
  next_transition: NextTransition | null;
  today_schedule: MaterializedEntry[];
  home_temp: number;
  away_temp: number;
  min_temp: number;
  max_temp: number;
  temperature_sensors: string[];
  schedule_id: string | null;
  climate_entities: string[];
  covered_entities: string[];
  window_sensors: string[];
  window_open: boolean | null;
  preheat: {
    active_until: string;
    transition_at?: string;
    upcoming_temp?: number;
    direction?: "warming" | "setback";
  } | null;
  devices: DeviceState[];
  device_count: number;
}

export interface ScheduleConfig {
  schedule_id: string;
  name: string;
  schedule: Record<string, ScheduleEntry[]>;
}

export interface GlobalState {
  vacation_mode: boolean;
  vacation_schedule_id: string | null;
  presence_entities: string[];
  auto_away_enabled: boolean;
  auto_away_delay_minutes: number;
  auto_away_active: boolean;
  boiler_entity: string | null;
  boiler_demand_threshold: number;
  boiler_state: BoilerState | null;
  default_home_temp: number;
  default_away_temp: number;
  default_min_temp: number;
  default_max_temp: number;
  low_battery_threshold: number;
  ungrouped_position: "top" | "bottom";
}

export interface HearthState {
  areas: Record<string, AreaState>;
  schedules: Record<string, ScheduleConfig>;
  groups: Record<string, AreaGroupConfig>;
  global: GlobalState;
}

/**
 * Toolbar portal - views dispatch this to project content into the panel toolbar.
 */
export interface ToolbarConfig {
  title: string;
  backPath?: string;
  actions?: unknown; // TemplateResult
}

export interface CommandLogEntry {
  timestamp: string;
  entity_id: string;
  command: string;
  success: boolean;
  detail: string;
  // Set on consecutive duplicates collapsed by the coordinator.
  repeat_count?: number;
  last_timestamp?: string;
}

export interface DiscoveredArea {
  area_id: string;
  area_name: string;
  climate_entities: string[];
  temperature_sensors: string[];
  already_configured: boolean;
}
