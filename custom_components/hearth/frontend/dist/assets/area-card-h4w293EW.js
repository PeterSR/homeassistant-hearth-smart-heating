import{a as f,l as v,x as l,y as x,A as m,c as o,t as g,m as w,i as u,n}from"./utils-enLgS1ZL.js";var b=Object.defineProperty,i=(p,s,r,h)=>{for(var a=void 0,t=p.length-1,d;t>=0;t--)(d=p[t])&&(a=d(s,r,a)||a);return a&&b(s,r,a),a};const c=class c extends f{constructor(){super(...arguments),this.hideStateBadge=!1}render(){const s=v(this.area),r=l(this.area.current_temp),h=l(this.area.target_temp),a=x(this.area),t=this.area.effective_state;return o`
      <ha-card>
        <div class="card-content">
          <div class="row top-row">
            <span class="area-name">${s}</span>
            ${this.hideStateBadge?m:o`<span class="mode-badge ${t}">
                  ${t}${!this.area.following_schedule&&t!=="off"?" *":""}
                </span>`}
          </div>
          <div class="row temp-row">
            <span class="current-temp">${r}</span>
            <span class="arrow">→</span>
            <span class="target-temp">${h}</span>
          </div>
          <div class="row bottom-row">
            <span class="device-count">
              ${this.area.device_count} TRV${this.area.device_count!==1?"s":""}
            </span>
            ${a?o`<span class="next-transition">Next: ${a}</span>`:m}
          </div>
        </div>
      </ha-card>
    `}};c.styles=[g,w,u`
      :host {
        padding: 0;
      }
      ha-card {
        cursor: pointer;
        transition: box-shadow 0.2s;
      }
      ha-card:hover {
        box-shadow: var(--ha-box-shadow-m, 0 4px 8px 0 rgba(0, 0, 0, 0.08));
      }
      .card-content {
        padding: var(--ha-space-4, 16px);
      }
      .row {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .top-row {
        margin-bottom: var(--ha-space-2, 8px);
      }
      .area-name {
        font-size: var(--ha-font-size-l, 16px);
        font-weight: var(--ha-font-weight-medium, 500);
      }
      .temp-row {
        margin-bottom: var(--ha-space-2, 8px);
        gap: var(--ha-space-2, 8px);
        justify-content: flex-start;
      }
      .current-temp {
        font-size: var(--ha-font-size-3xl, 28px);
        font-weight: var(--ha-font-weight-light, 300);
      }
      .arrow {
        font-size: var(--ha-font-size-xl, 20px);
        color: var(--secondary-text-color);
      }
      .target-temp {
        font-size: var(--ha-font-size-3xl, 28px);
        font-weight: var(--ha-font-weight-normal, 400);
        color: var(--primary-color);
      }
      .bottom-row {
        font-size: var(--hearth-text-between-s-m, 13px);
        color: var(--secondary-text-color);
      }
      .next-transition {
        font-size: var(--hearth-text-between-xs-s, 11px);
      }
    `];let e=c;i([n({attribute:!1})],e.prototype,"hass");i([n({attribute:!1})],e.prototype,"area");i([n({type:Boolean})],e.prototype,"hideStateBadge");customElements.get("area-card")||customElements.define("area-card",e);
