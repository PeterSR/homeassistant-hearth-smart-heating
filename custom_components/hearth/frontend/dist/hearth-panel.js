const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/core-BrVw2LCo.js","assets/Axis-r61YvV2N.js","assets/graphic-DgPervEb.js","assets/createSeriesData-BS3ONHiF.js","assets/charts-lpQQN2Ks.js","assets/customGraphicKeyframeAnimation-CXbdssPk.js","assets/components-D_JDMQgr.js","assets/renderers-BUy3EJql.js"])))=>i.map(i=>d[i]);
import{t as k,v as R,g as Ne,e as Me,m as we,d as ve,i as y,n as h,r as p,a as x,b as Ae,A as l,c as o,f as Fe,h as Pe,j as Ve,s as Be,k as Ce,D as Ge,l as pe,o as He,p as Le,w as le,O as Re,q as Ue,u as de,H as We}from"./assets/utils-enLgS1ZL.js";import"./assets/area-card-h4w293EW.js";import"./assets/schedule-bar-m_-MfrZE.js";/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const w=e=>(t,a)=>{a!==void 0?a.addInitializer(()=>{customElements.define(e,t)}):customElements.define(e,t)};var qe=Object.defineProperty,Ye=Object.getOwnPropertyDescriptor,ne=(e,t,a,s)=>{for(var i=s>1?void 0:s?Ye(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&qe(t,a,i),i};let Y=class extends x{constructor(){super(...arguments),this.narrow=!1,this._showVacationPicker=!1,this._menuOpen=!1}connectedCallback(){super.connectedCallback(),this._updateToolbar()}willUpdate(e){e.has("hearthState")&&this._updateToolbar()}_updateToolbar(){const e=this.hearthState?Ae(this.hearthState):null;this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:"Hearth",actions:o`
            ${e?o`<span class="mode-badge ${e}">${e}</span>`:l}
            <ha-icon-button
              .label=${"Menu"}
              @click=${()=>this._menuOpen=!this._menuOpen}
            >
              <ha-icon icon="mdi:dots-vertical"></ha-icon>
            </ha-icon-button>
          `},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}async _handleHomeAll(){this._menuOpen=!1,await this.api.setVacation(!1);for(const e of Object.keys(this.hearthState.areas))await this.api.setAreaState(e,"home")}async _handleAwayAll(){this._menuOpen=!1;for(const e of Object.keys(this.hearthState.areas))await this.api.setAreaState(e,"away")}async _handleVacationToggle(){if(this._menuOpen=!1,this.hearthState.global.vacation_mode){await this.api.setVacation(!1);return}const t=this.hearthState.global.vacation_schedule_id;t&&this.hearthState.schedules[t]?await this.api.setVacation(!0):this._showVacationPicker=!0}async _activateVacationWithSchedule(e){this._showVacationPicker=!1,await this.api.setVacation(!0,e)}_handleAddArea(){if(Object.keys(this.hearthState.schedules).length===0){this._navigate("/schedules");return}this.dispatchEvent(new CustomEvent("add-area",{bubbles:!0,composed:!0}))}_getVacationScheduleName(){const e=this.hearthState.global.vacation_schedule_id;if(!e)return"";const t=this.hearthState.schedules[e];return(t==null?void 0:t.name)??e}_getGroupState(e){const t=e.map(s=>this.hearthState.areas[s]).filter(s=>s&&s.enabled);if(t.length===0)return null;const a=t[0].effective_state;return t.every(s=>s.effective_state===a)?a:null}_renderAreaCard(e,t){return o`
      <area-card
        .hass=${this.hass}
        .area=${e}
        .hideStateBadge=${t}
        @click=${()=>this._navigate(`/area/${e.area_id}`)}
      ></area-card>
    `}render(){const e=Object.values(this.hearthState.areas),t=this.hearthState.global.vacation_mode,a=Ae(this.hearthState),s=Fe(this.hearthState,this.hearthState.global.low_battery_threshold),i=Object.values(this.hearthState.groups??{}).sort((d,u)=>d.order-u.order),r=new Set;for(const d of i)for(const u of d.area_ids)r.add(u);const n=e.filter(d=>!r.has(d.area_id)),c=i.length>0;return o`
      <div class="container">
        ${s.length>0?o`<ha-alert class="battery-banner" alert-type="warning">
              Low battery: ${s.map(d=>`${d.area_name} (${d.battery}%)`).join(", ")}
            </ha-alert>`:l}
        ${t?o`<ha-alert class="vacation-banner" alert-type="warning" dismissable
              @alert-dismissed-clicked=${this._handleVacationToggle}>
              Vacation mode: following "${this._getVacationScheduleName()}"
            </ha-alert>`:l}
        ${this.hearthState.global.auto_away_active?o`<ha-alert class="auto-away-banner" alert-type="info">
              Auto-away is active: presence not detected
            </ha-alert>`:l}
        ${e.length===0?o`
              <div class="empty-state">
                ${Object.keys(this.hearthState.schedules).length===0?o`
                      <h2>No areas configured</h2>
                      <p>Before adding your first area, you need to create a schedule. Areas follow schedules to know when to heat.</p>
                      <ha-button @click=${()=>this._navigate("/schedules")}>
                        <ha-icon icon="mdi:calendar-clock" slot="icon"></ha-icon>
                        Create a Schedule
                      </ha-button>
                    `:o`
                      <h2>No areas configured</h2>
                      <p>Add your first area to get started.</p>
                      <ha-button @click=${this._handleAddArea}>
                        <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                        Add Area
                      </ha-button>
                    `}
              </div>
            `:(()=>{const d=n.map(m=>m.area_id),u=c?this._getGroupState(d):null,_=this.hearthState.global.ungrouped_position!=="bottom",g=n.length>0?o`
                    <div class="group-section">
                      ${c?o`
                            <div class="group-header ungrouped">
                              <span class="group-name">Ungrouped</span>
                              ${u&&!a?o`<span class="mode-badge ${u}">${u}</span>`:l}
                            </div>
                          `:l}
                      <div class="card-grid">
                        ${n.map(m=>this._renderAreaCard(m,a!==null||c&&u!==null))}
                      </div>
                    </div>
                  `:l,v=i.map(m=>{var J;const f=m.area_ids.map(q=>this.hearthState.areas[q]).filter(Boolean);if(f.length===0)return l;const b=a===null?this._getGroupState(m.area_ids):null,ue=m.schedule_id?(J=this.hearthState.schedules[m.schedule_id])==null?void 0:J.name:null;return o`
                  <div class="group-section">
                    <div
                      class="group-header"
                      @click=${()=>this._navigate(`/group/${m.group_id}/settings`)}
                    >
                      <span class="group-name">${m.name}</span>
                      ${b&&!a?o`<span class="mode-badge ${b}">${b}</span>`:l}
                      ${ue?o`<span class="group-schedule">${ue}</span>`:l}
                      <ha-icon icon="mdi:chevron-right" class="group-chevron"></ha-icon>
                    </div>
                    <div class="card-grid">
                      ${f.map(q=>this._renderAreaCard(q,a!==null||b!==null))}
                    </div>
                  </div>
                `});return _?o`${g}${v}`:o`${v}${g}`})()}
      </div>

      ${this._showVacationPicker?o`
            <div class="dialog-overlay" @click=${()=>this._showVacationPicker=!1}>
              <ha-card class="dialog-card" @click=${d=>d.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Vacation Schedule</h2>
                  <ha-icon-button .label=${"Close"} @click=${()=>this._showVacationPicker=!1}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <p>Choose which schedule to follow during vacation:</p>
                  <div class="vacation-schedule-list">
                    ${Object.values(this.hearthState.schedules).map(d=>o`
                        <ha-button
                          class="vacation-schedule-btn"
                          @click=${()=>this._activateVacationWithSchedule(d.schedule_id)}
                        >
                          <ha-icon icon="mdi:calendar-clock" slot="icon"></ha-icon>
                          ${d.name}
                        </ha-button>
                      `)}
                  </div>
                </div>
              </ha-card>
            </div>
          `:l}

      ${this._menuOpen?o`
            <div class="menu-backdrop" @click=${()=>this._menuOpen=!1}></div>
            <div class="toolbar-menu">
              <button class="menu-item" @click=${this._handleHomeAll}>
                <ha-icon icon="mdi:home"></ha-icon> Home All
              </button>
              <button class="menu-item" @click=${this._handleAwayAll}>
                <ha-icon icon="mdi:exit-run"></ha-icon> Away All
              </button>
              <button class="menu-item" @click=${this._handleVacationToggle}>
                <ha-icon icon="mdi:beach"></ha-icon>
                ${t?"Vacation Off":"Vacation On"}
              </button>
              <div class="menu-divider"></div>
              <button class="menu-item" @click=${()=>{this._menuOpen=!1,this._navigate("/schedules")}}>
                <ha-icon icon="mdi:calendar-clock"></ha-icon> Schedules
              </button>
              <button class="menu-item" @click=${()=>{this._menuOpen=!1,this._navigate("/settings")}}>
                <ha-icon icon="mdi:cog"></ha-icon> Settings
              </button>
            </div>
          `:l}

      ${e.length>0?o`
            <button class="fab" @click=${this._handleAddArea}>
              <ha-icon icon="mdi:plus"></ha-icon>
            </button>
          `:l}
    `}};Y.styles=[k,R,Ne,Me,we,ve,y`
      area-card {
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
      .battery-banner,
      .vacation-banner,
      .auto-away-banner {
        display: block;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .vacation-schedule-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-2, 8px);
      }
      .vacation-schedule-btn {
        width: 100%;
      }
      /* Three-dot menu */
      .menu-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 9;
      }
      .toolbar-menu {
        position: fixed;
        top: var(--header-height, 56px);
        right: var(--ha-space-4, 16px);
        z-index: 10;
        background: var(--card-background-color, white);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        box-shadow: var(--ha-box-shadow-m, 0 2px 8px rgba(0,0,0,0.15));
        padding: var(--ha-space-1, 4px) 0;
        min-width: 160px;
      }
      .menu-item {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        width: 100%;
        padding: var(--ha-space-2, 8px) var(--ha-space-4, 16px);
        background: none;
        border: none;
        text-align: left;
        font-size: var(--ha-font-size-m, 14px);
        font-family: inherit;
        color: var(--primary-text-color);
        cursor: pointer;
        --mdc-icon-size: 18px;
      }
      .menu-item:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .menu-divider {
        height: 1px;
        background: var(--divider-color, #e0e0e0);
        margin: var(--ha-space-1, 4px) 0;
      }
      /* Group sections */
      .group-section {
        margin-top: var(--ha-space-4, 16px);
      }
      .group-heading {
        margin: 0 0 var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .group-header {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        margin-bottom: var(--ha-space-2, 8px);
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        cursor: pointer;
        border-radius: var(--ha-border-radius-md, 8px);
      }
      .group-header:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .group-name {
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--primary-text-color);
        flex: 1;
      }
      .group-schedule {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
        padding: 2px var(--ha-space-2, 8px);
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: var(--ha-border-radius-pill, 9999px);
      }
      .group-chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
      }
    `];ne([h({attribute:!1})],Y.prototype,"hass",2);ne([h({attribute:!1})],Y.prototype,"api",2);ne([h({attribute:!1})],Y.prototype,"hearthState",2);ne([h({type:Boolean})],Y.prototype,"narrow",2);ne([p()],Y.prototype,"_showVacationPicker",2);ne([p()],Y.prototype,"_menuOpen",2);Y=ne([w("overview-view")],Y);var Ke=Object.defineProperty,Xe=Object.getOwnPropertyDescriptor,ge=(e,t,a,s)=>{for(var i=s>1?void 0:s?Xe(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Ke(t,a,i),i};let oe=class extends x{constructor(){super(...arguments),this.areaTargetTemp=null,this.lowBatteryThreshold=10,this.suppressPending=!1}_formatTemp(e){return e===null?"--":`${e.toFixed(1)}°C`}_openMoreInfo(){this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:this.device.entity_id},bubbles:!0,composed:!0}))}_isPending(){return this.suppressPending||this.areaTargetTemp===null||this.device.target_temp===null?!1:Math.abs(this.areaTargetTemp-this.device.target_temp)>.05}render(){var s,i;const e=this.device,t=e.battery!==null&&e.battery<=this.lowBatteryThreshold,a=this._isPending();return o`
      <div class="device-row" @click=${this._openMoreInfo}>
        <div class="device-name">${e.friendly_name||e.entity_id}</div>
        <div class="device-info">
          ${(s=e.diagnostics)!=null&&s.has_error?o`<span class="error-badge" title=${e.diagnostics.error_code??"Error"}>
                <ha-icon icon="mdi:alert" style="--mdc-icon-size: 14px;"></ha-icon>
              </span>`:l}
          ${((i=e.diagnostics)==null?void 0:i.pi_heating_demand)!=null?o`<span class="demand">
                <ha-icon icon="mdi:fire" style="--mdc-icon-size: 14px;"></ha-icon>
                ${e.diagnostics.pi_heating_demand}%
              </span>`:l}
          ${e.battery!==null?o`<span class="battery ${t?"low":""}">
                <ha-icon icon=${Pe(e.battery)} style="--mdc-icon-size: 14px;"></ha-icon>
                ${e.battery}%
              </span>`:l}
          <span class="temp">${this._formatTemp(e.current_temp)}</span>
          <span class="separator">→</span>
          ${a?o`
                <span class="target stale">${this._formatTemp(e.target_temp)}</span>
                <span class="separator">→</span>
                <span class="target pending">${this._formatTemp(this.areaTargetTemp)}</span>
                <ha-icon icon="mdi:sync" class="sync-icon"></ha-icon>`:o`<span class="target">${this._formatTemp(e.target_temp)}</span>`}
          <ha-icon icon="mdi:chevron-right" class="chevron"></ha-icon>
        </div>
      </div>
    `}};oe.styles=[k,y`
      .device-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ha-space-2, 8px) 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        cursor: pointer;
      }
      .device-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
        margin: 0 calc(-1 * var(--ha-space-2, 8px));
        padding: var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-md, 8px);
        border-bottom-color: transparent;
      }
      .device-row:last-child {
        border-bottom: none;
      }
      .device-name {
        font-size: var(--ha-font-size-m, 14px);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .device-info {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--hearth-text-between-s-m, 13px);
      }
      .temp {
        color: var(--primary-text-color);
      }
      .separator {
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-xs-s, 11px);
      }
      .target {
        color: var(--primary-color);
      }
      .target.stale {
        color: var(--secondary-text-color);
        text-decoration: line-through;
        font-size: var(--hearth-text-between-xs-s, 11px);
      }
      .target.pending {
        color: var(--warning-color, #ff9800);
      }
      .sync-icon {
        --mdc-icon-size: 14px;
        color: var(--warning-color, #ff9800);
        animation: spin 1.5s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .battery {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-xs-s, 11px);
        margin-right: var(--ha-space-3, 12px);
      }
      .battery.low {
        color: var(--error-color, #db4437);
      }
      .error-badge {
        color: var(--error-color, #db4437);
        display: inline-flex;
        align-items: center;
        margin-right: var(--ha-space-1, 4px);
      }
      .demand {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        font-size: var(--hearth-text-between-xs-s, 11px);
        color: var(--secondary-text-color);
        margin-right: var(--ha-space-2, 8px);
      }
      .chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        margin-left: var(--ha-space-1, 4px);
      }
    `];ge([h({attribute:!1})],oe.prototype,"device",2);ge([h({type:Number})],oe.prototype,"areaTargetTemp",2);ge([h({type:Number})],oe.prototype,"lowBatteryThreshold",2);ge([h({type:Boolean})],oe.prototype,"suppressPending",2);oe=ge([w("device-status")],oe);var Ze=Object.defineProperty,Qe=Object.getOwnPropertyDescriptor,ce=(e,t,a,s)=>{for(var i=s>1?void 0:s?Qe(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Ze(t,a,i),i};let K=class extends x{constructor(){super(...arguments),this.areaId="",this.narrow=!1,this._optimisticTarget=null,this._setpointDebounce=new Ge(e=>this.api.setOverride(this.areaId,e),400)}get _area(){return this.hearthState.areas[this.areaId]}get _displayTarget(){var e;return this._optimisticTarget??((e=this._area)==null?void 0:e.target_temp)??null}connectedCallback(){super.connectedCallback(),this._updateToolbar()}disconnectedCallback(){super.disconnectedCallback(),this._setpointDebounce.flush()}willUpdate(e){e.has("areaId")&&(this._optimisticTarget=null,this._setpointDebounce.cancel()),(e.has("areaId")||e.has("hearthState"))&&(this._optimisticTarget!==null&&this._area&&this._area.target_temp!==null&&Math.abs(this._area.target_temp-this._optimisticTarget)<.05&&(this._optimisticTarget=null),this._updateToolbar())}_getDisplayName(){const e=this._area;return e?pe(e):this.areaId}_updateToolbar(){const e=this._area,t=(e==null?void 0:e.effective_state)??"off",a=(e==null?void 0:e.override)!=null,s=a?"override":t,i=a?`${t} - override`:t;this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:this._getDisplayName(),backPath:"/",actions:o`
            <span
              class="mode-badge ${s}"
              @click=${a?()=>this.api.clearOverride(this.areaId):void 0}
              title=${a?"Click to clear override":""}
            >${i}${a?" ✕":""}</span>
            <ha-icon-button
              .label=${"Statistics"}
              @click=${()=>this._navigate(`/area/${this.areaId}/stats`)}
            >
              <ha-icon icon="mdi:chart-line"></ha-icon>
            </ha-icon-button>
            <ha-icon-button
              .label=${"Area Settings"}
              @click=${()=>this._navigate(`/area/${this.areaId}/settings`)}
            >
              <ha-icon icon="mdi:cog"></ha-icon>
            </ha-icon-button>
          `},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}_adjustTemp(e){const t=this._area;if(!t)return;const a=this._optimisticTarget??t.target_temp??t.home_temp,s=Math.max(t.min_temp,Math.min(t.max_temp,Math.round((a+e)*2)/2));this._optimisticTarget=s,this._setpointDebounce.call(s)}async _setAreaState(e){await this.api.setAreaState(this.areaId,e)}async _toggleEnabled(){const e=this._area;e&&await this.api.setAreaEnabled(this.areaId,!e.enabled)}_formatTemp(e){return He(e)}_isApplying(){const e=this._area,t=this._displayTarget;return!e||t===null||e.preheat?!1:e.devices.some(a=>a.target_temp!==null&&Math.abs(t-a.target_temp)>.05)}_openMoreInfo(e){this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:e},bubbles:!0,composed:!0}))}_batteryIcon(e){return Pe(e)}render(){var a;const e=this._area;if(!e)return o`<div class="container"><p>Area not found.</p></div>`;const t=e.today_schedule??[];return o`
      <div class="container">
        ${e.preheat?o`<div class="preheat-banner">
              <ha-icon icon=${e.preheat.direction==="setback"?"mdi:snowflake":"mdi:fire"}></ha-icon>
              ${e.preheat.direction==="setback"?"Pre-cooling":"Preheating"}:
              preparing for ${this._formatTemp(e.preheat.upcoming_temp??null)}°C
              ${e.preheat.transition_at?`at ${new Date(e.preheat.transition_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:""}
            </div>`:l}
        ${""}
        ${e.window_open===!0?o`<div class="window-open-banner">
              <ha-icon icon="mdi:window-open-variant"></ha-icon>
              Window open: heating paused
            </div>`:l}
        <!-- Temperature display -->
        <ha-card>
          <div class="temp-section">
            <div class="target-display">
              <ha-icon-button
                .label=${"Decrease temperature"}
                @click=${()=>this._adjustTemp(-.5)}
                .disabled=${!e.enabled}
              >
                <ha-icon icon="mdi:minus"></ha-icon>
              </ha-icon-button>
              <div class="temp-display">
                ${this._formatTemp(this._displayTarget)}<span class="temp-unit">°C</span>
              </div>
              <ha-icon-button
                .label=${"Increase temperature"}
                @click=${()=>this._adjustTemp(.5)}
                .disabled=${!e.enabled}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </ha-icon-button>
            </div>
            <div class="secondary-text">
              Current: ${this._formatTemp(e.current_temp)}°C
            </div>
            ${this._isApplying()?o`<div class="applying-text">
                  <ha-icon icon="mdi:sync" class="applying-icon"></ha-icon>
                  Applying to devices...
                </div>`:l}
            ${e.next_transition?o`
                  <div class="secondary-text">
                    Next: ${e.next_transition.temp.toFixed(0)}°C at
                    ${new Date(e.next_transition.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                  </div>
                `:l}
          </div>
        </ha-card>

        <!-- State controls -->
        <div class="state-controls">
          ${e.effective_state==="away"&&e.enabled?o`
                <ha-button @click=${()=>this._setAreaState("home")}>
                  <ha-icon icon="mdi:home" slot="icon"></ha-icon>
                  Home
                </ha-button>
              `:l}
          ${e.effective_state==="home"&&e.enabled?o`
                <ha-button @click=${()=>this._setAreaState("away")}>
                  <ha-icon icon="mdi:exit-run" slot="icon"></ha-icon>
                  Away
                </ha-button>
              `:l}
          <ha-button
            @click=${()=>this._toggleEnabled()}
          >
            ${e.enabled?"Turn Off":"Turn On"}
          </ha-button>
        </div>

        <!-- Today's schedule (materialized) -->
        ${t.length>0?o`
              <div class="section">
                <h3
                  class="clickable-heading"
                  @click=${()=>this._navigate(`/schedule/${e.schedule_id}`)}
                >
                  Today's Schedule
                  <ha-icon icon="mdi:pencil" class="edit-icon"></ha-icon>
                </h3>
                <schedule-bar
                  .entries=${t}
                  .homeTemp=${e.home_temp}
                  .awayTemp=${e.away_temp}
                ></schedule-bar>
              </div>
            `:l}

        <!-- Climate devices -->
        ${e.devices.length>0?o`
              <div class="section">
                <h3>Climate Devices</h3>
                ${e.devices.map(s=>o`
                    <device-status .device=${s} .areaTargetTemp=${e.target_temp} .suppressPending=${!!e.preheat} .lowBatteryThreshold=${this.hearthState.global.low_battery_threshold}></device-status>
                  `)}
              </div>
            `:l}

        <!-- Temperature sensors -->
        ${((a=e.temperature_sensor_details)==null?void 0:a.length)>0?o`
              <div class="section">
                <h3>Temperature Sensors</h3>
                ${e.temperature_sensor_details.map(s=>o`
                  <div class="sensor-row" @click=${()=>this._openMoreInfo(s.entity_id)}>
                    <div class="sensor-name">${s.friendly_name}</div>
                    <div class="sensor-info">
                      ${s.battery!=null?o`
                        <span class="sensor-battery ${s.battery<=this.hearthState.global.low_battery_threshold?"low":""}">
                          <ha-icon icon=${this._batteryIcon(s.battery)} style="--mdc-icon-size: 14px;"></ha-icon>
                          ${s.battery}%
                        </span>
                      `:l}
                      <span class="sensor-temp">${s.current_temp!=null?`${s.current_temp.toFixed(1)}°C`:"—"}</span>
                      <ha-icon icon="mdi:chevron-right" class="chevron"></ha-icon>
                    </div>
                  </div>
                `)}
              </div>
            `:l}
      </div>

    `}};K.styles=[k,R,Ve,Be,Ce,we,y`
      .temp-section {
        text-align: center;
        padding: var(--ha-space-6, 24px) var(--ha-space-4, 16px);
      }
      .target-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-4, 16px);
      }
      ha-card {
        margin-bottom: var(--ha-space-4, 16px);
      }
      .state-controls {
        display: flex;
        gap: var(--ha-space-2, 8px);
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .override-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--hearth-color-manual, #ff5722);
        margin-top: var(--ha-space-2, 8px);
      }
      .clickable-heading {
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
      }
      .clickable-heading:hover {
        color: var(--primary-color, #03a9f4);
      }
      .edit-icon {
        --mdc-icon-size: 14px;
      }
      .applying-text {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--warning-color, #ff9800);
        margin-top: var(--ha-space-1, 4px);
      }
      .applying-icon {
        --mdc-icon-size: 14px;
        animation: spin 1.5s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .preheat-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px);
        margin-bottom: var(--ha-space-4, 16px);
        background: var(--info-color, #03a9f4);
        color: white;
        border-radius: var(--ha-border-radius-md, 8px);
        font-size: var(--ha-font-size-m, 14px);
        --mdc-icon-size: 20px;
      }
      .window-open-banner {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px);
        margin-bottom: var(--ha-space-4, 16px);
        background: var(--warning-color, #ff9800);
        color: white;
        border-radius: var(--ha-border-radius-md, 8px);
        font-size: var(--ha-font-size-m, 14px);
        --mdc-icon-size: 20px;
      }
      .sensor-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--ha-space-2, 8px) 0;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
        cursor: pointer;
      }
      .sensor-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
        margin: 0 calc(-1 * var(--ha-space-2, 8px));
        padding: var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-md, 8px);
        border-bottom-color: transparent;
      }
      .sensor-row:last-child {
        border-bottom: none;
      }
      .sensor-name {
        font-size: var(--ha-font-size-m, 14px);
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .sensor-info {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
        font-size: var(--hearth-text-between-s-m, 13px);
      }
      .sensor-temp {
        color: var(--primary-text-color);
      }
      .sensor-battery {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--secondary-text-color);
        font-size: var(--hearth-text-between-xs-s, 11px);
        margin-right: var(--ha-space-3, 12px);
      }
      .sensor-battery.low {
        color: var(--error-color, #db4437);
      }
      .chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        margin-left: var(--ha-space-1, 4px);
      }
    `];ce([h({attribute:!1})],K.prototype,"hass",2);ce([h({attribute:!1})],K.prototype,"api",2);ce([h({attribute:!1})],K.prototype,"hearthState",2);ce([h()],K.prototype,"areaId",2);ce([h({type:Boolean})],K.prototype,"narrow",2);ce([p()],K.prototype,"_optimisticTarget",2);K=ce([w("area-detail-view")],K);const Je=["monday","tuesday","wednesday","thursday","friday"],et=["saturday","sunday"];function De(e,t){const a={};for(const s of Je)a[s]=[...e];for(const s of et)a[s]=[...t];return a}function $e(e){return De(e,e)}const je=[{id:"workday_9_5",name:"9-5 Workday",description:"Warm mornings & evenings, away during work",icon:"mdi:briefcase-outline",schedule:De([{time:"06:00",temp:"home"},{time:"08:30",temp:"away"},{time:"16:30",temp:"home"},{time:"22:30",temp:"away"}],[{time:"08:00",temp:"home"},{time:"23:00",temp:"away"}])},{id:"work_from_home",name:"Work from Home",description:"Warm all day, cool overnight",icon:"mdi:laptop",schedule:$e([{time:"07:00",temp:"home"},{time:"22:30",temp:"away"}])},{id:"early_bird",name:"Early Bird",description:"Early start, home by 4pm",icon:"mdi:weather-sunset-up",schedule:De([{time:"05:30",temp:"home"},{time:"07:30",temp:"away"},{time:"16:00",temp:"home"},{time:"22:00",temp:"away"}],[{time:"08:00",temp:"home"},{time:"23:00",temp:"away"}])},{id:"always_home",name:"Always Home",description:"Comfortable temperature 24/7",icon:"mdi:home",schedule:$e([{time:"00:00",temp:"home"}])},{id:"always_away",name:"Always Away",description:"Energy saving, minimum heating",icon:"mdi:snowflake",schedule:$e([{time:"00:00",temp:"away"}])}];var tt=Object.defineProperty,at=Object.getOwnPropertyDescriptor,X=(e,t,a,s)=>{for(var i=s>1?void 0:s?at(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&tt(t,a,i),i};let L=class extends x{constructor(){super(...arguments),this.narrow=!1,this._showCreateDialog=!1,this._newName="",this._creating=!1,this._selectedTemplate=null}connectedCallback(){super.connectedCallback(),this._updateToolbar()}willUpdate(e){e.has("hearthState")&&this._updateToolbar()}_updateToolbar(){this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:"Schedules",backPath:"/",actions:o`
            <ha-icon-button
              .label=${"Create Schedule"}
              @click=${()=>this._openCreateDialog()}
            >
              <ha-icon icon="mdi:plus"></ha-icon>
            </ha-icon-button>
          `},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}_getAreaCount(e){return Object.values(this.hearthState.areas).filter(t=>t.schedule_id===e).length}_openCreateDialog(){this._newName="",this._selectedTemplate=null,this._showCreateDialog=!0}_closeCreateDialog(){this._showCreateDialog=!1}async _createGroup(){const e=this._newName.trim();if(!e)return;let t=e.toLowerCase().replace(/[^a-z0-9]+/g,"_");this.hearthState.schedules[t]&&(t=`${t}_${Date.now().toString(36)}`),this._creating=!0;try{await this.api.addSchedule({schedule_id:t,name:e,...this._selectedTemplate?{schedule:this._selectedTemplate.schedule}:{}}),this._showCreateDialog=!1,this._navigate(`/schedule/${t}`)}catch(s){console.error("Failed to create schedule:",s)}this._creating=!1}render(){const e=Object.values(this.hearthState.schedules);return o`
      <div class="container">
        ${e.length===0?o`
              <div class="empty-state">
                <h2>No schedules</h2>
                <p>Create a schedule to get started.</p>
                <ha-button @click=${()=>this._openCreateDialog()}>
                  <ha-icon icon="mdi:plus" slot="icon"></ha-icon>
                  Create Schedule
                </ha-button>
              </div>
            `:o`
              <div class="group-list">
                ${e.map(t=>{const a=this._getAreaCount(t.schedule_id);return o`
                    <ha-card
                      class="group-item"
                      @click=${()=>this._navigate(`/schedule/${t.schedule_id}`)}
                    >
                      <div class="card-content group-row">
                        <div class="group-info">
                          <span class="group-name">${t.name}</span>
                          <span class="group-meta">
                            ${a} area${a!==1?"s":""}
                          </span>
                        </div>
                        <ha-icon icon="mdi:chevron-right"></ha-icon>
                      </div>
                    </ha-card>
                  `})}
              </div>
            `}
      </div>

      ${this._showCreateDialog?o`
            <div class="dialog-overlay" @click=${()=>this._closeCreateDialog()}>
              <ha-card class="dialog-card" @click=${t=>t.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Create Schedule</h2>
                  <ha-icon-button .label=${"Close"} @click=${()=>this._closeCreateDialog()}>
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
                        @input=${t=>this._newName=t.target.value}
                        @keydown=${t=>{t.key==="Enter"&&this._createGroup()}}
                        placeholder="e.g. Default, Weekday, Weekend"
                      />
                    </label>
                    <div class="field-group">
                      <label>Start from template</label>
                      <div class="template-grid">
                        <button
                          class="template-option ${this._selectedTemplate===null?"selected":""}"
                          @click=${()=>{this._selectedTemplate=null}}
                        >
                          <ha-icon icon="mdi:calendar-blank"></ha-icon>
                          <span class="template-name">Blank</span>
                          <span class="template-desc">Start from scratch</span>
                        </button>
                        ${je.map(t=>{var a;return o`
                            <button
                              class="template-option ${((a=this._selectedTemplate)==null?void 0:a.id)===t.id?"selected":""}"
                              @click=${()=>{this._selectedTemplate=t}}
                            >
                              <ha-icon icon=${t.icon}></ha-icon>
                              <span class="template-name">${t.name}</span>
                              <span class="template-desc">${t.description}</span>
                            </button>
                          `})}
                      </div>
                    </div>
                  </div>
                </div>
                <div class="dialog-actions">
                  <ha-button appearance="plain" @click=${()=>this._closeCreateDialog()}>Cancel</ha-button>
                  <ha-button
                    @click=${()=>this._createGroup()}
                    .disabled=${!this._newName.trim()||this._creating}
                  >
                    Create
                  </ha-button>
                </div>
              </ha-card>
            </div>
          `:l}
    `}};L.styles=[k,R,Me,Ce,ve,Le,y`
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
    `];X([h({attribute:!1})],L.prototype,"hass",2);X([h({attribute:!1})],L.prototype,"api",2);X([h({attribute:!1})],L.prototype,"hearthState",2);X([h({type:Boolean})],L.prototype,"narrow",2);X([p()],L.prototype,"_showCreateDialog",2);X([p()],L.prototype,"_newName",2);X([p()],L.prototype,"_creating",2);X([p()],L.prototype,"_selectedTemplate",2);L=X([w("schedules-view")],L);var st=Object.defineProperty,it=Object.getOwnPropertyDescriptor,te=(e,t,a,s)=>{for(var i=s>1?void 0:s?it(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&st(t,a,i),i};const V=300,C=V/2,T=V/2,ee=120,re=80,rt=138,ot=(ee+re)/2,nt=10,_e=30;function he(e){const[t,a]=e.split(":").map(Number);return t*60+a}function fe(e){const t=(e%1440+1440)%1440;return`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`}function ie(e){return e/1440*360-90}function ct(e){return((e+90)%360+360)%360/360*1440}function z(e,t){const a=e*Math.PI/180;return[C+t*Math.cos(a),T+t*Math.sin(a)]}function ke(e){return Math.round(e/30)*30}function lt(e,t,a,s){let i=t-e;if(i<=0&&(i+=360),i>=360)return ht(a,s);const r=i>180?1:0,[n,c]=z(e,a),[d,u]=z(t,a),[_,g]=z(t,s),[v,m]=z(e,s);return`M ${n} ${c} A ${a} ${a} 0 ${r} 1 ${d} ${u} L ${_} ${g} A ${s} ${s} 0 ${r} 0 ${v} ${m} Z`}function ht(e,t){return`M ${C-e} ${T} A ${e} ${e} 0 1 1 ${C+e} ${T} A ${e} ${e} 0 1 1 ${C-e} ${T} M ${C-t} ${T} A ${t} ${t} 0 1 0 ${C+t} ${T} A ${t} ${t} 0 1 0 ${C-t} ${T} Z`}function be(e,t){const a=t.getBoundingClientRect(),s=(e.clientX-a.left)*V/a.width-C,i=(e.clientY-a.top)*V/a.height-T;return ke(ct(Math.atan2(i,s)*180/Math.PI))%1440}let B=class extends x{constructor(){super(...arguments),this.entries=[],this._pendingEntries=null,this._handleDrag=null,this._segDrag=null,this._selectedSeg=null,this._tapMins=null,this._hoverMins=null,this._svgRef=null}willUpdate(e){e.has("entries")&&this._pendingEntries&&(this._pendingEntries=null)}_getSvg(){return this._svgRef??(this._svgRef=this.renderRoot.querySelector("svg"))}_base(){return this._pendingEntries??this.entries}_getEntries(){const e=this._base();if(this._handleDrag)return e.map((t,a)=>a===this._handleDrag.index?{...t,time:fe(this._handleDrag.mins)}:t);if(this._segDrag&&this._segDrag.delta!==0){const{startIdx:t,endIdx:a,delta:s}=this._segDrag;return e.map((i,r)=>r===t||r===a&&a!==t?{...i,time:fe((he(i.time)+s+1440)%1440)}:i)}return e}_getSegments(e){const t=e??this._getEntries();if(t.length===0)return[{startMins:0,endMins:1440,duration:1440,temp:"home",entryIndex:-1,nextEntryIndex:-1,isFullCircle:!0}];const a=t.map((s,i)=>({...s,originalIndex:i,mins:he(s.time)})).sort((s,i)=>s.mins-i.mins);return a.length===1?[{startMins:0,endMins:1440,duration:1440,temp:a[0].temp,entryIndex:a[0].originalIndex,nextEntryIndex:a[0].originalIndex,isFullCircle:!0}]:a.map((s,i)=>{const r=a[(i+1)%a.length];let n=r.mins;return n<=s.mins&&(n+=1440),{startMins:s.mins,endMins:n,duration:n-s.mins,temp:s.temp,entryIndex:s.originalIndex,nextEntryIndex:r.originalIndex,isFullCircle:!1}})}_getColor(e){return e==="home"?"var(--hearth-color-home, #039be5)":e==="away"?"var(--hearth-color-away, #9e9e9e)":"var(--hearth-color-manual, #ff5722)"}_handleLimits(e){const t=this._getSegments(this._base()),a=t.find(d=>d.entryIndex===e),s=t.find(d=>d.nextEntryIndex===e);if(!a||!s||t.length<2)return{min:0,max:1440};const r=(s.startMins+_e)%1440,c=((a.endMins-_e)%1440+1440)%1440;return{min:r,max:c}}_onSegmentPointerDown(e,t){t.preventDefault(),t.stopPropagation();const a=this._getSvg();if(!a)return;const s=be(t,a);if(e.isFullCircle&&this._base().length<=1){this._selectedSeg=e.entryIndex,this._tapMins=s;return}const i=this._getSegments(this._base()),r=i.findIndex(_=>_.entryIndex===e.entryIndex);let n=1440,c=1440;if(r>=0&&i.length>=2){const _=i[(r+1)%i.length],g=i[(r-1+i.length)%i.length];n=Math.max(0,_.duration-_e),c=Math.max(0,g.duration-_e)}this._segDrag={startIdx:e.entryIndex,endIdx:e.nextEntryIndex,startMins:s,delta:0,maxForward:n,maxBackward:c};const d=_=>{if(!this._segDrag)return;const g=this._getSvg();if(!g)return;let v=be(_,g)-this._segDrag.startMins;v>720&&(v-=1440),v<-720&&(v+=1440),v=Math.round(v/30)*30,v=Math.max(-this._segDrag.maxBackward,Math.min(this._segDrag.maxForward,v)),this._segDrag={...this._segDrag,delta:v}},u=()=>{var _;window.removeEventListener("pointermove",d),window.removeEventListener("pointerup",u),Math.abs(((_=this._segDrag)==null?void 0:_.delta)??0)<15?(this._segDrag=null,this._selectedSeg=e.entryIndex,this._tapMins=s):this._commitSegmentDrag()};window.addEventListener("pointermove",d),window.addEventListener("pointerup",u)}_commitSegmentDrag(){if(!this._segDrag||this._segDrag.delta===0){this._segDrag=null;return}const e=this._getEntries();this._segDrag=null,this._pendingEntries=e,this._dispatchChange(e)}_onHandlePointerDown(e,t){t.preventDefault(),t.stopPropagation(),this._selectedSeg=null,this._tapMins=null,this._handleDrag={index:e,mins:he(this._base()[e].time)};const a=this._handleLimits(e),s=r=>{if(!this._handleDrag)return;const n=this._getSvg();if(!n)return;let c=be(r,n);const{min:d,max:u}=a;d<=u?c=Math.max(d,Math.min(u,c)):c<d&&c>u&&(c=d-c<c-u?d:u),this._handleDrag={...this._handleDrag,mins:c}},i=()=>{window.removeEventListener("pointermove",s),window.removeEventListener("pointerup",i),this._commitHandleDrag()};window.addEventListener("pointermove",s),window.addEventListener("pointerup",i)}_commitHandleDrag(){if(!this._handleDrag)return;const e=this._getEntries();this._handleDrag=null,this._pendingEntries=e,this._dispatchChange(e)}_onSvgPointerMove(e){if(e.pointerType!=="mouse"||this._segDrag||this._handleDrag){this._hoverMins=null;return}const t=this._getSvg();if(!t)return;const a=t.getBoundingClientRect(),s=(e.clientX-a.left)*V/a.width-C,i=(e.clientY-a.top)*V/a.height-T,r=Math.sqrt(s*s+i*i);if(r<re-15||r>ee+15){this._hoverMins=null;return}this._hoverMins=be(e,t)}_onSvgPointerLeave(){this._hoverMins=null}_splitSelected(){if(this._selectedSeg===null)return;const t=this._getSegments().find(u=>u.entryIndex===this._selectedSeg);if(!t)return;let a;this._tapMins!==null&&(((this._tapMins-t.startMins)%1440+1440)%1440<t.duration||t.isFullCircle)?a=this._tapMins:a=ke((t.startMins+t.duration/2)%1440);const s=this._base(),i=t.entryIndex>=0?s[t.entryIndex].temp:"home",r=i==="home"?"away":"home",n=(a+_e)%1440,c=[...s,{time:fe(a),temp:r},{time:fe(n),temp:i}],d=this._mergeConsecutive(c);this._pendingEntries=d,this._selectedSeg=null,this._tapMins=null,this._dispatchChange(d)}_changeSelected(){if(this._selectedSeg===null)return;const e=this._base(),t=this._selectedSeg;if(t<0||t>=e.length)return;const a=e[t].temp==="home"?"away":"home",s=e.map((r,n)=>n===t?{...r,temp:a}:r),i=this._mergeConsecutive(s);this._pendingEntries=i,this._selectedSeg=null,this._tapMins=null,this._dispatchChange(i)}_deleteSelected(){this._selectedSeg!==null&&(this.removeTransition(this._selectedSeg),this._selectedSeg=null,this._tapMins=null)}removeTransition(e){const t=this._base();if(t.length<=1)return;const a=t.filter((i,r)=>r!==e),s=this._mergeConsecutive(a);this._pendingEntries=s,this._dispatchChange(s)}_mergeConsecutive(e){const t=[...e].sort((s,i)=>he(s.time)-he(i.time)),a=[];for(const s of t)a.length>0&&a[a.length-1].temp===s.temp||a.push(s);return a.length>1&&a[0].temp===a[a.length-1].temp&&a.shift(),a.length>0?a:[{time:"00:00",temp:"home"}]}_dispatchChange(e){this.dispatchEvent(new CustomEvent("entries-changed",{detail:{entries:e},bubbles:!0,composed:!0}))}_deselectIfOutside(e){const t=this._getSvg();if(!t)return;const a=t.getBoundingClientRect(),s=(e.clientX-a.left)*V/a.width-C,i=(e.clientY-a.top)*V/a.height-T;Math.sqrt(s*s+i*i)<re&&(this._selectedSeg=null,this._tapMins=null)}render(){const e=this._getSegments(),t=this._getEntries(),a=this._segDrag!==null||this._handleDrag!==null,s=this._selectedSeg!==null,i=s&&this._base().length>1;return o`
      <svg viewBox="0 0 ${V} ${V}" xmlns="http://www.w3.org/2000/svg"
        class="${a?"dragging":""}"
        @pointermove=${r=>this._onSvgPointerMove(r)}
        @pointerleave=${()=>this._onSvgPointerLeave()}
        @pointerdown=${r=>this._deselectIfOutside(r)}>

        <circle cx="${C}" cy="${T}" r="${ee}" fill="var(--card-background-color, #fff)" stroke="var(--divider-color, #e0e0e0)" stroke-width="1" />
        <circle cx="${C}" cy="${T}" r="${re}" fill="var(--primary-background-color, #fafafa)" stroke="var(--divider-color, #e0e0e0)" stroke-width="1" />

        ${e.map(r=>le`
          <path d="${lt(ie(r.startMins),ie(r.endMins),ee,re)}"
            fill="${this._getColor(r.temp)}" fill-rule="evenodd"
            class="segment ${this._selectedSeg===r.entryIndex?"selected":""}"
            @pointerdown=${n=>this._onSegmentPointerDown(r,n)} />
        `)}

        ${[0,3,6,9,12,15,18,21].map(r=>{const[n,c]=z(ie(r*60),rt);return le`<text x="${n}" y="${c}" text-anchor="middle" dominant-baseline="central" class="hour-label">${r}</text>`})}
        ${Array.from({length:24},(r,n)=>{const c=ie(n*60),[d,u]=z(c,ee),[_,g]=z(c,ee+4);return le`<line x1="${d}" y1="${u}" x2="${_}" y2="${g}" stroke="var(--secondary-text-color, #999)" stroke-width="${n%3===0?1.5:.5}" />`})}

        ${this._renderNowIndicator()}

        ${t.map((r,n)=>{const[c,d]=z(ie(he(r.time)),ot);return le`
            <circle cx="${c}" cy="${d}" r="${nt}" class="handle"
              @pointerdown=${u=>this._onHandlePointerDown(n,u)} />
            <text x="${c}" y="${d}" text-anchor="middle" dominant-baseline="central"
              class="handle-label" style="pointer-events:none">${r.time}</text>
          `})}

        <!-- Hover/tap snap line -->
        ${(this._hoverMins!==null||this._tapMins!==null)&&!a?(()=>{const r=this._hoverMins??this._tapMins,n=ie(r),[c,d]=z(n,re),[u,_]=z(n,ee);return le`<line x1="${c}" y1="${d}" x2="${u}" y2="${_}"
            stroke="var(--primary-text-color, #333)" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"
            style="pointer-events:none" />`})():l}

        <text x="${C}" y="${T}" text-anchor="middle" dominant-baseline="central" class="center-label">24h</text>
      </svg>

      <!-- Action buttons - fixed height area to prevent layout jump -->
      <div class="action-bar">
        ${s?o`
          <button class="action-btn" @click=${()=>this._splitSelected()}>
            <ha-icon icon="mdi:content-cut"></ha-icon> Split
          </button>
          <button class="action-btn" @click=${()=>this._changeSelected()}>
            <ha-icon icon="mdi:swap-horizontal"></ha-icon> Change
          </button>
          ${i?o`
            <button class="action-btn delete" @click=${()=>this._deleteSelected()}>
              <ha-icon icon="mdi:delete"></ha-icon> Delete
            </button>
          `:l}
        `:l}
      </div>

      <div class="hint">Tap segment to select · Drag to move</div>
    `}_renderNowIndicator(){const e=new Date,t=ie(e.getHours()*60+e.getMinutes()),[a,s]=z(t,re-5),[i,r]=z(t,ee+2);return le`<line x1="${a}" y1="${s}" x2="${i}" y2="${r}" stroke="var(--hearth-color-now, #e91e63)" stroke-width="2" stroke-linecap="round" />`}};B.styles=y`
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
  `;te([h({attribute:!1})],B.prototype,"entries",2);te([p()],B.prototype,"_pendingEntries",2);te([p()],B.prototype,"_handleDrag",2);te([p()],B.prototype,"_segDrag",2);te([p()],B.prototype,"_selectedSeg",2);te([p()],B.prototype,"_tapMins",2);te([p()],B.prototype,"_hoverMins",2);B=te([w("schedule-clock")],B);var dt=Object.defineProperty,pt=Object.getOwnPropertyDescriptor,O=(e,t,a,s)=>{for(var i=s>1?void 0:s?pt(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&dt(t,a,i),i};const ye=[{key:"monday",short:"Mon"},{key:"tuesday",short:"Tue"},{key:"wednesday",short:"Wed"},{key:"thursday",short:"Thu"},{key:"friday",short:"Fri"},{key:"saturday",short:"Sat"},{key:"sunday",short:"Sun"}];let $=class extends x{constructor(){super(...arguments),this.groupId="",this.narrow=!1,this._selectedDay="monday",this._saving=!1,this._copyMenuOpen=!1,this._showTemplateDialog=!1,this._confirmDelete=!1,this._scheduleState=new Re,this._deleteError=""}get _group(){return this.hearthState.schedules[this.groupId]}_getSchedule(){var e;return this._scheduleState.get(((e=this._group)==null?void 0:e.schedule)??{})}connectedCallback(){super.connectedCallback();const e=ye[(new Date().getDay()+6)%7].key;this._selectedDay=e,this._updateToolbar()}willUpdate(e){(e.has("groupId")||e.has("hearthState"))&&this._updateToolbar()}_updateToolbar(){const e=this._group;this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:`Schedules / ${(e==null?void 0:e.name)??"Schedule"}`,backPath:"/schedules"},bubbles:!0,composed:!0}))}_getDayEntries(){return this._getSchedule()[this._selectedDay]||[]}async _saveSchedule(e){this._scheduleState.set(e),this._saving=!0,this.requestUpdate();try{await this.api.updateSchedule(this.groupId,{schedule:e})}catch(t){console.error("Failed to save schedule:",t)}this._scheduleState.resolve(),this._saving=!1}_getAreasUsingGroup(){return Object.values(this.hearthState.areas).filter(e=>e.schedule_id===this.groupId).map(e=>({area_id:e.area_id,name:e.name}))}async _onEntriesChanged(e){const t=e.detail.entries;if(!this._group)return;const a={...this._getSchedule(),[this._selectedDay]:t};await this._saveSchedule(a)}async _copyToDay(e){if(!this._group)return;const t=this._getDayEntries(),a={...this._getSchedule(),[e]:t.map(s=>({...s}))};this._copyMenuOpen=!1,await this._saveSchedule(a)}async _copyToWeekdays(){if(!this._group)return;const e=this._getDayEntries(),t={...this._getSchedule()};for(const a of["monday","tuesday","wednesday","thursday","friday"])t[a]=e.map(s=>({...s}));this._copyMenuOpen=!1,await this._saveSchedule(t)}async _copyToWeekend(){if(!this._group)return;const e=this._getDayEntries(),t={...this._getSchedule()};for(const a of["saturday","sunday"])t[a]=e.map(s=>({...s}));this._copyMenuOpen=!1,await this._saveSchedule(t)}async _copyToAll(){if(!this._group)return;const e=this._getDayEntries(),t={...this._getSchedule()};for(const a of ye)t[a.key]=e.map(s=>({...s}));this._copyMenuOpen=!1,await this._saveSchedule(t)}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}render(){if(!this._group)return o`<div class="container"><p>Schedule not found.</p></div>`;const t=this._getDayEntries(),a=this._getAreasUsingGroup();return o`
      <div class="container">
        <!-- Day selector -->
        <div class="day-selector">
          ${ye.map(s=>o`
              <button
                class="day-btn ${this._selectedDay===s.key?"active":""}"
                @click=${()=>this._selectedDay=s.key}
              >
                ${s.short}
              </button>
            `)}
        </div>

        <!-- Clock -->
        <schedule-clock
          .entries=${t}
          @entries-changed=${this._onEntriesChanged}
        ></schedule-clock>

        <!-- Legend -->
        <div class="legend">
          <span class="legend-item">
            <span class="legend-dot home"></span> Home
          </span>
          <span class="legend-item">
            <span class="legend-dot away"></span> Away / Sleep
          </span>
        </div>

        <!-- Actions -->
        <div class="actions">
          <ha-button appearance="plain" @click=${()=>this._showTemplateDialog=!0}>
            <ha-icon icon="mdi:file-document-outline" slot="icon"></ha-icon>
            Apply Template
          </ha-button>
          <div class="copy-wrapper">
            <ha-button appearance="plain" @click=${()=>this._copyMenuOpen=!this._copyMenuOpen}>
              <ha-icon icon="mdi:content-copy" slot="icon"></ha-icon>
              Copy to...
            </ha-button>
            ${this._copyMenuOpen?o`
                  <div class="copy-menu-backdrop" @click=${()=>this._copyMenuOpen=!1}></div>
                  <div class="copy-menu">
                    ${ye.filter(s=>s.key!==this._selectedDay).map(s=>o`
                        <button class="copy-option" @click=${()=>this._copyToDay(s.key)}>
                          ${s.short}
                        </button>
                      `)}
                    <button class="copy-option" @click=${this._copyToWeekdays}>
                      All weekdays
                    </button>
                    <button class="copy-option" @click=${this._copyToWeekend}>
                      Weekend
                    </button>
                    <button class="copy-option" @click=${this._copyToAll}>
                      All days
                    </button>
                  </div>
                `:l}
          </div>
        </div>

        <!-- Transition list -->
        ${t.length>0?o`
              <div class="section">
                <h3>Transitions</h3>
                <div class="transition-list">
                  ${t.slice().sort((s,i)=>s.time.localeCompare(i.time)).map((s,i)=>{const r=t.indexOf(s);return o`
                          <div class="transition-row">
                            <span class="transition-time">${s.time}</span>
                            <span class="transition-mode ${s.temp}">
                              ${s.temp==="home"?"Home":"Away"}
                            </span>
                            ${t.length>1?o`
                                  <ha-icon-button
                                    .label=${"Remove"}
                                    @click=${()=>this._removeTransition(r)}
                                  >
                                    <ha-icon icon="mdi:close"></ha-icon>
                                  </ha-icon-button>
                                `:l}
                          </div>
                        `})}
                </div>
              </div>
            `:l}

        <!-- Areas using this schedule -->
        ${a.length>0?o`
              <div class="section">
                <h3>Areas</h3>
                <div class="area-list">
                  ${a.map(s=>o`
                      <div
                        class="area-row"
                        @click=${()=>this._navigate(`/area/${s.area_id}`)}
                      >
                        <span>${s.name}</span>
                        <ha-icon icon="mdi:chevron-right"></ha-icon>
                      </div>
                    `)}
                </div>
              </div>
            `:l}

        <!-- Delete -->
        ${this._deleteError?o`<ha-alert alert-type="error" style="display:block;margin-bottom:var(--ha-space-2,8px)">${this._deleteError}</ha-alert>`:l}
        <div class="delete-row">
          ${this._confirmDelete?o`
                <ha-button @click=${this._deleteSchedule}>
                  Confirm delete?
                </ha-button>
                <ha-button appearance="plain" @click=${()=>{this._confirmDelete=!1,this._deleteError=""}}>
                  Cancel
                </ha-button>
              `:o`
                <ha-button appearance="plain" @click=${()=>this._confirmDelete=!0}>
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  Delete schedule
                </ha-button>
              `}
        </div>
      </div>

      ${this._showTemplateDialog?o`
            <div class="dialog-overlay" @click=${()=>this._showTemplateDialog=!1}>
              <ha-card class="dialog-card" @click=${s=>s.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Apply Template</h2>
                  <ha-icon-button .label=${"Close"} @click=${()=>this._showTemplateDialog=!1}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <p class="warning-text">This will replace the entire weekly schedule.</p>
                  <div class="template-list">
                    ${je.map(s=>o`
                        <button class="template-row" @click=${()=>this._applyTemplate(s)}>
                          <ha-icon icon=${s.icon}></ha-icon>
                          <div class="template-info">
                            <span class="template-name">${s.name}</span>
                            <span class="template-desc">${s.description}</span>
                          </div>
                        </button>
                      `)}
                  </div>
                </div>
              </ha-card>
            </div>
          `:l}
    `}async _applyTemplate(e){this._showTemplateDialog=!1;try{await this.api.updateSchedule(this.groupId,{schedule:e.schedule})}catch(t){console.error("Failed to apply template:",t)}}async _deleteSchedule(){this._deleteError="";try{await this.api.removeSchedule(this.groupId),this._navigate("/schedules")}catch(e){const t=(e==null?void 0:e.message)||"Failed to delete schedule";this._deleteError=t,console.error("Failed to delete schedule:",e)}}_removeTransition(e){const t=this.renderRoot.querySelector("schedule-clock");t==null||t.removeTransition(e)}};$.styles=[k,R,Ce,ve,y`
      .day-selector {
        display: flex;
        justify-content: center;
        gap: var(--ha-space-1, 4px);
        margin-bottom: var(--ha-space-4, 16px);
      }
      .day-btn {
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-pill, 9999px);
        background: var(--card-background-color, white);
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-s, 12px);
        font-family: inherit;
        cursor: pointer;
      }
      .day-btn.active {
        background: var(--primary-color, #03a9f4);
        color: white;
        border-color: var(--primary-color, #03a9f4);
      }
      .legend {
        display: flex;
        justify-content: center;
        gap: var(--ha-space-4, 16px);
        margin: var(--ha-space-3, 12px) 0;
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: var(--ha-space-1, 4px);
      }
      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .legend-dot.home {
        background: var(--hearth-color-home, #039be5);
      }
      .legend-dot.away {
        background: var(--hearth-color-away, #9e9e9e);
      }
      .actions {
        display: flex;
        justify-content: center;
        margin-bottom: var(--ha-space-4, 16px);
      }
      .copy-wrapper {
        position: relative;
      }
      .copy-menu-backdrop {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 9;
      }
      .copy-menu {
        position: absolute;
        top: 100%;
        left: 0;
        z-index: 10;
        background: var(--card-background-color, white);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        box-shadow: var(--ha-box-shadow-m, 0 2px 8px rgba(0,0,0,0.15));
        padding: var(--ha-space-1, 4px) 0;
        min-width: 140px;
      }
      .copy-option {
        display: block;
        width: 100%;
        padding: var(--ha-space-2, 8px) var(--ha-space-4, 16px);
        background: none;
        border: none;
        text-align: left;
        font-size: var(--ha-font-size-m, 14px);
        font-family: inherit;
        color: var(--primary-text-color);
        cursor: pointer;
      }
      .copy-option:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .transition-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .transition-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        padding: var(--ha-space-2, 8px) var(--ha-space-3, 12px);
        background: var(--card-background-color, white);
        border-radius: var(--ha-border-radius-md, 8px);
        min-height: 48px;
      }
      .transition-time {
        font-weight: var(--ha-font-weight-medium, 500);
        min-width: 50px;
      }
      .transition-mode {
        font-size: var(--ha-font-size-s, 12px);
        padding: 2px var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-pill, 9999px);
        color: white;
        flex: 1;
        text-align: center;
        max-width: 60px;
      }
      .transition-mode.home {
        background: var(--hearth-color-home, #039be5);
      }
      .transition-mode.away {
        background: var(--hearth-color-away, #9e9e9e);
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
        padding: var(--ha-space-3, 12px);
        background: var(--card-background-color, white);
        border-radius: var(--ha-border-radius-md, 8px);
        cursor: pointer;
      }
      .area-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .actions {
        gap: var(--ha-space-2, 8px);
      }
      .delete-row {
        display: flex;
        justify-content: center;
        gap: var(--ha-space-2, 8px);
        margin-top: var(--ha-space-6, 24px);
        padding-top: var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .template-list {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
      }
      .template-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        padding: var(--ha-space-3, 12px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        background: var(--card-background-color, white);
        cursor: pointer;
        font-family: inherit;
        text-align: left;
        width: 100%;
        color: var(--primary-text-color);
      }
      .template-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .template-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .template-name {
        font-weight: var(--ha-font-weight-medium, 500);
        font-size: var(--ha-font-size-m, 14px);
      }
      .template-desc {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .warning-text {
        color: var(--warning-color, #ff9800);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-3, 12px);
      }
    `];O([h({attribute:!1})],$.prototype,"hass",2);O([h({attribute:!1})],$.prototype,"api",2);O([h({attribute:!1})],$.prototype,"hearthState",2);O([h()],$.prototype,"groupId",2);O([h({type:Boolean})],$.prototype,"narrow",2);O([p()],$.prototype,"_selectedDay",2);O([p()],$.prototype,"_saving",2);O([p()],$.prototype,"_copyMenuOpen",2);O([p()],$.prototype,"_showTemplateDialog",2);O([p()],$.prototype,"_confirmDelete",2);O([p()],$.prototype,"_deleteError",2);$=O([w("schedule-editor-view")],$);var ut=Object.defineProperty,mt=Object.getOwnPropertyDescriptor,M=(e,t,a,s)=>{for(var i=s>1?void 0:s?mt(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&ut(t,a,i),i};const _t={default_home_temp:"Home temperature",default_away_temp:"Away temperature",default_min_temp:"Minimum temperature",default_max_temp:"Maximum temperature",presence_entities:"Presence entities",auto_away_enabled:"Enable auto-away",auto_away_delay_minutes:"Delay before away",boiler_entity:"Boiler entity",boiler_demand_threshold:"Boiler demand threshold",low_battery_threshold:"Low battery warning (%)",ungrouped_position:"Ungrouped areas position"},vt=[{type:"grid",name:"",schema:[{name:"default_home_temp",selector:{number:{min:4,max:35,step:.5,unit_of_measurement:"°C",mode:"box"}}},{name:"default_away_temp",selector:{number:{min:4,max:35,step:.5,unit_of_measurement:"°C",mode:"box"}}}]},{type:"grid",name:"",schema:[{name:"default_min_temp",selector:{number:{min:4,max:35,step:.5,unit_of_measurement:"°C",mode:"box"}}},{name:"default_max_temp",selector:{number:{min:4,max:35,step:.5,unit_of_measurement:"°C",mode:"box"}}}]}],gt=[{name:"presence_entities",selector:{entity:{domain:["person","binary_sensor","group","input_boolean"],multiple:!0}}},{name:"auto_away_enabled",selector:{boolean:{}}},{name:"auto_away_delay_minutes",selector:{number:{min:0,max:120,step:1,unit_of_measurement:"min",mode:"box"}}}],ft=[{name:"low_battery_threshold",selector:{number:{min:0,max:100,step:1,unit_of_measurement:"%",mode:"box"}}}],bt=[{name:"boiler_entity",selector:{entity:{domain:["switch","input_boolean"]}}},{name:"boiler_demand_threshold",selector:{number:{min:0,max:100,step:1,unit_of_measurement:"%",mode:"box"}}}],yt=[{name:"ungrouped_position",selector:{select:{mode:"dropdown",options:[{value:"top",label:"Top (before groups)"},{value:"bottom",label:"Bottom (after groups)"}]}}}];let S=class extends x{constructor(){super(...arguments),this.narrow=!1,this._tempData={},this._presenceData={},this._alertsData={},this._advancedData={},this._vacationScheduleId="",this._dirty=!1,this._saving=!1,this._initialized=!1,this._computeLabel=e=>_t[e.name]??e.name}connectedCallback(){super.connectedCallback(),this._updateToolbar()}willUpdate(e){e.has("hearthState")&&this.hearthState&&!this._dirty&&this._syncFromState()}_syncFromState(){const e=this.hearthState.global;this._tempData={default_home_temp:e.default_home_temp,default_away_temp:e.default_away_temp,default_min_temp:e.default_min_temp,default_max_temp:e.default_max_temp},this._presenceData={presence_entities:e.presence_entities??[],auto_away_enabled:e.auto_away_enabled,auto_away_delay_minutes:e.auto_away_delay_minutes},this._alertsData={low_battery_threshold:e.low_battery_threshold},this._advancedData={boiler_entity:e.boiler_entity??"",boiler_demand_threshold:e.boiler_demand_threshold??5,ungrouped_position:e.ungrouped_position??"top"},this._vacationScheduleId=e.vacation_schedule_id??"",this._initialized=!0}_updateToolbar(){this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:"Settings",backPath:"/"},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}_onTempChanged(e){this._tempData={...this._tempData,...e.detail.value},this._dirty=!0}_onPresenceChanged(e){this._presenceData={...this._presenceData,...e.detail.value},this._dirty=!0}_onAlertsChanged(e){this._alertsData={...this._alertsData,...e.detail.value},this._dirty=!0}_onAdvancedChanged(e){this._advancedData={...this._advancedData,...e.detail.value},this._dirty=!0}async _save(){this._saving=!0;try{await this.api.updateGlobalConfig({...this._tempData,...this._presenceData,...this._alertsData,...this._advancedData,vacation_schedule_id:this._vacationScheduleId||null,presence_entities:this._presenceData.presence_entities||[],boiler_entity:this._advancedData.boiler_entity||null}),this._dirty=!1}catch(e){console.error("Failed to save settings:",e)}this._saving=!1}render(){if(!this._initialized)return o`<div class="container"><p>Loading...</p></div>`;const e=Object.values(this.hearthState.schedules);return o`
      <div class="container">
        <ha-card>
          <div class="nav-row" @click=${()=>this._navigate("/schedules")}>
            <ha-icon icon="mdi:calendar-clock" class="nav-icon"></ha-icon>
            <div class="nav-text">
              <span class="nav-label">Schedules</span>
              <span class="nav-meta">${Object.keys(this.hearthState.schedules).length} schedule${Object.keys(this.hearthState.schedules).length!==1?"s":""}</span>
            </div>
            <ha-icon icon="mdi:chevron-right" class="nav-chevron"></ha-icon>
          </div>
          <div class="nav-row" @click=${()=>this._navigate("/groups")}>
            <ha-icon icon="mdi:folder-multiple" class="nav-icon"></ha-icon>
            <div class="nav-text">
              <span class="nav-label">Area Groups</span>
              <span class="nav-meta">${Object.keys(this.hearthState.groups??{}).length} group${Object.keys(this.hearthState.groups??{}).length!==1?"s":""}</span>
            </div>
            <ha-icon icon="mdi:chevron-right" class="nav-chevron"></ha-icon>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Default Temperatures</h3>
            <p class="section-desc">Applied when creating new areas.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${vt}
              .data=${this._tempData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onTempChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Vacation</h3>
            <p class="section-desc">
              Default schedule to use when activating vacation mode.
              All areas will follow this schedule instead of their own.
            </p>
            <ha-form
              .hass=${this.hass}
              .schema=${[{name:"vacation_schedule_id",selector:{select:{mode:"dropdown",options:[{value:"",label:"None (ask when activating)"},...e.map(t=>({value:t.schedule_id,label:t.name}))]}}}]}
              .data=${{vacation_schedule_id:this._vacationScheduleId}}
              .computeLabel=${()=>"Vacation schedule"}
              @value-changed=${t=>{this._vacationScheduleId=t.detail.value.vacation_schedule_id??"",this._dirty=!0}}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Presence Detection</h3>
            <p class="section-desc">
              Automatically switch all areas to away when nobody is home.
            </p>
            <ha-form
              .hass=${this.hass}
              .schema=${gt}
              .data=${this._presenceData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onPresenceChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Alerts</h3>
            <p class="section-desc">Show a warning on the overview when device batteries are low.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${ft}
              .data=${this._alertsData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onAlertsChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Boiler</h3>
            <p class="section-desc">Control a boiler relay based on aggregated heat demand.</p>
            <ha-form
              .hass=${this.hass}
              .schema=${bt}
              .data=${this._advancedData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onAdvancedChanged}
            ></ha-form>
          </div>
        </ha-card>

        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Advanced</h3>
            <ha-form
              .hass=${this.hass}
              .schema=${yt}
              .data=${this._advancedData}
              .computeLabel=${this._computeLabel}
              @value-changed=${this._onAdvancedChanged}
            ></ha-form>
          </div>
        </ha-card>

        <div class="save-row">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty||this._saving}
          >
            ${this._saving?"Saving...":"Save"}
          </ha-button>
        </div>

        <div class="debug-link">
          <ha-button appearance="plain" @click=${()=>this._navigate("/debug")}>
            <ha-icon icon="mdi:bug" slot="icon"></ha-icon>
            Debug / Troubleshooting
          </ha-button>
        </div>
      </div>
    `}};S.styles=[k,R,y`
      ha-card {
        margin-bottom: var(--ha-space-6, 24px);
      }
      .card-content {
        padding: var(--ha-space-4, 16px);
      }
      .section-title {
        margin: 0 0 var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--primary-text-color);
      }
      .section-desc {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
        margin: 0 0 var(--ha-space-4, 16px);
      }
      .save-row {
        display: flex;
        justify-content: flex-end;
        margin-top: var(--ha-space-2, 8px);
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-m, 14px);
        color: var(--primary-text-color);
      }
      .nav-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-3, 12px);
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        cursor: pointer;
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }
      .nav-row:last-child, .nav-row:last-of-type {
        border-bottom: none;
      }
      .nav-row:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .nav-icon {
        color: var(--secondary-text-color);
        --mdc-icon-size: 24px;
        flex-shrink: 0;
      }
      .nav-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .nav-label {
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .nav-meta {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .nav-chevron {
        color: var(--secondary-text-color);
        --mdc-icon-size: 18px;
        flex-shrink: 0;
      }
      .nav-setting {
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .debug-link {
        display: flex;
        justify-content: center;
        margin-top: var(--ha-space-6, 24px);
        padding-top: var(--ha-space-4, 16px);
        border-top: 1px solid var(--divider-color, #e0e0e0);
      }
      .field select {
        padding: var(--ha-space-2, 8px);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: var(--ha-border-radius-md, 8px);
        background: var(--card-background-color, white);
        color: var(--primary-text-color);
        font-size: var(--ha-font-size-m, 14px);
        font-family: inherit;
      }
    `];M([h({attribute:!1})],S.prototype,"hass",2);M([h({attribute:!1})],S.prototype,"api",2);M([h({attribute:!1})],S.prototype,"hearthState",2);M([h({type:Boolean})],S.prototype,"narrow",2);M([p()],S.prototype,"_tempData",2);M([p()],S.prototype,"_presenceData",2);M([p()],S.prototype,"_alertsData",2);M([p()],S.prototype,"_advancedData",2);M([p()],S.prototype,"_vacationScheduleId",2);M([p()],S.prototype,"_dirty",2);M([p()],S.prototype,"_saving",2);S=M([w("settings-view")],S);var xt=Object.defineProperty,wt=Object.getOwnPropertyDescriptor,ae=(e,t,a,s)=>{for(var i=s>1?void 0:s?wt(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&xt(t,a,i),i};let G=class extends x{constructor(){super(...arguments),this.narrow=!1,this._devices=[],this._loading=!0,this._actionStatus={}}connectedCallback(){super.connectedCallback(),this._updateToolbar(),this._loadDiagnostics()}_updateToolbar(){this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:"Debug",backPath:"/settings"},bubbles:!0,composed:!0}))}async _loadDiagnostics(){this._loading=!0;try{const e=await this.api.getDiagnostics();this._devices=e.devices}catch(e){console.error("Failed to load diagnostics:",e)}this._loading=!1}async _doAction(e,t){this._actionStatus={...this._actionStatus,[e]:`${t}...`};try{await this.api.deviceAction(e,t),this._actionStatus={...this._actionStatus,[e]:`${t} OK`}}catch(a){this._actionStatus={...this._actionStatus,[e]:`${t} failed: ${a.message??a}`}}setTimeout(()=>{this._actionStatus={...this._actionStatus,[e]:""}},3e3)}render(){return this._loading?o`<div class="container"><p>Loading diagnostics...</p></div>`:this._devices.length===0?o`<div class="container"><p>No devices configured.</p></div>`:o`
      <div class="container">
        <ha-button appearance="plain" @click=${()=>this._loadDiagnostics()}>
          <ha-icon icon="mdi:refresh" slot="icon"></ha-icon>
          Refresh
        </ha-button>

        ${this._renderGroupedDevices()}
      </div>
    `}_renderGroupedDevices(){var t,a;const e=new Map;for(const s of this._devices){const i=((a=(t=this.hearthState)==null?void 0:t.areas[s.area_id])==null?void 0:a.name)??s.area_id;e.has(i)||e.set(i,[]),e.get(i).push(s)}return Array.from(e.entries()).map(([s,i])=>o`
        <h3 class="area-heading">${s}</h3>
        ${i.map(r=>this._renderDevice(r))}
      `)}_renderDevice(e){const t=e.adapter_type==="danfoss_ally",a=this._actionStatus[e.entity_id]||"";return o`
      <ha-card>
        <div class="card-content">
          <div class="device-header">
            <span class="device-name">${e.friendly_name}</span>
            <span class="badge-row">
              ${e.zigbee_backend?o`<span class="adapter-badge zigbee">${e.zigbee_backend.toUpperCase()}</span>`:l}
              <span class="adapter-badge ${e.adapter_type}">
                ${t?"Danfoss":"Generic"}
              </span>
            </span>
          </div>

          <div class="info-grid">
            <span class="label">Entity</span>
            <span class="value mono">${e.entity_id}</span>

            <span class="label">State</span>
            <span class="value">${e.state}</span>

            <span class="label">Current</span>
            <span class="value">${e.current_temp!=null?`${e.current_temp.toFixed(1)}°C`:"—"}</span>

            <span class="label">Target</span>
            <span class="value">${e.target_temp!=null?`${e.target_temp.toFixed(1)}°C`:"—"}</span>

            ${e.battery!=null?o`
              <span class="label">Battery</span>
              <span class="value">${e.battery}%</span>
            `:l}

            ${t?o`
              <span class="label">IEEE</span>
              <span class="value mono">${e.ieee??"unknown"}</span>

              ${e.diagnostics?o`
                <span class="label">Software error</span>
                <span class="value ${e.diagnostics.has_error?"error":""}">${e.diagnostics.software_error??"—"}</span>

                <span class="label">Heating demand</span>
                <span class="value">${e.diagnostics.pi_heating_demand!=null?`${e.diagnostics.pi_heating_demand}%`:"—"}</span>

                <span class="label">Setpoint source</span>
                <span class="value ${e.diagnostics.setpoint_change_source&&e.diagnostics.setpoint_change_source!=="External"?"warn":""}">${e.diagnostics.setpoint_change_source??"—"}</span>

                <span class="label">Adaptation</span>
                <span class="value">${e.diagnostics.adaptation_run_status??"—"}</span>

                <span class="label">Motor steps</span>
                <span class="value">${e.diagnostics.motor_step_counter!=null?e.diagnostics.motor_step_counter.toLocaleString():"—"}</span>

                <span class="label">Link quality</span>
                <span class="value">${e.diagnostics.linkquality??"—"}</span>

                <span class="label">Pre-heat</span>
                <span class="value">${e.diagnostics.preheat_status??"—"}</span>
              `:o`
                <span class="label">Diagnostics</span>
                <span class="value">Waiting for first health check...</span>
              `}
            `:l}
          </div>

          ${t?o`
            <div class="actions">
              <ha-button @click=${()=>this._doAction(e.entity_id,"identify")}>
                <ha-icon icon="mdi:flash" slot="icon"></ha-icon>
                Identify
              </ha-button>
              <ha-button @click=${()=>this._doAction(e.entity_id,"time_sync")}>
                <ha-icon icon="mdi:clock-sync" slot="icon"></ha-icon>
                Sync time
              </ha-button>
              <ha-button @click=${()=>this._doAction(e.entity_id,"close_mounting_mode")}>
                <ha-icon icon="mdi:check" slot="icon"></ha-icon>
                Close mounting mode
              </ha-button>
              <ha-button @click=${()=>this._doAction(e.entity_id,"resync")}>
                <ha-icon icon="mdi:sync" slot="icon"></ha-icon>
                Resync
              </ha-button>
            </div>
          `:l}

          ${a?o`<div class="status">${a}</div>`:l}
        </div>
      </ha-card>
    `}};G.styles=[k,R,y`
      .area-heading {
        margin: var(--ha-space-4, 16px) 0 var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .area-heading:first-of-type {
        margin-top: 0;
      }
      ha-card {
        margin-bottom: var(--ha-space-4, 16px);
      }
      .card-content {
        padding: var(--ha-space-4, 16px);
      }
      .device-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--ha-space-3, 12px);
      }
      .device-name {
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .badge-row {
        display: flex;
        gap: var(--ha-space-1, 4px);
      }
      .adapter-badge {
        font-size: var(--ha-font-size-s, 12px);
        padding: 2px var(--ha-space-2, 8px);
        border-radius: var(--ha-border-radius-pill, 9999px);
        color: white;
      }
      .adapter-badge.danfoss_ally {
        background: var(--primary-color, #03a9f4);
      }
      .adapter-badge.zigbee {
        background: var(--success-color, #4caf50);
      }
      .adapter-badge.generic {
        background: var(--secondary-text-color, #9e9e9e);
      }
      .info-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: var(--ha-space-1, 4px) var(--ha-space-3, 12px);
        margin-bottom: var(--ha-space-3, 12px);
        font-size: var(--ha-font-size-m, 14px);
      }
      .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 12px);
      }
      .value {
        color: var(--primary-text-color);
      }
      .value.mono {
        font-family: monospace;
        font-size: var(--ha-font-size-s, 12px);
      }
      .value.warn {
        color: var(--warning-color, #ff9800);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .value.error {
        color: var(--error-color, #db4437);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .actions {
        display: flex;
        gap: var(--ha-space-2, 8px);
        flex-wrap: wrap;
      }
      .status {
        margin-top: var(--ha-space-2, 8px);
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
    `];ae([h({attribute:!1})],G.prototype,"hass",2);ae([h({attribute:!1})],G.prototype,"api",2);ae([h({attribute:!1})],G.prototype,"hearthState",2);ae([h({type:Boolean})],G.prototype,"narrow",2);ae([p()],G.prototype,"_devices",2);ae([p()],G.prototype,"_loading",2);ae([p()],G.prototype,"_actionStatus",2);G=ae([w("debug-view")],G);const $t="modulepreload",St=function(e){return"/hearth/frontend/"+e},Oe={},xe=function(t,a,s){let i=Promise.resolve();if(a&&a.length>0){let n=function(u){return Promise.all(u.map(_=>Promise.resolve(_).then(g=>({status:"fulfilled",value:g}),g=>({status:"rejected",reason:g}))))};document.getElementsByTagName("link");const c=document.querySelector("meta[property=csp-nonce]"),d=(c==null?void 0:c.nonce)||(c==null?void 0:c.getAttribute("nonce"));i=n(a.map(u=>{if(u=St(u),u in Oe)return;Oe[u]=!0;const _=u.endsWith(".css"),g=_?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${g}`))return;const v=document.createElement("link");if(v.rel=_?"stylesheet":$t,_||(v.as="script"),v.crossOrigin="",v.href=u,d&&v.setAttribute("nonce",d),document.head.appendChild(v),_)return new Promise((m,f)=>{v.addEventListener("load",m),v.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${u}`)))})}))}function r(n){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=n,window.dispatchEvent(c),!c.defaultPrevented)throw n}return i.then(n=>{for(const c of n||[])c.status==="rejected"&&r(c.reason);return t().catch(r)})};var Dt=Object.defineProperty,kt=Object.getOwnPropertyDescriptor,F=(e,t,a,s)=>{for(var i=s>1?void 0:s?kt(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Dt(t,a,i),i};let Se=null;async function Ct(){if(Se)return Se;const[e,t,a,s]=await Promise.all([xe(()=>import("./assets/core-BrVw2LCo.js"),__vite__mapDeps([0,1,2,3])),xe(()=>import("./assets/charts-lpQQN2Ks.js"),__vite__mapDeps([4,2,1,3,5])),xe(()=>import("./assets/components-D_JDMQgr.js"),__vite__mapDeps([6,2,1,5])),xe(()=>import("./assets/renderers-BUy3EJql.js"),__vite__mapDeps([7,2]))]);return e.use([t.LineChart,a.GridComponent,a.TooltipComponent,a.LegendComponent,a.MarkLineComponent,s.CanvasRenderer]),Se=e,e}let E=class extends x{constructor(){super(...arguments),this.areaId="",this.narrow=!1,this._series=[],this._stateHistory=[],this._commandLog=[],this._loading=!0,this._hours=24,this._chart=null,this._resizeObserver=null}get _area(){return this.hearthState.areas[this.areaId]}connectedCallback(){super.connectedCallback(),this._updateToolbar(),this._loadData()}disconnectedCallback(){super.disconnectedCallback(),this._disposeChart()}willUpdate(e){e.has("areaId")&&(this._updateToolbar(),this._loadData())}updated(e){(e.has("_series")||e.has("_loading"))&&this._updateChart()}_updateToolbar(){const e=this._area,t=e?pe(e):this.areaId;this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:`${t} - Stats`,backPath:`/area/${this.areaId}`},bubbles:!0,composed:!0}))}async _loadData(){this._loading=!0,await Promise.all([this._loadAllSeries(),this._loadTransitions(),this._loadCommandLog()]),this._loading=!1}async _loadAllSeries(){var g,v;const e=this._area;if(!e){this._series=[];return}const t=["#4fc3f7","#81c784","#ffb74d","#e57373","#ba68c8","#4db6ac"],a=`sensor.hearth_${this.areaId}_current_temperature`,s=`sensor.hearth_${this.areaId}_target_temperature`,i=e.climate_entities??[],r=e.temperature_sensors??[],n=[a,s,...i,...r],c=new Date(Date.now()-this._hours*36e5);let d={};try{const m=await this.hass.callWS({type:"recorder/statistics_during_period",start_time:c.toISOString(),statistic_ids:[a,s,...r],period:this._hours<=12?"5minute":"hour",types:["mean"]});for(const[f,b]of Object.entries(m))d[f]=this._parseStats(b)}catch{}const u=[];for(const m of n)(!d[m]||d[m].length<3)&&u.push(m);if(u.length>0)try{const m=await this.hass.callWS({type:"history/history_during_period",start_time:c.toISOString(),entity_ids:u,significant_changes_only:!1,minimal_response:!1,no_attributes:!1});for(const[f,b]of Object.entries(m))i.includes(f)?(d[`${f}__current`]=this._parseClimateHistory(b,"current_temperature"),d[`${f}__target`]=this._parseClimateHistory(b,"temperature")):(!d[f]||d[f].length<3)&&(d[f]=this._parseHistoryAsStats(b))}catch(m){console.error("Failed to load history:",m)}const _=[];(g=d[a])!=null&&g.length&&_.push({name:"Area Current",points:d[a],color:"#03a9f4",width:2.5,dashed:!1,step:!0}),(v=d[s])!=null&&v.length&&_.push({name:"Area Target",points:d[s],color:"#ff9800",width:2,dashed:!0,step:!0}),i.forEach((m,f)=>{var Te,Ee,ze,Ie;const b=t[f%t.length],J=(((Ee=(Te=this.hass.states[m])==null?void 0:Te.attributes)==null?void 0:Ee.friendly_name)??m).replace(/^Danfoss\s*(TRV\s*)?/i,""),q=`${m}__current`,me=`${m}__target`;(ze=d[q])!=null&&ze.length&&_.push({name:`${J} current`,points:d[q],color:b,width:1,dashed:!1,step:!1}),(Ie=d[me])!=null&&Ie.length&&_.push({name:`${J} target`,points:d[me],color:b,width:1,dashed:!0,step:!0})}),r.forEach((m,f)=>{var J,q,me;const b="#ab47bc",ue=((q=(J=this.hass.states[m])==null?void 0:J.attributes)==null?void 0:q.friendly_name)??m;(me=d[m])!=null&&me.length&&_.push({name:ue,points:d[m],color:b,width:1.5,dashed:!1,step:!1})}),this._series=_}async _loadTransitions(){const e=`sensor.hearth_${this.areaId}_state`,t=new Date(Date.now()-this._hours*36e5);try{const s=((await this.hass.callWS({type:"history/history_during_period",start_time:t.toISOString(),entity_ids:[e],significant_changes_only:!1,minimal_response:!0,no_attributes:!0}))[e]??[]).filter(i=>{const r=i.s??i.state;return r&&r!=="unavailable"&&r!=="unknown"});this._stateHistory=this._parseStateHistory(s)}catch{this._stateHistory=[]}}async _loadCommandLog(){try{const e=await this.api.getCommandLog({areaId:this.areaId});this._commandLog=e.log}catch{this._commandLog=[]}}_parseStats(e){return e.filter(t=>t.mean!=null).map(t=>({start:new Date(t.start).getTime(),mean:t.mean}))}_parseHistoryAsStats(e){return e.filter(t=>{const a=parseFloat(t.s??t.state);return!isNaN(a)}).map(t=>({start:t.lu?t.lu*1e3:new Date(t.last_updated??t.last_changed).getTime(),mean:parseFloat(t.s??t.state)}))}_parseClimateHistory(e,t){var s,i;const a=[];for(const r of e){const n=((s=r.a)==null?void 0:s[t])??((i=r.attributes)==null?void 0:i[t]);if(n!=null&&!isNaN(parseFloat(n))){const c=r.lu?r.lu*1e3:new Date(r.last_updated??r.last_changed).getTime();a.push({start:c,mean:parseFloat(n)})}}return a}_parseStateHistory(e){const t=[];for(let a=0;a<e.length;a++){const s=e[a],i=s.lu?s.lu*1e3:new Date(s.last_updated??s.last_changed).getTime(),r=s.s??s.state,n=a<e.length-1?e[a+1].lu?e[a+1].lu*1e3:new Date(e[a+1].last_updated??e[a+1].last_changed).getTime():null;t.push({time:i,state:r,duration:n?(n-i)/1e3:null})}return t}_setHours(e){this._hours=e,this._disposeChart(),this._loadData()}_getChartContainer(){return this.renderRoot.querySelector("#chart-container")}async _updateChart(){var i,r;const e=this._getChartContainer();if(!e)return;if(this._series.length===0){this._disposeChart();return}if(!this._chart){const n=await Ct();this._chart=n.init(e),this._resizeObserver=new ResizeObserver(()=>{var c;return(c=this._chart)==null?void 0:c.resize()}),this._resizeObserver.observe(e)}const t=getComputedStyle(this),a=t.getPropertyValue("--secondary-text-color").trim()||"#9e9e9e",s=t.getPropertyValue("--divider-color").trim()||"#e0e0e0";this._chart.setOption({tooltip:{trigger:"axis",axisPointer:{type:"cross"},valueFormatter:n=>`${n.toFixed(1)}°C`},legend:{data:this._series.map(n=>n.name),textStyle:{color:a,fontSize:11},bottom:0,type:"scroll"},grid:{left:45,right:15,top:10,bottom:50},xAxis:{type:"time",axisLabel:{color:a,fontSize:11},splitLine:{show:!1},axisLine:{lineStyle:{color:s}}},yAxis:{type:"value",min:((i=this._area)==null?void 0:i.min_temp)??4,max:((r=this._area)==null?void 0:r.max_temp)??35,axisLabel:{color:a,fontSize:11,formatter:"{value}°"},splitLine:{lineStyle:{color:s,type:"dashed"}}},series:this._series.map(n=>({name:n.name,type:"line",step:n.step?"end":!1,data:n.points.map(c=>[c.start,c.mean]),lineStyle:{color:n.color,width:n.width,type:n.dashed?"dashed":"solid"},itemStyle:{color:n.color},symbol:n.points.length<10?"circle":"none",symbolSize:3,smooth:!1})),animation:!1},!0)}_disposeChart(){var e,t;(e=this._resizeObserver)==null||e.disconnect(),this._resizeObserver=null,(t=this._chart)==null||t.dispose(),this._chart=null}render(){var t;if(this._loading)return o`<div class="container"><p>Loading statistics...</p></div>`;const e=this._area;return e?o`
      <div class="container">
        <div class="top-actions">
          <ha-button appearance="plain" @click=${()=>this._loadData()}>
            <ha-icon icon="mdi:refresh" slot="icon"></ha-icon>
            Refresh
          </ha-button>
        </div>

        <div class="time-range">
          ${[6,12,24,48,72].map(a=>o`
            <ha-button
              .outlined=${this._hours!==a}
              @click=${()=>this._setHours(a)}
              class=${this._hours===a?"active":""}
            >${a}h</ha-button>
          `)}
        </div>

        <!-- Temperature chart -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Temperature History</h3>
            ${this._series.length>0?o`<div id="chart-container" style="width:100%;height:300px;"></div>`:o`<p class="empty-text">No temperature data recorded yet.</p>`}
          </div>
        </ha-card>

        <!-- Climate devices -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Climate Devices</h3>
            ${e.devices.map(a=>o`
              <div class="device-card">
                <div class="device-header-row">
                  <span class="device-name">${a.friendly_name||a.entity_id}</span>
                  <span class="badge-row">
                    ${a.covered?o`<span class="badge covered">Covered</span>`:l}
                    ${a.zigbee_backend?o`<span class="badge zigbee">${a.zigbee_backend.toUpperCase()}</span>`:l}
                    ${a.adapter_type==="danfoss_ally"?o`<span class="badge danfoss">Danfoss</span>`:l}
                  </span>
                </div>
                <div class="device-stats">
                  <span>Current: ${a.current_temp!=null?`${a.current_temp.toFixed(1)}°C`:"—"}</span>
                  <span class=${a.target_temp!=null&&e.target_temp!=null&&Math.abs(a.target_temp-e.target_temp)>.05?"pending":""}>Target: ${a.target_temp!=null?`${a.target_temp.toFixed(1)}°C`:"—"}</span>
                  <span>Battery: ${a.battery!=null?`${a.battery}%`:"—"}</span>
                </div>
                ${a.diagnostics?o`
                  <div class="device-stats diagnostics">
                    ${a.diagnostics.software_error!=null?o`<span class=${a.diagnostics.has_error?"error":""}>Error: ${a.diagnostics.software_error}</span>`:l}
                    ${a.diagnostics.pi_heating_demand!=null?o`<span>Demand: ${a.diagnostics.pi_heating_demand}%</span>`:l}
                    ${a.diagnostics.setpoint_change_source!=null?o`<span class=${a.diagnostics.setpoint_change_source!=="External"?"warn":""}>Source: ${a.diagnostics.setpoint_change_source}</span>`:l}
                    ${a.diagnostics.adaptation_run_status!=null?o`<span>Adaptation: ${a.diagnostics.adaptation_run_status}</span>`:l}
                    ${a.diagnostics.motor_step_counter!=null?o`<span>Steps: ${a.diagnostics.motor_step_counter.toLocaleString()}</span>`:l}
                    ${a.diagnostics.linkquality!=null?o`<span>LQI: ${a.diagnostics.linkquality}</span>`:l}
                  </div>
                `:l}
                ${a.feature_status&&Object.keys(a.feature_status).length>0?o`
                  <div class="feature-status">
                    ${Object.entries(a.feature_status).map(([s,i])=>o`
                      <span class="feat-item" title=${i}>${s}: ${this._relativeTime(i)}</span>
                    `)}
                  </div>
                `:l}
              </div>
            `)}
          </div>
        </ha-card>

        <!-- Temperature sensors -->
        ${((t=e.temperature_sensor_details)==null?void 0:t.length)>0?o`
          <ha-card>
            <div class="card-content">
              <h3 class="section-title">Temperature Sensors</h3>
              ${e.temperature_sensor_details.map(a=>o`
                <div class="device-card">
                  <div class="device-header-row">
                    <span class="device-name">${a.friendly_name}</span>
                    <span class="badge-row">
                      <span class="badge sensor">Sensor</span>
                    </span>
                  </div>
                  <div class="device-stats">
                    <span>Reading: ${a.current_temp!=null?`${a.current_temp.toFixed(1)}°C`:"—"}</span>
                    ${a.battery!=null?o`<span>Battery: ${a.battery}%</span>`:l}
                  </div>
                </div>
              `)}
            </div>
          </ha-card>
        `:l}

        <!-- Transition log -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Transition Log</h3>
            ${this._stateHistory.length===0?o`<p class="empty-text">No transitions recorded yet.</p>`:o`
                <div class="transition-list">
                  ${this._stateHistory.slice().reverse().slice(0,50).map(a=>o`
                    <div class="transition-row">
                      <span class="trans-time">${new Date(a.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>
                      <span class="mode-badge ${a.state}">${a.state}</span>
                      <span class="trans-duration">${a.duration!=null?this._formatDuration(a.duration):"ongoing"}</span>
                    </div>
                  `)}
                </div>
              `}
          </div>
        </ha-card>

        <!-- Danfoss command log -->
        ${this._commandLog.length>0?o`
          <ha-card>
            <div class="card-content">
              <h3 class="section-title">Danfoss Command Log</h3>
              <div class="command-list">
                ${this._commandLog.slice().reverse().slice(0,50).map(a=>o`
                  <div class="command-row">
                    <span class="cmd-time">${new Date(a.timestamp).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
                    <span class="cmd-name ${a.success?"ok":"fail"}">${a.command}</span>
                    <span class="cmd-detail">
                      ${a.detail}
                      ${a.repeat_count&&a.repeat_count>1?o`
                        <span class="cmd-repeat" title="last at ${a.last_timestamp?new Date(a.last_timestamp).toLocaleTimeString():""}">×${a.repeat_count}</span>
                      `:l}
                    </span>
                  </div>
                `)}
              </div>
            </div>
          </ha-card>
        `:l}
      </div>
    `:o`<div class="container"><p>Area not found.</p></div>`}_relativeTime(e){const t=(Date.now()-new Date(e).getTime())/1e3;return t<60?"just now":t<3600?`${Math.round(t/60)}m ago`:t<86400?`${Math.round(t/3600)}h ago`:`${Math.round(t/86400)}d ago`}_formatDuration(e){if(e<60)return`${Math.round(e)}s`;if(e<3600)return`${Math.round(e/60)}m`;const t=Math.floor(e/3600),a=Math.round(e%3600/60);return a>0?`${t}h ${a}m`:`${t}h`}};E.styles=[k,R,we,y`
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
    `];F([h({attribute:!1})],E.prototype,"hass",2);F([h({attribute:!1})],E.prototype,"api",2);F([h({attribute:!1})],E.prototype,"hearthState",2);F([h()],E.prototype,"areaId",2);F([h({type:Boolean})],E.prototype,"narrow",2);F([p()],E.prototype,"_series",2);F([p()],E.prototype,"_stateHistory",2);F([p()],E.prototype,"_commandLog",2);F([p()],E.prototype,"_loading",2);F([p()],E.prototype,"_hours",2);E=F([w("area-stats-view")],E);var Tt=Object.defineProperty,Et=Object.getOwnPropertyDescriptor,Z=(e,t,a,s)=>{for(var i=s>1?void 0:s?Et(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Tt(t,a,i),i};let j=class extends x{constructor(){super(...arguments),this.areaId="",this.showMinMax=!1,this.useCards=!1,this.showCustomizeSchedule=!1,this.excludeClimateEntities=[]}_section(e){return this.useCards?o`<ha-card><div class="card-content">${e}</div></ha-card>`:e}_emit(e){this.dispatchEvent(new CustomEvent("data-changed",{detail:{...this.data,...e},bubbles:!0}))}render(){const e=this.data,t=this.hearthState.global,a=Object.values(this.hearthState.schedules),s=this.showMinMax?[{type:"grid",name:"",schema:[{name:"home_temp",selector:{number:{min:e.min_temp,max:e.max_temp,step:.5,unit_of_measurement:"°C",mode:"box"}}},{name:"away_temp",selector:{number:{min:e.min_temp,max:e.max_temp,step:.5,unit_of_measurement:"°C",mode:"box"}}}]},{type:"grid",name:"",schema:[{name:"min_temp",selector:{number:{min:t.default_min_temp,max:t.default_max_temp,step:.5,unit_of_measurement:"°C",mode:"box"}}},{name:"max_temp",selector:{number:{min:t.default_min_temp,max:t.default_max_temp,step:.5,unit_of_measurement:"°C",mode:"box"}}}]}]:[{type:"grid",name:"",schema:[{name:"home_temp",selector:{number:{min:t.default_min_temp,max:t.default_max_temp,step:.5,unit_of_measurement:"°C",mode:"box"}}},{name:"away_temp",selector:{number:{min:t.default_min_temp,max:t.default_max_temp,step:.5,unit_of_measurement:"°C",mode:"box"}}}]}],i=this.excludeClimateEntities.length>0?[{name:"climate_entities",selector:{entity:{domain:["climate"],multiple:!0,exclude_entities:this.excludeClimateEntities}}}]:[{name:"climate_entities",selector:{entity:{domain:["climate"],multiple:!0}}}],r=e.climate_entities.filter(n=>{const c=this.hass.states[n];return!c||c.state==="unavailable"});return o`
      ${this._section(o`
        <h3 class="section-title first">Climate entities</h3>
        ${r.length>0?o`<p class="warning-text">${r.length} device${r.length>1?"s":""} unavailable</p>`:l}
        <ha-form
          .hass=${this.hass}
          .schema=${i}
          .data=${{climate_entities:e.climate_entities}}
          .computeLabel=${()=>"TRVs / thermostats"}
          @value-changed=${n=>this._emit({climate_entities:n.detail.value.climate_entities??[]})}
        ></ha-form>
      `)}

      ${this._section(o`
        <h3 class="section-title ${this.useCards?"first":""}">Temperature sensors</h3>
        ${e.temperature_sensors.length===0?o`<p class="hint-text">No external sensors: room temperature will be read from the TRV's built-in sensor.</p>`:l}
        <ha-form
          .hass=${this.hass}
          .schema=${[{name:"temperature_sensors",selector:{entity:{domain:["sensor"],device_class:"temperature",multiple:!0,include_entities:Ue(this.hass,this.areaId)}}}]}
          .data=${{temperature_sensors:e.temperature_sensors}}
          .computeLabel=${()=>"External sensors"}
          @value-changed=${n=>this._emit({temperature_sensors:n.detail.value.temperature_sensors??[]})}
        ></ha-form>
      `)}

      ${e.climate_entities.length>0?this._section(o`
        <h3 class="section-title ${this.useCards?"first":""}">Radiator covered</h3>
        <p class="hint-text">Mark TRVs behind a radiator cover. Covered TRVs require an external temperature sensor.</p>
        ${e.climate_entities.map(n=>{var _;const c=this.hass.states[n],d=((_=c==null?void 0:c.attributes)==null?void 0:_.friendly_name)??n,u=e.covered_entities.includes(n);return o`
            <ha-formfield .label=${d}>
              <ha-switch
                .checked=${u}
                @change=${g=>{const v=g.target.checked;this._emit({covered_entities:v?[...e.covered_entities,n]:e.covered_entities.filter(m=>m!==n)})}}
              ></ha-switch>
            </ha-formfield>
          `})}
        ${e.covered_entities.length>0&&e.temperature_sensors.length===0?o`<p class="warning-text">Covered TRVs require an external temperature sensor.</p>`:l}
      `):l}

      ${this._section(o`
        <h3 class="section-title ${this.useCards?"first":""}">Window sensors <span class="untested-badge">UNTESTED</span></h3>
        <p class="hint-text">Optional: Reduce heating when windows are open.</p>
        <ha-form
          .hass=${this.hass}
          .schema=${[{name:"window_sensors",selector:{entity:{domain:["binary_sensor"],device_class:"window",multiple:!0}}}]}
          .data=${{window_sensors:e.window_sensors}}
          .computeLabel=${()=>"Window sensors"}
          @value-changed=${n=>this._emit({window_sensors:n.detail.value.window_sensors??[]})}
        ></ha-form>
      `)}

      ${this._section(o`
        <h3 class="section-title ${this.useCards?"first":""}">Temperatures</h3>
        <ha-form
          .hass=${this.hass}
          .schema=${s}
          .data=${{home_temp:e.home_temp,away_temp:e.away_temp,min_temp:e.min_temp,max_temp:e.max_temp}}
          .computeLabel=${n=>({home_temp:"Home temp",away_temp:"Away temp",min_temp:"Min temp",max_temp:"Max temp"})[n.name]??n.name}
          @value-changed=${n=>{const c=n.detail.value;this._emit({home_temp:c.home_temp,away_temp:c.away_temp,...this.showMinMax?{min_temp:c.min_temp,max_temp:c.max_temp}:{}})}}
        ></ha-form>
      `)}

      ${a.length>0?this._section(o`
        <h3 class="section-title ${this.useCards?"first":""}">Schedule</h3>
        <ha-form
          .hass=${this.hass}
          .schema=${[{name:"schedule_id",selector:{select:{mode:"dropdown",options:a.map(n=>({value:n.schedule_id,label:n.name}))}}}]}
          .data=${{schedule_id:e.schedule_id}}
          .computeLabel=${()=>"Schedule"}
          @value-changed=${n=>this._emit({schedule_id:n.detail.value.schedule_id??""})}
        ></ha-form>
        ${this.showCustomizeSchedule?o`
              <ha-button appearance="plain" style="margin-top: var(--ha-space-3, 12px)" @click=${()=>this.dispatchEvent(new CustomEvent("customize-schedule",{bubbles:!0}))}>
                <ha-icon icon="mdi:pencil-plus" slot="icon"></ha-icon>
                Customize schedule for this area
              </ha-button>
            `:l}
      `):l}
    `}};j.styles=[k,y`
      :host { display: block; }
      .section-title {
        margin: var(--ha-space-6, 24px) 0 var(--ha-space-1, 4px);
        font-size: var(--ha-font-size-m, 14px);
        font-weight: var(--ha-font-weight-medium, 500);
        color: var(--secondary-text-color);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .section-title.first { margin-top: 0; }
      ha-card { margin-bottom: var(--ha-space-6, 24px); }
      .card-content { padding: var(--ha-space-4, 16px); }
      .hint-text {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-1, 4px);
        font-style: italic;
      }
      .warning-text {
        color: var(--error-color, #db4437);
        font-size: var(--ha-font-size-s, 12px);
        margin: 0 0 var(--ha-space-1, 4px);
      }
      .untested-badge {
        font-size: 9px;
        background: var(--warning-color, #ff9800);
        color: white;
        padding: 1px 5px;
        border-radius: var(--ha-border-radius-pill, 9999px);
        vertical-align: middle;
        text-transform: none;
        letter-spacing: 0;
      }
    `];Z([h({attribute:!1})],j.prototype,"hass",2);Z([h({attribute:!1})],j.prototype,"hearthState",2);Z([h({attribute:!1})],j.prototype,"data",2);Z([h()],j.prototype,"areaId",2);Z([h({type:Boolean})],j.prototype,"showMinMax",2);Z([h({type:Boolean})],j.prototype,"useCards",2);Z([h({type:Boolean})],j.prototype,"showCustomizeSchedule",2);Z([h({attribute:!1})],j.prototype,"excludeClimateEntities",2);j=Z([w("area-form")],j);var zt=Object.defineProperty,It=Object.getOwnPropertyDescriptor,U=(e,t,a,s)=>{for(var i=s>1?void 0:s?It(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&zt(t,a,i),i};let I=class extends x{constructor(){super(...arguments),this.areaId="",this.narrow=!1,this._formData=null,this._loading=!1,this._confirmDelete=!1,this._dirty=!1}get _area(){return this.hearthState.areas[this.areaId]}connectedCallback(){super.connectedCallback(),this._syncFromState(),this._updateToolbar()}willUpdate(e){e.has("areaId")&&(this._syncFromState(),this._updateToolbar()),e.has("hearthState")&&!this._dirty&&this._syncFromState()}_syncFromState(){const e=this._area;e&&(this._formData={climate_entities:[...e.climate_entities??[]],covered_entities:[...e.covered_entities??[]],temperature_sensors:e.temperature_sensors??[],window_sensors:e.window_sensors??[],home_temp:e.home_temp,away_temp:e.away_temp,min_temp:e.min_temp,max_temp:e.max_temp,schedule_id:e.schedule_id??""},this._dirty=!1,this._confirmDelete=!1)}_updateToolbar(){const e=this._area,t=e?pe(e):this.areaId;this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:`${t} - Settings`,backPath:`/area/${this.areaId}`},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}_onFormChanged(e){this._formData=e.detail,this._dirty=!0}async _save(){if(!this._formData)return;const e=this._formData,t=this.hearthState.global.default_min_temp,a=this.hearthState.global.default_max_temp,s=de(e.min_temp,t,a),i=de(e.max_temp,t,a);this._loading=!0;try{await this.api.updateArea(this.areaId,{home_temp:de(e.home_temp,s,i),away_temp:de(e.away_temp,s,i),min_temp:s,max_temp:i,climate_entities:e.climate_entities,covered_entities:e.covered_entities,temperature_sensors:e.temperature_sensors,window_sensors:e.window_sensors,schedule_id:e.schedule_id||null}),this._dirty=!1}catch(r){console.error("Failed to save area settings:",r)}this._loading=!1}_isSharedSchedule(){var e;return(e=this._formData)!=null&&e.schedule_id?Object.values(this.hearthState.areas).filter(t=>t.schedule_id===this._formData.schedule_id).length>1:!1}async _customizeSchedule(){var t;const e=this._area;if(!(!e||!((t=this._formData)!=null&&t.schedule_id))){this._loading=!0;try{const a=`${this.areaId}_custom`;await this.api.duplicateSchedule({source_schedule_id:this._formData.schedule_id,new_schedule_id:a,new_name:`${pe(e)} Schedule`,area_id:this.areaId}),this._formData={...this._formData,schedule_id:a}}catch(a){console.error("Failed to customize schedule:",a)}this._loading=!1}}async _syncSchedule(){this._loading=!0;try{await this.api.syncSchedule(this.areaId)}catch(e){console.error("Failed to sync schedule:",e)}this._loading=!1}async _handleDelete(){this._loading=!0;try{await this.api.removeArea(this.areaId),this._navigate("/")}catch(e){console.error("Failed to remove area:",e)}this._loading=!1}_getExcludedClimateEntities(){const e=[];for(const[t,a]of Object.entries(this.hearthState.areas))if(t!==this.areaId)for(const s of a.climate_entities)e.push(s);return e}render(){return!this._formData||!this._area?o`<div class="container"><p>Area not found.</p></div>`:o`
      <div class="container">
        <area-form
          .hass=${this.hass}
          .hearthState=${this.hearthState}
          .data=${this._formData}
          .areaId=${this.areaId}
          .showMinMax=${!0}
          .useCards=${!0}
          .showCustomizeSchedule=${!!(this._formData.schedule_id&&this._isSharedSchedule())}
          .excludeClimateEntities=${this._getExcludedClimateEntities()}
          @data-changed=${this._onFormChanged}
          @customize-schedule=${()=>this._customizeSchedule()}
        ></area-form>

        <div class="save-row">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty||this._loading}
          >
            ${this._loading?"Saving...":"Save"}
          </ha-button>
        </div>

        <div class="actions-section">
          <ha-button appearance="plain" @click=${()=>this._syncSchedule()}>
            <ha-icon icon="mdi:calendar-sync" slot="icon"></ha-icon>
            Sync schedule
          </ha-button>

          ${this._confirmDelete?o`
                <ha-button appearance="plain" variant="danger"
                  @click=${()=>this._handleDelete()} .disabled=${this._loading}>
                  Confirm remove area?
                </ha-button>
              `:o`
                <ha-button appearance="plain" variant="danger"
                  @click=${()=>this._confirmDelete=!0}>
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  Remove area
                </ha-button>
              `}
        </div>
      </div>
    `}};I.styles=[k,R,y`
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
    `];U([h({attribute:!1})],I.prototype,"hass",2);U([h({attribute:!1})],I.prototype,"api",2);U([h({attribute:!1})],I.prototype,"hearthState",2);U([h()],I.prototype,"areaId",2);U([h({type:Boolean})],I.prototype,"narrow",2);U([p()],I.prototype,"_formData",2);U([p()],I.prototype,"_loading",2);U([p()],I.prototype,"_confirmDelete",2);U([p()],I.prototype,"_dirty",2);I=U([w("area-settings-view")],I);var At=Object.defineProperty,Ot=Object.getOwnPropertyDescriptor,se=(e,t,a,s)=>{for(var i=s>1?void 0:s?Ot(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&At(t,a,i),i};let H=class extends x{constructor(){super(...arguments),this.narrow=!1,this._showCreateDialog=!1,this._newGroupName="",this._creating=!1}connectedCallback(){super.connectedCallback(),this._updateToolbar()}willUpdate(e){e.has("hearthState")&&this._updateToolbar()}_updateToolbar(){this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:"Area Groups",backPath:"/settings"},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}async _createGroup(){const e=this._newGroupName.trim();if(!e)return;const t=e.toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,""),a=Object.keys(this.hearthState.groups??{}).length;this._creating=!0;try{await this.api.addGroup({group_id:t,name:e,order:a}),this._newGroupName="",this._showCreateDialog=!1,this._navigate(`/group/${t}/settings`)}catch(s){console.error("Failed to create group:",s)}this._creating=!1}_getSortedGroups(){return Object.values(this.hearthState.groups??{}).sort((e,t)=>e.order-t.order)}async _moveGroup(e,t){const a=this._getSortedGroups(),s=a.findIndex(n=>n.group_id===e),i=s+t;if(i<0||i>=a.length)return;const r=[...a];[r[s],r[i]]=[r[i],r[s]],await this.api.reorderGroups(r.map(n=>n.group_id))}render(){const e=this._getSortedGroups();return o`
      <div class="container">
        ${e.length===0?o`
              <div class="empty-state">
                <h2>No groups</h2>
                <p>Groups let you organize areas and optionally share a schedule across multiple areas.</p>
              </div>
            `:o`
              <div class="group-list">
                ${e.map((t,a)=>o`
                    <div class="group-row">
                      <div
                        class="group-info"
                        @click=${()=>this._navigate(`/group/${t.group_id}/settings`)}
                      >
                        <span class="group-name">${t.name}</span>
                        <span class="group-meta">
                          ${t.area_ids.length} area${t.area_ids.length!==1?"s":""}${t.schedule_id&&this.hearthState.schedules[t.schedule_id]?` · ${this.hearthState.schedules[t.schedule_id].name}`:""}
                        </span>
                      </div>
                      <div class="group-actions">
                        <ha-icon-button
                          .label=${"Move up"}
                          .disabled=${a===0}
                          @click=${s=>{s.stopPropagation(),this._moveGroup(t.group_id,-1)}}
                        >
                          <ha-icon icon="mdi:arrow-up"></ha-icon>
                        </ha-icon-button>
                        <ha-icon-button
                          .label=${"Move down"}
                          .disabled=${a===e.length-1}
                          @click=${s=>{s.stopPropagation(),this._moveGroup(t.group_id,1)}}
                        >
                          <ha-icon icon="mdi:arrow-down"></ha-icon>
                        </ha-icon-button>
                        <ha-icon icon="mdi:chevron-right" class="chevron"
                          @click=${()=>this._navigate(`/group/${t.group_id}/settings`)}
                        ></ha-icon>
                      </div>
                    </div>
                  `)}
              </div>
            `}
      </div>

      ${this._showCreateDialog?o`
            <div class="dialog-overlay" @click=${()=>this._showCreateDialog=!1}>
              <ha-card class="dialog-card" @click=${t=>t.stopPropagation()}>
                <div class="dialog-header">
                  <h2>Create Group</h2>
                  <ha-icon-button .label=${"Close"} @click=${()=>this._showCreateDialog=!1}>
                    <ha-icon icon="mdi:close"></ha-icon>
                  </ha-icon-button>
                </div>
                <div class="dialog-body">
                  <ha-form
                    .hass=${this.hass}
                    .schema=${[{name:"name",selector:{text:{}}}]}
                    .data=${{name:this._newGroupName}}
                    .computeLabel=${()=>"Group name"}
                    @value-changed=${t=>{this._newGroupName=t.detail.value.name??""}}
                  ></ha-form>
                  <ha-button
                    style="margin-top: var(--ha-space-3, 12px)"
                    @click=${this._createGroup}
                    .disabled=${!this._newGroupName.trim()||this._creating}
                  >
                    Create
                  </ha-button>
                </div>
              </ha-card>
            </div>
          `:l}

      <button class="fab" @click=${()=>this._showCreateDialog=!0}>
        <ha-icon icon="mdi:plus"></ha-icon>
      </button>
    `}};H.styles=[k,R,ve,y`
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
    `];se([h({attribute:!1})],H.prototype,"hass",2);se([h({attribute:!1})],H.prototype,"api",2);se([h({attribute:!1})],H.prototype,"hearthState",2);se([h({type:Boolean})],H.prototype,"narrow",2);se([p()],H.prototype,"_showCreateDialog",2);se([p()],H.prototype,"_newGroupName",2);se([p()],H.prototype,"_creating",2);H=se([w("groups-view")],H);var Mt=Object.defineProperty,Pt=Object.getOwnPropertyDescriptor,P=(e,t,a,s)=>{for(var i=s>1?void 0:s?Pt(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Mt(t,a,i),i};let D=class extends x{constructor(){super(...arguments),this.groupId="",this.narrow=!1,this._name="",this._scheduleId=null,this._areaIds=[],this._dirty=!1,this._loading=!1,this._confirmDelete=!1}get _group(){var e;return(e=this.hearthState.groups)==null?void 0:e[this.groupId]}connectedCallback(){super.connectedCallback(),this._syncFromState(),this._updateToolbar()}willUpdate(e){e.has("groupId")&&(this._syncFromState(),this._updateToolbar()),e.has("hearthState")&&!this._dirty&&this._syncFromState()}_syncFromState(){const e=this._group;e&&(this._name=e.name,this._scheduleId=e.schedule_id,this._areaIds=[...e.area_ids],this._dirty=!1,this._confirmDelete=!1)}_updateToolbar(){const e=this._group;this.dispatchEvent(new CustomEvent("set-toolbar",{detail:{title:e?`${e.name} - Settings`:"Group Settings",backPath:"/groups"},bubbles:!0,composed:!0}))}_navigate(e){this.dispatchEvent(new CustomEvent("navigate",{detail:{path:e},bubbles:!0}))}_getUngroupedAreas(){const e=new Set;for(const t of Object.values(this.hearthState.groups??{}))for(const a of t.area_ids)e.add(a);return Object.values(this.hearthState.areas).filter(t=>!e.has(t.area_id)||this._areaIds.includes(t.area_id)).filter(t=>!this._areaIds.includes(t.area_id)).map(t=>({area_id:t.area_id,name:pe(t)}))}_moveArea(e,t){const a=e+t;if(a<0||a>=this._areaIds.length)return;const s=[...this._areaIds];[s[e],s[a]]=[s[a],s[e]],this._areaIds=s,this._dirty=!0}_removeArea(e){this._areaIds=this._areaIds.filter(t=>t!==e),this._dirty=!0}_addArea(e){this._areaIds.includes(e)||(this._areaIds=[...this._areaIds,e],this._dirty=!0)}async _save(){this._loading=!0;try{await this.api.updateGroup(this.groupId,{name:this._name,schedule_id:this._scheduleId||null,area_ids:this._areaIds}),this._dirty=!1}catch(e){console.error("Failed to save group:",e)}this._loading=!1}async _handleDelete(){this._loading=!0;try{await this.api.removeGroup(this.groupId),this._navigate("/")}catch(e){console.error("Failed to delete group:",e)}this._loading=!1}render(){if(!this._group)return o`<div class="container"><p>Group not found.</p></div>`;const t=Object.values(this.hearthState.schedules),a=this._getUngroupedAreas();return o`
      <div class="container">
        <!-- Name -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Name</h3>
            <ha-form
              .hass=${this.hass}
              .schema=${[{name:"name",selector:{text:{}}}]}
              .data=${{name:this._name}}
              .computeLabel=${()=>"Group name"}
              @value-changed=${s=>{this._name=s.detail.value.name??"",this._dirty=!0}}
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
              .schema=${[{name:"schedule_id",selector:{select:{mode:"dropdown",options:[{value:"",label:"None (use per-area schedules)"},...t.map(s=>({value:s.schedule_id,label:s.name}))]}}}]}
              .data=${{schedule_id:this._scheduleId??""}}
              .computeLabel=${()=>"Group schedule"}
              @value-changed=${s=>{this._scheduleId=s.detail.value.schedule_id||null,this._dirty=!0}}
            ></ha-form>
          </div>
        </ha-card>

        <!-- Areas -->
        <ha-card>
          <div class="card-content">
            <h3 class="section-title">Areas</h3>
            ${this._areaIds.length===0?o`<p class="hint-text">No areas in this group yet.</p>`:o`
                  <div class="area-list">
                    ${this._areaIds.map((s,i)=>{const r=this.hearthState.areas[s],n=r?pe(r):s;return o`
                        <div class="area-row">
                          <span class="area-name">${n}</span>
                          <div class="area-actions">
                            <ha-icon-button
                              .label=${"Move up"}
                              .disabled=${i===0}
                              @click=${()=>this._moveArea(i,-1)}
                            >
                              <ha-icon icon="mdi:arrow-up"></ha-icon>
                            </ha-icon-button>
                            <ha-icon-button
                              .label=${"Move down"}
                              .disabled=${i===this._areaIds.length-1}
                              @click=${()=>this._moveArea(i,1)}
                            >
                              <ha-icon icon="mdi:arrow-down"></ha-icon>
                            </ha-icon-button>
                            <ha-icon-button
                              .label=${"Remove"}
                              @click=${()=>this._removeArea(s)}
                            >
                              <ha-icon icon="mdi:close"></ha-icon>
                            </ha-icon-button>
                          </div>
                        </div>
                      `})}
                  </div>
                `}
            ${a.length>0?o`
                  <div class="add-area-section">
                    <ha-form
                      .hass=${this.hass}
                      .schema=${[{name:"add_area",selector:{select:{mode:"dropdown",options:a.map(s=>({value:s.area_id,label:s.name}))}}}]}
                      .data=${{add_area:""}}
                      .computeLabel=${()=>"Add area to group"}
                      @value-changed=${s=>{const i=s.detail.value.add_area;i&&this._addArea(i)}}
                    ></ha-form>
                  </div>
                `:l}
          </div>
        </ha-card>

        <!-- Save -->
        <div class="save-row">
          <ha-button
            @click=${this._save}
            .disabled=${!this._dirty||this._loading}
          >
            ${this._loading?"Saving...":"Save"}
          </ha-button>
        </div>

        <!-- Delete -->
        <div class="actions-section">
          ${this._confirmDelete?o`
                <ha-button appearance="plain" variant="danger"
                  @click=${()=>this._handleDelete()} .disabled=${this._loading}>
                  Confirm delete group?
                </ha-button>
                <ha-button appearance="plain" @click=${()=>this._confirmDelete=!1}>
                  Cancel
                </ha-button>
              `:o`
                <ha-button appearance="plain" variant="danger"
                  @click=${()=>this._confirmDelete=!0}>
                  <ha-icon icon="mdi:delete" slot="icon"></ha-icon>
                  Delete group
                </ha-button>
              `}
        </div>
      </div>
    `}};D.styles=[k,R,y`
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
    `];P([h({attribute:!1})],D.prototype,"hass",2);P([h({attribute:!1})],D.prototype,"api",2);P([h({attribute:!1})],D.prototype,"hearthState",2);P([h()],D.prototype,"groupId",2);P([h({type:Boolean})],D.prototype,"narrow",2);P([p()],D.prototype,"_name",2);P([p()],D.prototype,"_scheduleId",2);P([p()],D.prototype,"_areaIds",2);P([p()],D.prototype,"_dirty",2);P([p()],D.prototype,"_loading",2);P([p()],D.prototype,"_confirmDelete",2);D=P([w("group-settings-view")],D);var Lt=Object.defineProperty,jt=Object.getOwnPropertyDescriptor,W=(e,t,a,s)=>{for(var i=s>1?void 0:s?jt(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Lt(t,a,i),i};let A=class extends x{constructor(){super(...arguments),this._open=!1,this._step=0,this._discovered=[],this._loading=!1,this._selectedArea=null,this._formData=this._defaultFormData()}_defaultFormData(){var a,s;const e=(a=this.hearthState)==null?void 0:a.global,t=Object.values(((s=this.hearthState)==null?void 0:s.schedules)??{});return{climate_entities:[],covered_entities:[],temperature_sensors:[],window_sensors:[],home_temp:(e==null?void 0:e.default_home_temp)??21,away_temp:(e==null?void 0:e.default_away_temp)??17,min_temp:(e==null?void 0:e.default_min_temp)??4,max_temp:(e==null?void 0:e.default_max_temp)??35,schedule_id:t.length>0?t[0].schedule_id:""}}async open(){this._step=0,this._selectedArea=null,this._formData=this._defaultFormData(),this._open=!0,this._loading=!0;try{this._discovered=await this.api.discoverAreas()}catch(e){console.error("Failed to discover areas:",e)}this._loading=!1}_close(){this._open=!1}_selectArea(e){this._selectedArea=e,this._formData={...this._formData,climate_entities:[...e.climate_entities],temperature_sensors:e.temperature_sensors??[]},this._step=1}async _save(){if(!this._selectedArea||this._formData.climate_entities.length===0)return;const e=this._formData,t=this.hearthState.global.default_min_temp,a=this.hearthState.global.default_max_temp;this._loading=!0;try{await this.api.addArea({area_id:this._selectedArea.area_id,climate_entities:e.climate_entities,temperature_sensors:e.temperature_sensors.length>0?e.temperature_sensors:void 0,covered_entities:e.covered_entities.length>0?e.covered_entities:void 0,window_sensors:e.window_sensors.length>0?e.window_sensors:void 0,home_temp:de(e.home_temp,t,a),away_temp:de(e.away_temp,t,a),schedule_id:e.schedule_id||void 0}),this._close()}catch(s){console.error("Failed to add area:",s)}this._loading=!1}render(){var t;if(!this._open)return l;const e=this._step===0?"Add Area":((t=this._selectedArea)==null?void 0:t.area_name)??"Configure Area";return o`
      <div class="dialog-overlay" @click=${this._close}>
        <ha-card class="dialog-card" @click=${a=>a.stopPropagation()}>
          <div class="dialog-header">
            <h2>${e}</h2>
            <ha-icon-button .label=${"Close"} @click=${this._close}>
              <ha-icon icon="mdi:close"></ha-icon>
            </ha-icon-button>
          </div>
          <div class="dialog-body">
            ${this._loading?o`<p>Loading...</p>`:this._step===0?this._renderDiscovery():this._renderConfigure()}
          </div>
        </ha-card>
      </div>
    `}_renderDiscovery(){const e=this._discovered.filter(t=>!t.already_configured);return e.length===0?o`<p>${this._discovered.length===0?"No areas with climate entities found.":"All areas with TRVs are already configured."}</p>`:o`
      <p>Select an area to add:</p>
      <div class="area-list">
        ${e.map(t=>o`
          <ha-card @click=${()=>this._selectArea(t)} class="area-item">
            <div class="card-content area-row">
              <span>${t.area_name}</span>
              <span class="secondary-label">
                ${t.climate_entities.length} TRV${t.climate_entities.length!==1?"s":""}
              </span>
            </div>
          </ha-card>
        `)}
      </div>
    `}_renderConfigure(){var e;return o`
      <div class="form">
        <area-form
          .hass=${this.hass}
          .hearthState=${this.hearthState}
          .data=${this._formData}
          .areaId=${((e=this._selectedArea)==null?void 0:e.area_id)??""}
          @data-changed=${t=>this._formData=t.detail}
        ></area-form>
      </div>

      <div class="dialog-actions">
        <ha-button appearance="plain" @click=${()=>this._step=0}>Back</ha-button>
        <ha-button @click=${this._save} .disabled=${this._formData.climate_entities.length===0}>
          Save
        </ha-button>
      </div>
    `}};A.styles=[k,Le,ve,y`
      .area-list { display: flex; flex-direction: column; gap: var(--ha-space-2, 8px); }
      .area-item { cursor: pointer; }
      .area-row { display: flex; justify-content: space-between; align-items: center; }
      .secondary-label { color: var(--secondary-text-color); font-size: var(--hearth-text-between-s-m, 13px); }
    `];W([h({attribute:!1})],A.prototype,"hass",2);W([h({attribute:!1})],A.prototype,"api",2);W([h({attribute:!1})],A.prototype,"hearthState",2);W([p()],A.prototype,"_open",2);W([p()],A.prototype,"_step",2);W([p()],A.prototype,"_discovered",2);W([p()],A.prototype,"_loading",2);W([p()],A.prototype,"_selectedArea",2);W([p()],A.prototype,"_formData",2);A=W([w("area-setup-dialog")],A);var Nt=Object.defineProperty,Ft=Object.getOwnPropertyDescriptor,Q=(e,t,a,s)=>{for(var i=s>1?void 0:s?Ft(t,a):t,r=e.length-1,n;r>=0;r--)(n=e[r])&&(i=(s?n(t,a,i):n(i))||i);return s&&i&&Nt(t,a,i),i};let N=class extends x{constructor(){super(...arguments),this.narrow=!1,this._path="",this._hearthState=null,this._toolbar={title:"Hearth"},this._haReady=!1,this._onPopState=()=>{var e;this._path=((e=this.route)==null?void 0:e.path)||"/",this.requestUpdate()},this._handleAddArea=()=>{const e=this.shadowRoot.querySelector("area-setup-dialog");e&&e.open()},this._onSetToolbar=e=>{this._toolbar=e.detail},this._onNavigate=e=>{this.navigate(e.detail.path)}}connectedCallback(){super.connectedCallback(),window.addEventListener("popstate",this._onPopState),this.addEventListener("add-area",this._handleAddArea),this._lastConnection=void 0,customElements.get("ha-card")?this._haReady=!0:customElements.whenDefined("ha-card").then(()=>{this._haReady=!0})}disconnectedCallback(){super.disconnectedCallback(),window.removeEventListener("popstate",this._onPopState),this.removeEventListener("add-area",this._handleAddArea),this._unsubscribe()}willUpdate(e){e.has("hass")&&this.hass&&(this._api=new We(this.hass),this._lastConnection!==this.hass.connection&&(this._lastConnection=this.hass.connection,this._subscribe())),e.has("route")&&this.route&&(this._path=this.route.path||"/")}async _subscribe(){this._unsubscribe();try{this._unsub=await this._api.subscribe(e=>{this._hearthState=e})}catch(e){console.error("Failed to subscribe to Hearth state:",e)}}_unsubscribe(){this._unsub&&(this._unsub(),this._unsub=void 0)}_toggleMenu(){this.dispatchEvent(new CustomEvent("hass-toggle-menu",{bubbles:!0,composed:!0}))}navigate(e){const t=`/hearth${e==="/"?"":e}`;history.pushState(null,"",t),this._path=e}render(){if(!this._haReady)return o`<div class="loading">Loading...</div>`;const e=this._toolbar;return o`
      <div class="toolbar">
        ${this.narrow&&!e.backPath?o`
              <ha-icon-button
                .label=${"Menu"}
                @click=${this._toggleMenu}
              >
                <ha-icon icon="mdi:menu"></ha-icon>
              </ha-icon-button>
            `:l}
        ${e.backPath?o`
              <ha-icon-button
                .label=${"Back"}
                @click=${()=>this.navigate(e.backPath)}
              >
                <ha-icon icon="mdi:arrow-left"></ha-icon>
              </ha-icon-button>
            `:l}
        <div class="toolbar-title">${e.title}</div>
        <div class="toolbar-actions">
          ${e.actions?e.actions:l}
        </div>
      </div>
      <div class="content">
        ${this._renderContent()}
      </div>

      ${this._hearthState?o`
            <area-setup-dialog
              .hass=${this.hass}
              .api=${this._api}
              .hearthState=${this._hearthState}
            ></area-setup-dialog>
          `:l}
    `}_renderContent(){if(!this._hearthState)return o`<div class="loading">Loading...</div>`;const e=this._path.match(/^\/group\/(.+)\/settings$/),t=this._path.match(/^\/area\/(.+)\/stats$/),a=this._path.match(/^\/area\/(.+)\/settings$/),s=this._path.match(/^\/area\/(.+)$/),i=this._path.match(/^\/schedule\/(.+)$/);if(this._path==="/groups")return o`
        <groups-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></groups-view>
      `;if(e){const r=decodeURIComponent(e[1]);return o`
        <group-settings-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .groupId=${r}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></group-settings-view>
      `}if(t){const r=decodeURIComponent(t[1]);return o`
        <area-stats-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .areaId=${r}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></area-stats-view>
      `}if(a){const r=decodeURIComponent(a[1]);return o`
        <area-settings-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .areaId=${r}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></area-settings-view>
      `}if(s){const r=decodeURIComponent(s[1]);return o`
        <area-detail-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .areaId=${r}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></area-detail-view>
      `}if(this._path==="/schedules")return o`
        <schedules-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></schedules-view>
      `;if(i){const r=decodeURIComponent(i[1]);return o`
        <schedule-editor-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .groupId=${r}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></schedule-editor-view>
      `}return this._path==="/debug"?o`
        <debug-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></debug-view>
      `:this._path==="/settings"?o`
        <settings-view
          .hass=${this.hass}
          .api=${this._api}
          .hearthState=${this._hearthState}
          .narrow=${this.narrow}
          @navigate=${this._onNavigate}
          @set-toolbar=${this._onSetToolbar}
        ></settings-view>
      `:o`
      <overview-view
        .hass=${this.hass}
        .api=${this._api}
        .hearthState=${this._hearthState}
        .narrow=${this.narrow}
        @navigate=${this._onNavigate}
        @set-toolbar=${this._onSetToolbar}
      ></overview-view>
    `}};N.styles=[k,we,y`
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
    `];Q([h({attribute:!1})],N.prototype,"hass",2);Q([h({type:Boolean,reflect:!0})],N.prototype,"narrow",2);Q([h({attribute:!1})],N.prototype,"route",2);Q([h({attribute:!1})],N.prototype,"panel",2);Q([p()],N.prototype,"_path",2);Q([p()],N.prototype,"_hearthState",2);Q([p()],N.prototype,"_toolbar",2);Q([p()],N.prototype,"_haReady",2);N=Q([w("hearth-panel")],N);
