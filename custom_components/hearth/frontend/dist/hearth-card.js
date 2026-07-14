import{a as _,H as o,c as s,i as l,r as d}from"./assets/utils-enLgS1ZL.js";import"./assets/area-card-h4w293EW.js";var p=Object.defineProperty,u=(n,a,h,b)=>{for(var t=void 0,i=n.length-1,c;i>=0;i--)(c=n[i])&&(t=c(a,h,t)||t);return t&&p(a,h,t),t};const r=class r extends _{constructor(){super(...arguments),this._config={},this._hearthState=null}setConfig(a){if(!a.area_id)throw new Error("Please select an area");this._config=a}set hass(a){this._hass=a,!this._api&&a?(this._api=new o(a),this._subscribe()):this._api&&a&&(this._api=new o(a)),this.requestUpdate()}disconnectedCallback(){super.disconnectedCallback(),this._unsub&&(this._unsub(),this._unsub=void 0)}connectedCallback(){super.connectedCallback(),this._api&&!this._unsub&&this._subscribe()}async _subscribe(){if(this._unsub&&(this._unsub(),this._unsub=void 0),!!this._api)try{this._unsub=await this._api.subscribe(a=>{this._hearthState=a})}catch(a){console.error("Hearth card: subscribe failed",a)}}getCardSize(){return 3}_navigate(){window.location.href=`/hearth/area/${this._config.area_id}`}render(){if(!this._hearthState)return s`<ha-card><div class="loading">Loading...</div></ha-card>`;const a=this._hearthState.areas[this._config.area_id];return a?s`
      <area-card
        .hass=${this._hass}
        .area=${a}
        @click=${this._navigate}
      ></area-card>
    `:s`<ha-card><div class="loading">Area not found</div></ha-card>`}};r.styles=l`
    .loading {
      padding: var(--ha-space-4, 16px);
      color: var(--secondary-text-color);
    }
  `;let e=r;u([d()],e.prototype,"_config");u([d()],e.prototype,"_hearthState");customElements.define("hearth-area-card",e);window.customCards=window.customCards||[];window.customCards.push({type:"hearth-area-card",name:"Hearth Area",description:"Displays a Hearth area with current/target temperature and state",preview:!0});
