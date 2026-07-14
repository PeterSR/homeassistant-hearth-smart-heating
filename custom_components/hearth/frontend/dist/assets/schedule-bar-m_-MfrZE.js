import{a as v,c as o,t as b,i as g,n as p}from"./utils-enLgS1ZL.js";var f=Object.defineProperty,l=(u,e,i,h)=>{for(var s=void 0,r=u.length-1,t;r>=0;r--)(t=u[r])&&(s=t(e,i,s)||s);return s&&f(e,i,s),s};const c=class c extends v{constructor(){super(...arguments),this.entries=[],this.homeTemp=21,this.awayTemp=17}_entryToMinutes(e){if(e.time.includes("T")){const s=new Date(e.time);return s.getHours()*60+s.getMinutes()}const[i,h]=e.time.split(":").map(Number);return i*60+h}_entryIsHome(e){return e.state!==void 0?e.state==="home":e.temp==="home"?!0:e.temp==="away"?!1:Number(e.temp)>=(this.homeTemp+this.awayTemp)/2}_entryIsUser(e){return e.source==="user"}_entryTemp(e){return e.state!==void 0?e.state==="home"?this.homeTemp:this.awayTemp:e.temp==="home"?this.homeTemp:e.temp==="away"?this.awayTemp:Number(e.temp)}_entryTimeLabel(e){return e.time.includes("T")?new Date(e.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}):e.time}render(){if(this.entries.length===0)return o`<div class="bar-container">
        <div class="no-schedule">No schedule for today</div>
      </div>`;const e=1440,i=new Date,s=(i.getHours()*60+i.getMinutes())/e*100,r=[];for(let t=0;t<this.entries.length;t++){const a=this.entries[t],m=this._entryToMinutes(a),d=t<this.entries.length-1?this._entryToMinutes(this.entries[t+1]):e;r.push({start:m,end:d,isHome:this._entryIsHome(a),isUser:this._entryIsUser(a),temp:this._entryTemp(a)})}if(r.length>0&&r[0].start>0){const t=this.entries[this.entries.length-1];r.unshift({start:0,end:r[0].start,isHome:this._entryIsHome(t),isUser:this._entryIsUser(t),temp:this._entryTemp(t)})}return o`
      <div class="bar-container">
        <div class="bar">
          ${r.map(t=>{const a=t.start/e*100,m=(t.end-t.start)/e*100;return o`
              <div
                class="segment ${t.isHome?"home":"away"} ${t.isUser?"user":""}"
                style="left:${a}%;width:${m}%"
                title="${t.temp}°C"
              ></div>
            `})}
          <div class="now-marker" style="left:${s}%"></div>
        </div>
        <div class="labels">
          ${this.entries.map(t=>o`
              <span
                class="label"
                style="left:${this._entryToMinutes(t)/e*100}%"
              >
                ${this._entryTimeLabel(t)}
              </span>
            `)}
        </div>
      </div>
    `}};c.styles=[b,g`
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
    `];let n=c;l([p({attribute:!1})],n.prototype,"entries");l([p({type:Number})],n.prototype,"homeTemp");l([p({type:Number})],n.prototype,"awayTemp");customElements.get("schedule-bar")||customElements.define("schedule-bar",n);
