/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const H=globalThis,I=H.ShadowRoot&&(H.ShadyCSS===void 0||H.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,B=Symbol(),G=new WeakMap;let rt=class{constructor(t,e,s){if(this._$cssResult$=!0,s!==B)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e}get styleSheet(){let t=this.o;const e=this.t;if(I&&t===void 0){const s=e!==void 0&&e.length===1;s&&(t=G.get(e)),t===void 0&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),s&&G.set(e,t))}return t}toString(){return this.cssText}};const lt=r=>new rt(typeof r=="string"?r:r+"",void 0,B),u=(r,...t)=>{const e=r.length===1?r[0]:t.reduce((s,i,a)=>s+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+r[a+1],r[0]);return new rt(e,r,B)},dt=(r,t)=>{if(I)r.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(const e of t){const s=document.createElement("style"),i=H.litNonce;i!==void 0&&s.setAttribute("nonce",i),s.textContent=e.cssText,r.appendChild(s)}},F=I?r=>r:r=>r instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return lt(e)})(r):r;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:pt,defineProperty:ut,getOwnPropertyDescriptor:ft,getOwnPropertyNames:mt,getOwnPropertySymbols:_t,getPrototypeOf:gt}=Object,g=globalThis,Z=g.trustedTypes,yt=Z?Z.emptyScript:"",R=g.reactiveElementPolyfillSupport,E=(r,t)=>r,N={toAttribute(r,t){switch(t){case Boolean:r=r?yt:null;break;case Object:case Array:r=r==null?r:JSON.stringify(r)}return r},fromAttribute(r,t){let e=r;switch(t){case Boolean:e=r!==null;break;case Number:e=r===null?null:Number(r);break;case Object:case Array:try{e=JSON.parse(r)}catch{e=null}}return e}},q=(r,t)=>!pt(r,t),J={attribute:!0,type:String,converter:N,reflect:!1,useDefault:!1,hasChanged:q};Symbol.metadata??(Symbol.metadata=Symbol("metadata")),g.litPropertyMetadata??(g.litPropertyMetadata=new WeakMap);let x=class extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??(this.l=[])).push(t)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,e=J){if(e.state&&(e.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(t)&&((e=Object.create(e)).wrapped=!0),this.elementProperties.set(t,e),!e.noAccessor){const s=Symbol(),i=this.getPropertyDescriptor(t,s,e);i!==void 0&&ut(this.prototype,t,i)}}static getPropertyDescriptor(t,e,s){const{get:i,set:a}=ft(this.prototype,t)??{get(){return this[e]},set(n){this[e]=n}};return{get:i,set(n){const h=i==null?void 0:i.call(this);a==null||a.call(this,n),this.requestUpdate(t,h,s)},configurable:!0,enumerable:!0}}static getPropertyOptions(t){return this.elementProperties.get(t)??J}static _$Ei(){if(this.hasOwnProperty(E("elementProperties")))return;const t=gt(this);t.finalize(),t.l!==void 0&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties)}static finalize(){if(this.hasOwnProperty(E("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(E("properties"))){const e=this.properties,s=[...mt(e),..._t(e)];for(const i of s)this.createProperty(i,e[i])}const t=this[Symbol.metadata];if(t!==null){const e=litPropertyMetadata.get(t);if(e!==void 0)for(const[s,i]of e)this.elementProperties.set(s,i)}this._$Eh=new Map;for(const[e,s]of this.elementProperties){const i=this._$Eu(e,s);i!==void 0&&this._$Eh.set(i,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(t){const e=[];if(Array.isArray(t)){const s=new Set(t.flat(1/0).reverse());for(const i of s)e.unshift(F(i))}else t!==void 0&&e.push(F(t));return e}static _$Eu(t,e){const s=e.attribute;return s===!1?void 0:typeof s=="string"?s:typeof t=="string"?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){var t;this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),(t=this.constructor.l)==null||t.forEach(e=>e(this))}addController(t){var e;(this._$EO??(this._$EO=new Set)).add(t),this.renderRoot!==void 0&&this.isConnected&&((e=t.hostConnected)==null||e.call(t))}removeController(t){var e;(e=this._$EO)==null||e.delete(t)}_$E_(){const t=new Map,e=this.constructor.elementProperties;for(const s of e.keys())this.hasOwnProperty(s)&&(t.set(s,this[s]),delete this[s]);t.size>0&&(this._$Ep=t)}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return dt(t,this.constructor.elementStyles),t}connectedCallback(){var t;this.renderRoot??(this.renderRoot=this.createRenderRoot()),this.enableUpdating(!0),(t=this._$EO)==null||t.forEach(e=>{var s;return(s=e.hostConnected)==null?void 0:s.call(e)})}enableUpdating(t){}disconnectedCallback(){var t;(t=this._$EO)==null||t.forEach(e=>{var s;return(s=e.hostDisconnected)==null?void 0:s.call(e)})}attributeChangedCallback(t,e,s){this._$AK(t,s)}_$ET(t,e){var a;const s=this.constructor.elementProperties.get(t),i=this.constructor._$Eu(t,s);if(i!==void 0&&s.reflect===!0){const n=(((a=s.converter)==null?void 0:a.toAttribute)!==void 0?s.converter:N).toAttribute(e,s.type);this._$Em=t,n==null?this.removeAttribute(i):this.setAttribute(i,n),this._$Em=null}}_$AK(t,e){var a,n;const s=this.constructor,i=s._$Eh.get(t);if(i!==void 0&&this._$Em!==i){const h=s.getPropertyOptions(i),o=typeof h.converter=="function"?{fromAttribute:h.converter}:((a=h.converter)==null?void 0:a.fromAttribute)!==void 0?h.converter:N;this._$Em=i;const c=o.fromAttribute(e,h.type);this[i]=c??((n=this._$Ej)==null?void 0:n.get(i))??c,this._$Em=null}}requestUpdate(t,e,s,i=!1,a){var n;if(t!==void 0){const h=this.constructor;if(i===!1&&(a=this[t]),s??(s=h.getPropertyOptions(t)),!((s.hasChanged??q)(a,e)||s.useDefault&&s.reflect&&a===((n=this._$Ej)==null?void 0:n.get(t))&&!this.hasAttribute(h._$Eu(t,s))))return;this.C(t,e,s)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(t,e,{useDefault:s,reflect:i,wrapped:a},n){s&&!(this._$Ej??(this._$Ej=new Map)).has(t)&&(this._$Ej.set(t,n??e??this[t]),a!==!0||n!==void 0)||(this._$AL.has(t)||(this.hasUpdated||s||(e=void 0),this._$AL.set(t,e)),i===!0&&this._$Em!==t&&(this._$Eq??(this._$Eq=new Set)).add(t))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}const t=this.scheduleUpdate();return t!=null&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){var s;if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??(this.renderRoot=this.createRenderRoot()),this._$Ep){for(const[a,n]of this._$Ep)this[a]=n;this._$Ep=void 0}const i=this.constructor.elementProperties;if(i.size>0)for(const[a,n]of i){const{wrapped:h}=n,o=this[a];h!==!0||this._$AL.has(a)||o===void 0||this.C(a,void 0,n,o)}}let t=!1;const e=this._$AL;try{t=this.shouldUpdate(e),t?(this.willUpdate(e),(s=this._$EO)==null||s.forEach(i=>{var a;return(a=i.hostUpdate)==null?void 0:a.call(i)}),this.update(e)):this._$EM()}catch(i){throw t=!1,this._$EM(),i}t&&this._$AE(e)}willUpdate(t){}_$AE(t){var e;(e=this._$EO)==null||e.forEach(s=>{var i;return(i=s.hostUpdated)==null?void 0:i.call(s)}),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(t)),this.updated(t)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return!0}update(t){this._$Eq&&(this._$Eq=this._$Eq.forEach(e=>this._$ET(e,this[e]))),this._$EM()}updated(t){}firstUpdated(t){}};x.elementStyles=[],x.shadowRootOptions={mode:"open"},x[E("elementProperties")]=new Map,x[E("finalized")]=new Map,R==null||R({ReactiveElement:x}),(g.reactiveElementVersions??(g.reactiveElementVersions=[])).push("2.1.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const C=globalThis,K=r=>r,k=C.trustedTypes,Q=k?k.createPolicy("lit-html",{createHTML:r=>r}):void 0,at="$lit$",_=`lit$${Math.random().toFixed(9).slice(2)}$`,nt="?"+_,$t=`<${nt}>`,b=document,P=()=>b.createComment(""),O=r=>r===null||typeof r!="object"&&typeof r!="function",V=Array.isArray,vt=r=>V(r)||typeof(r==null?void 0:r[Symbol.iterator])=="function",D=`[ 	
\f\r]`,w=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,X=/-->/g,Y=/>/g,y=RegExp(`>|${D}(?:([^\\s"'>=/]+)(${D}*=${D}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),tt=/'/g,et=/"/g,ot=/^(?:script|style|textarea|title)$/i,ht=r=>(t,...e)=>({_$litType$:r,strings:t,values:e}),Ht=ht(1),zt=ht(2),A=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),st=new WeakMap,$=b.createTreeWalker(b,129);function ct(r,t){if(!V(r)||!r.hasOwnProperty("raw"))throw Error("invalid template strings array");return Q!==void 0?Q.createHTML(t):t}const bt=(r,t)=>{const e=r.length-1,s=[];let i,a=t===2?"<svg>":t===3?"<math>":"",n=w;for(let h=0;h<e;h++){const o=r[h];let c,p,l=-1,f=0;for(;f<o.length&&(n.lastIndex=f,p=n.exec(o),p!==null);)f=n.lastIndex,n===w?p[1]==="!--"?n=X:p[1]!==void 0?n=Y:p[2]!==void 0?(ot.test(p[2])&&(i=RegExp("</"+p[2],"g")),n=y):p[3]!==void 0&&(n=y):n===y?p[0]===">"?(n=i??w,l=-1):p[1]===void 0?l=-2:(l=n.lastIndex-p[2].length,c=p[1],n=p[3]===void 0?y:p[3]==='"'?et:tt):n===et||n===tt?n=y:n===X||n===Y?n=w:(n=y,i=void 0);const m=n===y&&r[h+1].startsWith("/>")?" ":"";a+=n===w?o+$t:l>=0?(s.push(c),o.slice(0,l)+at+o.slice(l)+_+m):o+_+(l===-2?h:m)}return[ct(r,a+(r[e]||"<?>")+(t===2?"</svg>":t===3?"</math>":"")),s]};class T{constructor({strings:t,_$litType$:e},s){let i;this.parts=[];let a=0,n=0;const h=t.length-1,o=this.parts,[c,p]=bt(t,e);if(this.el=T.createElement(c,s),$.currentNode=this.el.content,e===2||e===3){const l=this.el.content.firstChild;l.replaceWith(...l.childNodes)}for(;(i=$.nextNode())!==null&&o.length<h;){if(i.nodeType===1){if(i.hasAttributes())for(const l of i.getAttributeNames())if(l.endsWith(at)){const f=p[n++],m=i.getAttribute(l).split(_),M=/([.?@])?(.*)/.exec(f);o.push({type:1,index:a,name:M[2],strings:m,ctor:M[1]==="."?At:M[1]==="?"?St:M[1]==="@"?wt:W}),i.removeAttribute(l)}else l.startsWith(_)&&(o.push({type:6,index:a}),i.removeAttribute(l));if(ot.test(i.tagName)){const l=i.textContent.split(_),f=l.length-1;if(f>0){i.textContent=k?k.emptyScript:"";for(let m=0;m<f;m++)i.append(l[m],P()),$.nextNode(),o.push({type:2,index:++a});i.append(l[f],P())}}}else if(i.nodeType===8)if(i.data===nt)o.push({type:2,index:a});else{let l=-1;for(;(l=i.data.indexOf(_,l+1))!==-1;)o.push({type:7,index:a}),l+=_.length-1}a++}}static createElement(t,e){const s=b.createElement("template");return s.innerHTML=t,s}}function S(r,t,e=r,s){var n,h;if(t===A)return t;let i=s!==void 0?(n=e._$Co)==null?void 0:n[s]:e._$Cl;const a=O(t)?void 0:t._$litDirective$;return(i==null?void 0:i.constructor)!==a&&((h=i==null?void 0:i._$AO)==null||h.call(i,!1),a===void 0?i=void 0:(i=new a(r),i._$AT(r,e,s)),s!==void 0?(e._$Co??(e._$Co=[]))[s]=i:e._$Cl=i),i!==void 0&&(t=S(r,i._$AS(r,t.values),i,s)),t}class xt{constructor(t,e){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=e}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:e},parts:s}=this._$AD,i=((t==null?void 0:t.creationScope)??b).importNode(e,!0);$.currentNode=i;let a=$.nextNode(),n=0,h=0,o=s[0];for(;o!==void 0;){if(n===o.index){let c;o.type===2?c=new U(a,a.nextSibling,this,t):o.type===1?c=new o.ctor(a,o.name,o.strings,this,t):o.type===6&&(c=new Et(a,this,t)),this._$AV.push(c),o=s[++h]}n!==(o==null?void 0:o.index)&&(a=$.nextNode(),n++)}return $.currentNode=b,i}p(t){let e=0;for(const s of this._$AV)s!==void 0&&(s.strings!==void 0?(s._$AI(t,s,e),e+=s.strings.length-2):s._$AI(t[e])),e++}}class U{get _$AU(){var t;return((t=this._$AM)==null?void 0:t._$AU)??this._$Cv}constructor(t,e,s,i){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=t,this._$AB=e,this._$AM=s,this.options=i,this._$Cv=(i==null?void 0:i.isConnected)??!0}get parentNode(){let t=this._$AA.parentNode;const e=this._$AM;return e!==void 0&&(t==null?void 0:t.nodeType)===11&&(t=e.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,e=this){t=S(this,t,e),O(t)?t===d||t==null||t===""?(this._$AH!==d&&this._$AR(),this._$AH=d):t!==this._$AH&&t!==A&&this._(t):t._$litType$!==void 0?this.$(t):t.nodeType!==void 0?this.T(t):vt(t)?this.k(t):this._(t)}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t))}_(t){this._$AH!==d&&O(this._$AH)?this._$AA.nextSibling.data=t:this.T(b.createTextNode(t)),this._$AH=t}$(t){var a;const{values:e,_$litType$:s}=t,i=typeof s=="number"?this._$AC(t):(s.el===void 0&&(s.el=T.createElement(ct(s.h,s.h[0]),this.options)),s);if(((a=this._$AH)==null?void 0:a._$AD)===i)this._$AH.p(e);else{const n=new xt(i,this),h=n.u(this.options);n.p(e),this.T(h),this._$AH=n}}_$AC(t){let e=st.get(t.strings);return e===void 0&&st.set(t.strings,e=new T(t)),e}k(t){V(this._$AH)||(this._$AH=[],this._$AR());const e=this._$AH;let s,i=0;for(const a of t)i===e.length?e.push(s=new U(this.O(P()),this.O(P()),this,this.options)):s=e[i],s._$AI(a),i++;i<e.length&&(this._$AR(s&&s._$AB.nextSibling,i),e.length=i)}_$AR(t=this._$AA.nextSibling,e){var s;for((s=this._$AP)==null?void 0:s.call(this,!1,!0,e);t!==this._$AB;){const i=K(t).nextSibling;K(t).remove(),t=i}}setConnected(t){var e;this._$AM===void 0&&(this._$Cv=t,(e=this._$AP)==null||e.call(this,t))}}class W{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,e,s,i,a){this.type=1,this._$AH=d,this._$AN=void 0,this.element=t,this.name=e,this._$AM=i,this.options=a,s.length>2||s[0]!==""||s[1]!==""?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=d}_$AI(t,e=this,s,i){const a=this.strings;let n=!1;if(a===void 0)t=S(this,t,e,0),n=!O(t)||t!==this._$AH&&t!==A,n&&(this._$AH=t);else{const h=t;let o,c;for(t=a[0],o=0;o<a.length-1;o++)c=S(this,h[s+o],e,o),c===A&&(c=this._$AH[o]),n||(n=!O(c)||c!==this._$AH[o]),c===d?t=d:t!==d&&(t+=(c??"")+a[o+1]),this._$AH[o]=c}n&&!i&&this.j(t)}j(t){t===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"")}}class At extends W{constructor(){super(...arguments),this.type=3}j(t){this.element[this.name]=t===d?void 0:t}}class St extends W{constructor(){super(...arguments),this.type=4}j(t){this.element.toggleAttribute(this.name,!!t&&t!==d)}}class wt extends W{constructor(t,e,s,i,a){super(t,e,s,i,a),this.type=5}_$AI(t,e=this){if((t=S(this,t,e,0)??d)===A)return;const s=this._$AH,i=t===d&&s!==d||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,a=t!==d&&(s===d||i);i&&this.element.removeEventListener(this.name,this,s),a&&this.element.addEventListener(this.name,this,t),this._$AH=t}handleEvent(t){var e;typeof this._$AH=="function"?this._$AH.call(((e=this.options)==null?void 0:e.host)??this.element,t):this._$AH.handleEvent(t)}}class Et{constructor(t,e,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=e,this.options=s}get _$AU(){return this._$AM._$AU}_$AI(t){S(this,t)}}const j=C.litHtmlPolyfillSupport;j==null||j(T,U),(C.litHtmlVersions??(C.litHtmlVersions=[])).push("3.3.2");const Ct=(r,t,e)=>{const s=(e==null?void 0:e.renderBefore)??t;let i=s._$litPart$;if(i===void 0){const a=(e==null?void 0:e.renderBefore)??null;s._$litPart$=i=new U(t.insertBefore(P(),a),a,void 0,e??{})}return i._$AI(r),i};/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const v=globalThis;class z extends x{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){var e;const t=super.createRenderRoot();return(e=this.renderOptions).renderBefore??(e.renderBefore=t.firstChild),t}update(t){const e=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=Ct(e,this.renderRoot,this.renderOptions)}connectedCallback(){var t;super.connectedCallback(),(t=this._$Do)==null||t.setConnected(!0)}disconnectedCallback(){var t;super.disconnectedCallback(),(t=this._$Do)==null||t.setConnected(!1)}render(){return A}}var it;z._$litElement$=!0,z.finalized=!0,(it=v.litElementHydrateSupport)==null||it.call(v,{LitElement:z});const L=v.litElementPolyfillSupport;L==null||L({LitElement:z});(v.litElementVersions??(v.litElementVersions=[])).push("4.2.2");/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const Pt={attribute:!0,type:String,converter:N,reflect:!1,hasChanged:q},Ot=(r=Pt,t,e)=>{const{kind:s,metadata:i}=e;let a=globalThis.litPropertyMetadata.get(i);if(a===void 0&&globalThis.litPropertyMetadata.set(i,a=new Map),s==="setter"&&((r=Object.create(r)).wrapped=!0),a.set(e.name,r),s==="accessor"){const{name:n}=e;return{set(h){const o=t.get.call(this);t.set.call(this,h),this.requestUpdate(n,o,r,!0,h)},init(h){return h!==void 0&&this.C(n,void 0,r,h),h}}}if(s==="setter"){const{name:n}=e;return function(h){const o=this[n];t.call(this,h),this.requestUpdate(n,o,r,!0,h)}}throw Error("Unsupported decorator location: "+s)};function Tt(r){return(t,e)=>typeof e=="object"?Ot(r,t,e):((s,i,a)=>{const n=i.hasOwnProperty(a);return i.constructor.createProperty(a,s),n?Object.getOwnPropertyDescriptor(i,a):void 0})(r,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function Nt(r){return Tt({...r,state:!0,attribute:!1})}class kt{constructor(t){this.hass=t}async getConfig(){return this.hass.callWS({type:"hearth/get_config"})}async getState(){return this.hass.callWS({type:"hearth/get_state"})}async discoverAreas(){return(await this.hass.callWS({type:"hearth/discover_areas"})).discovered}async addArea(t){return this.hass.callWS({type:"hearth/add_area",...t})}async updateArea(t,e){return this.hass.callWS({type:"hearth/update_area",area_id:t,...e})}async removeArea(t){await this.hass.callWS({type:"hearth/remove_area",area_id:t})}async setOverride(t,e,s){return this.hass.callWS({type:"hearth/set_override",area_id:t,temperature:e,...s!==void 0?{until:s}:{}})}async clearOverride(t){await this.hass.callWS({type:"hearth/clear_override",area_id:t})}async setAreaState(t,e){return this.hass.callWS({type:"hearth/set_area_state",area_id:t,state:e})}async setAreaEnabled(t,e){return this.hass.callWS({type:"hearth/set_area_enabled",area_id:t,enabled:e})}async resumeSchedule(t){return this.hass.callWS({type:"hearth/resume_schedule",area_id:t})}async syncSchedule(t){return this.hass.callWS({type:"hearth/sync_schedule",area_id:t})}async setVacation(t,e){return this.hass.callWS({type:"hearth/set_vacation",enabled:t,...e!==void 0?{schedule_id:e}:{}})}async addSchedule(t){return this.hass.callWS({type:"hearth/add_schedule",...t})}async updateSchedule(t,e){return this.hass.callWS({type:"hearth/update_schedule",schedule_id:t,...e})}async removeSchedule(t){await this.hass.callWS({type:"hearth/remove_schedule",schedule_id:t})}async duplicateSchedule(t){return this.hass.callWS({type:"hearth/duplicate_schedule",...t})}async addGroup(t){return this.hass.callWS({type:"hearth/add_group",...t})}async updateGroup(t,e){return this.hass.callWS({type:"hearth/update_group",group_id:t,...e})}async removeGroup(t){await this.hass.callWS({type:"hearth/remove_group",group_id:t})}async reorderGroups(t){await this.hass.callWS({type:"hearth/reorder_groups",group_ids:t})}async updateGlobalConfig(t){return this.hass.callWS({type:"hearth/update_global_config",...t})}async getDiagnostics(){return this.hass.callWS({type:"hearth/get_diagnostics"})}async deviceAction(t,e){return this.hass.callWS({type:"hearth/device_action",entity_id:t,action:e})}async getCommandLog(t){return this.hass.callWS({type:"hearth/get_command_log",...t!=null&&t.entityId?{entity_id:t.entityId}:{},...t!=null&&t.areaId?{area_id:t.areaId}:{}})}subscribe(t){return this.hass.connection.subscribeMessage(t,{type:"hearth/subscribe"})}}const Wt=u`
  :host {
    /* Font sizes between HA's scale steps */
    --hearth-text-between-xs-s: 11px; /* between ha-font-size-xs (10) and -s (12) */
    --hearth-text-between-s-m: 13px; /* between ha-font-size-s (12) and -m (14) */

    /* Temperature display - larger than HA's biggest (40px) */
    --hearth-text-temp-hero: 48px;

    /* Mode colors - single source of truth for all status/mode indicators */
    --hearth-color-home: #039be5;       /* Blue - comfortable / active heating */
    --hearth-color-away: #9e9e9e;       /* Gray - reduced / unoccupied */
    --hearth-color-schedule: #7e57c2;   /* Purple - following schedule */
    --hearth-color-vacation: #ffb300;   /* Amber - vacation mode */
    --hearth-color-manual: #ff5722;     /* Red-orange - manual override */
    --hearth-color-off: #bdbdbd;        /* Light gray - disabled */
    --hearth-color-now: #e91e63;        /* Pink - current time marker */
  }
`,Rt=u`
  :host {
    display: block;
    padding: var(--ha-space-4, 16px);
    font-family: var(--ha-font-family-body, Roboto, Noto, sans-serif);
    color: var(--primary-text-color);
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }
`,Dt=u`
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--ha-space-4, 16px);
  }
`;u`
  .action-bar {
    display: flex;
    gap: var(--ha-space-2, 8px);
    margin-top: var(--ha-space-4, 16px);
    flex-wrap: wrap;
  }
`;const jt=u`
  .mode-badge {
    display: inline-block;
    padding: 2px var(--ha-space-2, 8px);
    border-radius: var(--ha-border-radius-lg, 12px);
    font-size: var(--hearth-text-between-s-m, 13px);
    font-weight: var(--ha-font-weight-medium, 500);
    text-transform: capitalize;
    color: white;
  }
  .mode-badge.home {
    background: var(--hearth-color-home, #039be5);
  }
  .mode-badge.away {
    background: var(--hearth-color-away, #9e9e9e);
  }
  .mode-badge.off {
    background: var(--hearth-color-off, #bdbdbd);
  }
  .mode-badge.vacation {
    background: var(--hearth-color-vacation, #ffb300);
  }
  .mode-badge.override {
    background: var(--hearth-color-manual, #ff5722);
    cursor: pointer;
  }
`,Lt=u`
  .temp-display {
    font-size: var(--hearth-text-temp-hero, 48px);
    font-weight: var(--ha-font-weight-light, 300);
    text-align: center;
  }
  .temp-unit {
    font-size: var(--ha-font-size-2xl, 24px);
    vertical-align: super;
  }
`,It=u`
  .secondary-text {
    font-size: var(--ha-font-size-m, 14px);
    color: var(--secondary-text-color);
    margin-top: var(--ha-space-1, 4px);
  }
`,Bt=u`
  .section {
    margin-bottom: var(--ha-space-6, 24px);
  }
  .section h3 {
    font-size: var(--ha-font-size-m, 14px);
    font-weight: var(--ha-font-weight-medium, 500);
    text-transform: uppercase;
    color: var(--secondary-text-color);
    margin: 0 0 var(--ha-space-2, 8px);
  }
`,qt=u`
  .empty-state {
    text-align: center;
    padding: var(--ha-space-12, 48px) var(--ha-space-4, 16px);
    color: var(--secondary-text-color);
  }
  .empty-state h2 {
    font-weight: var(--ha-font-weight-normal, 400);
    margin-bottom: var(--ha-space-2, 8px);
  }
`,Vt=u`
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }
  .dialog-card {
    width: 90%;
    max-width: 480px;
    max-height: 80vh;
    overflow-y: auto;
  }
  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--ha-space-4, 16px) var(--ha-space-4, 16px) 0;
  }
  .dialog-header h2 {
    margin: 0;
    font-size: var(--ha-font-size-xl, 20px);
    font-weight: var(--ha-font-weight-medium, 500);
  }
  .dialog-body {
    padding: var(--ha-space-4, 16px);
  }
  .dialog-content {
    padding: var(--ha-space-6, 24px) var(--ha-space-6, 24px) var(--ha-space-2, 8px);
  }
  .dialog-content h3 {
    margin: 0;
    font-size: var(--ha-font-size-l, 16px);
    font-weight: var(--ha-font-weight-normal, 400);
  }
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--ha-space-2, 8px);
    padding: var(--ha-space-4, 16px);
    border-top: 1px solid var(--divider-color, #e0e0e0);
    margin-top: var(--ha-space-2, 8px);
  }
`,Gt=u`
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-4, 16px);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-1, 4px);
    font-size: var(--hearth-text-between-s-m, 13px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--secondary-text-color);
  }
  .field input,
  .field select {
    padding: var(--ha-space-2, 8px) var(--ha-space-4, 16px);
    border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: var(--ha-border-radius-md, 8px);
    font-size: var(--ha-font-size-m, 14px);
    background: var(--card-background-color, white);
    color: var(--primary-text-color);
  }
  .field-group {
    display: flex;
    flex-direction: column;
    gap: var(--ha-space-1, 4px);
  }
  .field-group > label:first-child {
    font-size: var(--hearth-text-between-s-m, 13px);
    font-weight: var(--ha-font-weight-medium, 500);
    color: var(--secondary-text-color);
    margin-bottom: var(--ha-space-1, 4px);
  }
  .checkbox-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--ha-space-2, 8px);
    font-size: var(--ha-font-size-m, 14px);
    color: var(--primary-text-color);
  }
