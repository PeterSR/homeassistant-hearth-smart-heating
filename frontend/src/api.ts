import type {
  HearthState,
  CommandLogEntry,
  DiscoveredArea,
  EffectiveState,
  HomeAssistant,
  ScheduleEntry,
} from "./types";

export class HearthApi {
  constructor(private hass: HomeAssistant) {}

  async getConfig(): Promise<any> {
    return this.hass.callWS({ type: "hearth/get_config" });
  }

  async getState(): Promise<HearthState> {
    return this.hass.callWS({ type: "hearth/get_state" });
  }

  async discoverAreas(): Promise<DiscoveredArea[]> {
    const result = await this.hass.callWS<{ discovered: DiscoveredArea[] }>({
      type: "hearth/discover_areas",
    });
    return result.discovered;
  }

  async addArea(params: {
    area_id: string;
    climate_entities: string[];
    temperature_sensors?: string[];
    covered_entities?: string[];
    window_sensors?: string[];
    home_temp?: number;
    away_temp?: number;
    schedule_id?: string;
  }): Promise<any> {
    return this.hass.callWS({ type: "hearth/add_area", ...params });
  }

  async updateArea(
    area_id: string,
    updates: Record<string, unknown>
  ): Promise<any> {
    return this.hass.callWS({
      type: "hearth/update_area",
      area_id,
      ...updates,
    });
  }

  async removeArea(area_id: string): Promise<void> {
    await this.hass.callWS({ type: "hearth/remove_area", area_id });
  }

  async setOverride(
    area_id: string,
    temperature: number,
    until?: string
  ): Promise<any> {
    return this.hass.callWS({
      type: "hearth/set_override",
      area_id,
      temperature,
      ...(until !== undefined ? { until } : {}),
    });
  }

  async clearOverride(area_id: string): Promise<void> {
    await this.hass.callWS({ type: "hearth/clear_override", area_id });
  }

  async setAreaState(area_id: string, state: "home" | "away"): Promise<any> {
    return this.hass.callWS({
      type: "hearth/set_area_state",
      area_id,
      state,
    });
  }

  async setAreaEnabled(area_id: string, enabled: boolean): Promise<any> {
    return this.hass.callWS({
      type: "hearth/set_area_enabled",
      area_id,
      enabled,
    });
  }

  async resumeSchedule(area_id: string): Promise<any> {
    return this.hass.callWS({
      type: "hearth/resume_schedule",
      area_id,
    });
  }

  async syncSchedule(area_id: string): Promise<any> {
    return this.hass.callWS({
      type: "hearth/sync_schedule",
      area_id,
    });
  }

  async setVacation(enabled: boolean, scheduleId?: string): Promise<any> {
    return this.hass.callWS({
      type: "hearth/set_vacation",
      enabled,
      ...(scheduleId !== undefined ? { schedule_id: scheduleId } : {}),
    });
  }

  async addSchedule(params: {
    schedule_id: string;
    name: string;
    schedule?: Record<string, ScheduleEntry[]>;
    area_ids?: string[];
  }): Promise<any> {
    return this.hass.callWS({
      type: "hearth/add_schedule",
      ...params,
    });
  }

  async updateSchedule(
    schedule_id: string,
    updates: Record<string, unknown>
  ): Promise<any> {
    return this.hass.callWS({
      type: "hearth/update_schedule",
      schedule_id,
      ...updates,
    });
  }

  async removeSchedule(schedule_id: string): Promise<void> {
    await this.hass.callWS({
      type: "hearth/remove_schedule",
      schedule_id,
    });
  }

  async duplicateSchedule(params: {
    source_schedule_id: string;
    new_schedule_id: string;
    new_name: string;
    area_id?: string;
  }): Promise<any> {
    return this.hass.callWS({
      type: "hearth/duplicate_schedule",
      ...params,
    });
  }

  // --- Groups ---

  async addGroup(params: {
    group_id: string;
    name: string;
    schedule_id?: string | null;
    area_ids?: string[];
    order?: number;
  }): Promise<any> {
    return this.hass.callWS({ type: "hearth/add_group", ...params });
  }

  async updateGroup(group_id: string, updates: Record<string, unknown>): Promise<any> {
    return this.hass.callWS({ type: "hearth/update_group", group_id, ...updates });
  }

  async removeGroup(group_id: string): Promise<void> {
    await this.hass.callWS({ type: "hearth/remove_group", group_id });
  }

  async reorderGroups(group_ids: string[]): Promise<void> {
    await this.hass.callWS({ type: "hearth/reorder_groups", group_ids });
  }

  // --- Global Config ---

  async updateGlobalConfig(updates: Record<string, unknown>): Promise<any> {
    return this.hass.callWS({
      type: "hearth/update_global_config",
      ...updates,
    });
  }

  async getDiagnostics(): Promise<any> {
    return this.hass.callWS({ type: "hearth/get_diagnostics" });
  }

  async deviceAction(entity_id: string, action: string): Promise<any> {
    return this.hass.callWS({
      type: "hearth/device_action",
      entity_id,
      action,
    });
  }

  async getCommandLog(filter?: { entityId?: string; areaId?: string }): Promise<{ log: CommandLogEntry[] }> {
    return this.hass.callWS({
      type: "hearth/get_command_log",
      ...(filter?.entityId ? { entity_id: filter.entityId } : {}),
      ...(filter?.areaId ? { area_id: filter.areaId } : {}),
    });
  }

  subscribe(callback: (state: HearthState) => void): Promise<() => void> {
    return this.hass.connection.subscribeMessage(callback, {
      type: "hearth/subscribe",
    });
  }
}
