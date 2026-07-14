import{c as i,y as w,A as x,l as S,t as y,i as u,r,b as A,a as $,H as v}from"./assets/utils-enLgS1ZL.js";import"./assets/schedule-bar-m_-MfrZE.js";var k=Object.defineProperty,o=(d,t,e,s)=>{for(var a=void 0,l=d.length-1,g;l>=0;l--)(g=d[l])&&(a=g(t,e,a)||a);return a&&k(t,e,a),a};class p extends ${constructor(){super(...arguments),this._config={},this._hearthState=null}set hass(t){this._hass=t,!this._api&&t?(this._api=new v(t),this._subscribe()):this._api&&t&&(this._api=new v(t)),this.requestUpdate()}connectedCallback(){super.connectedCallback(),this._api&&!this._unsub&&this._subscribe()}disconnectedCallback(){super.disconnectedCallback(),this._unsub&&(this._unsub(),this._unsub=void 0)}async _subscribe(){if(this._unsub&&(this._unsub(),this._unsub=void 0),!!this._api)try{this._unsub=await this._api.subscribe(t=>{this._hearthState=t,this.requestUpdate()})}catch(t){console.error("Hearth card subscribe failed",t)}}}const f=class f extends p{constructor(){super(...arguments),this._config={},this._hearthState=null}setConfig(t){if(!t.area_id)throw new Error("Please set area_id");this._config=t}getCardSize(){return 3}render(){if(!this._hearthState)return i`<ha-card><div class="loading">Loading...</div></ha-card>`;const t=this._hearthState.areas[this._config.area_id];if(!t)return i`<ha-card><div class="loading">Area not found</div></ha-card>`;const e=t.today_schedule??[],s=w(t);return i`
      <ha-card>
        <div class="content">
          <div class="header">
            <span class="name">${S(t)}</span>
            ${s?i`<span class="next">${s}</span>`:x}
          </div>
          <schedule-bar
            .entries=${e}
            .homeTemp=${t.home_temp}
            .awayTemp=${t.away_temp}
          ></schedule-bar>
        </div>
      </ha-card>
    `}};f.styles=[y,u`
      .content { padding: var(--ha-space-4, 16px); }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--ha-space-2, 8px);
      }
      .name {
        font-weight: var(--ha-font-weight-medium, 500);
        font-size: var(--ha-font-size-m, 14px);
      }
      .next {
        font-size: var(--ha-font-size-s, 12px);
        color: var(--secondary-text-color);
      }
      .loading {
        padding: var(--ha-space-4, 16px);
        color: var(--secondary-text-color);
      }
    `];let n=f;o([r()],n.prototype,"_config");o([r()],n.prototype,"_hearthState");const _=class _ extends p{constructor(){super(...arguments),this._config={},this._hearthState=null}setConfig(t){this._config=t}getCardSize(){return 2}async _homeAll(){if(!(!this._api||!this._hearthState)){await this._api.setVacation(!1);for(const t of Object.keys(this._hearthState.areas))await this._api.setAreaState(t,"home")}}async _awayAll(){if(!(!this._api||!this._hearthState))for(const t of Object.keys(this._hearthState.areas))await this._api.setAreaState(t,"away")}async _toggleVacation(){if(!this._api||!this._hearthState)return;if(this._hearthState.global.vacation_mode)await this._api.setVacation(!1);else{const e=this._hearthState.global.vacation_schedule_id,s=this._hearthState.schedules;if(e&&s[e])await this._api.setVacation(!0);else{const a=Object.keys(s)[0];a&&await this._api.setVacation(!0,a)}}}render(){if(!this._hearthState)return i`<ha-card><div class="loading">Loading...</div></ha-card>`;const t=this._hearthState.global.vacation_mode;return i`
      <ha-card>
        <div class="content">
          <ha-button @click=${this._homeAll}>
            <ha-icon icon="mdi:home" slot="icon"></ha-icon>
            Home All
          </ha-button>
          <ha-button @click=${this._awayAll}>
            <ha-icon icon="mdi:exit-run" slot="icon"></ha-icon>
            Away All
          </ha-button>
          <ha-button @click=${this._toggleVacation}>
            <ha-icon icon="mdi:beach" slot="icon"></ha-icon>
            ${t?"Vacation Off":"Vacation On"}
          </ha-button>
        </div>
      </ha-card>
    `}};_.styles=u`
    .content {
      display: flex;
      gap: var(--ha-space-2, 8px);
      padding: var(--ha-space-4, 16px);
      justify-content: center;
      flex-wrap: wrap;
    }
    .loading {
      padding: var(--ha-space-4, 16px);
      color: var(--secondary-text-color);
    }
  `;let c=_;o([r()],c.prototype,"_config");o([r()],c.prototype,"_hearthState");const b={home:"var(--hearth-color-home, #039be5)",away:"var(--hearth-color-away, #9e9e9e)",off:"var(--hearth-color-off, #bdbdbd)",vacation:"var(--hearth-color-vacation, #ffb300)"},m=class m extends p{constructor(){super(...arguments),this._config={},this._hearthState=null}setConfig(t){this._config=t}getCardSize(){return 1}render(){if(!this._hearthState)return i`<ha-card><div class="chip loading">...</div></ha-card>`;const t=A(this._hearthState),e=t??"mixed",s=t?b[t]??b.off:"var(--secondary-text-color)",a=this._hearthState.global.auto_away_active;return i`
      <ha-card>
        <div class="chip" style="--chip-color: ${s}">
          <ha-icon icon=${this._stateIcon(t)}></ha-icon>
          <span class="label">${e}${a?" (auto)":""}</span>
        </div>
      </ha-card>
    `}_stateIcon(t){switch(t){case"home":return"mdi:home";case"away":return"mdi:exit-run";case"vacation":return"mdi:beach";case"off":return"mdi:power-off";default:return"mdi:home-thermometer"}}};m.styles=[y,u`
      ha-card {
        overflow: hidden;
      }
      .chip {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2, 8px);
        padding: var(--ha-space-3, 12px) var(--ha-space-4, 16px);
        color: white;
        background: var(--chip-color);
        font-weight: var(--ha-font-weight-medium, 500);
        text-transform: capitalize;
      }
      .chip.loading {
        background: var(--divider-color);
        color: var(--secondary-text-color);
      }
      .label {
        font-size: var(--ha-font-size-m, 14px);
      }
    `];let h=m;o([r()],h.prototype,"_config");o([r()],h.prototype,"_hearthState");customElements.get("hearth-schedule-card")||customElements.define("hearth-schedule-card",n);customElements.get("hearth-actions-card")||customElements.define("hearth-actions-card",c);customElements.get("hearth-status-card")||customElements.define("hearth-status-card",h);window.customCards=window.customCards||[];window.customCards.push({type:"hearth-schedule-card",name:"Hearth Schedule",description:"Today's heating schedule for an area",preview:!0},{type:"hearth-actions-card",name:"Hearth Actions",description:"Home All / Away All / Vacation buttons",preview:!0},{type:"hearth-status-card",name:"Hearth Status",description:"Shows the current global heating state",preview:!0});