`;function Ft(r,t="--"){return r===null?t:`${r.toFixed(1)}°`}function Zt(r){return r===null?"--.-":r.toFixed(1)}function Jt(r){return r.name?r.name:r.area_id.replace(/_/g," ").replace(/\b\w/g,t=>t.toUpperCase())}function Kt(r){if(!r.next_transition)return"";const e=new Date(r.next_transition.time).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`${r.next_transition.temp.toFixed(0)}° at ${e}`}function Qt(r,t,e){const s=Math.round(r*2)/2;return Math.max(t,Math.min(e,s))}function Xt(r,t){const e=r.entities,s=r.devices;return e?Object.values(e).filter(i=>{var n,h,o;if(!((n=i.entity_id)!=null&&n.startsWith("sensor.")))return!1;const a=r.states[i.entity_id];if(((h=a==null?void 0:a.attributes)==null?void 0:h.device_class)!=="temperature")return!1;if(i.area_id===t)return!0;if(!i.area_id&&i.device_id&&s){const c=s[i.device_id];if((c==null?void 0:c.area_id)===t)return!0}return!i.area_id&&(!i.device_id||!((o=s==null?void 0:s[i.device_id])!=null&&o.area_id))}).map(i=>i.entity_id):[]}function Yt(r){return r<=5?"mdi:battery-alert":r<=15?"mdi:battery-10":r<=25?"mdi:battery-20":r<=35?"mdi:battery-30":r<=45?"mdi:battery-40":r<=55?"mdi:battery-50":r<=65?"mdi:battery-60":r<=75?"mdi:battery-70":r<=85?"mdi:battery-80":r<=95?"mdi:battery-90":"mdi:battery"}function te(r,t){const e=[];for(const s of Object.values(r.areas))for(const i of s.devices)i.battery!==null&&i.battery<=t&&e.push({entity_id:i.entity_id,area_name:s.name,battery:i.battery});return e}class ee{constructor(t,e){this._action=t,this._ms=e,this._timer=null}call(t){this._pending=t,this._timer&&clearTimeout(this._timer),this._timer=setTimeout(()=>{this._timer=null,this._action(this._pending)},this._ms)}cancel(){this._timer&&(clearTimeout(this._timer),this._timer=null)}flush(){this._timer&&this._pending!==void 0&&(clearTimeout(this._timer),this._timer=null,this._action(this._pending))}}class se{constructor(){this._value=null,this._pending=0}get(t){return this._pending>0&&this._value!==null?this._value:t}set(t){this._value=t,this._pending++}resolve(){this._pending=Math.max(0,this._pending-1),this._pending===0&&(this._value=null)}get isPending(){return this._pending>0}clear(){this._value=null,this._pending=0}}function ie(r){if(r.global.vacation_mode)return"vacation";const t=Object.values(r.areas);if(t.length===0)return null;const e=t.filter(a=>a.enabled);if(e.length===0)return"off";const s=e[0].effective_state;return e.every(a=>a.effective_state===s)?s:null}export{d as A,ee as D,kt as H,se as O,z as a,ie as b,Ht as c,Vt as d,qt as e,te as f,Dt as g,Yt as h,u as i,Lt as j,Bt as k,Jt as l,jt as m,Tt as n,Zt as o,Gt as p,Xt as q,Nt as r,It as s,Wt as t,Qt as u,Rt as v,zt as w,Ft as x,Kt as y};
