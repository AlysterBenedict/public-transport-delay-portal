// ═══════════════ DATA ═══════════════
const ROUTES=[
  {id:"r1",number:"BMTC 500C",name:"Majestic Express",type:"bus",origin:"Majestic",destination:"Electronic City",status:"delayed",delayMinutes:15,estimatedArrival:"10:45 AM"},
  {id:"r2",number:"Metro Green",name:"Silk Board Metro",type:"metro",origin:"Nagasandra",destination:"Silk Board",status:"on_time",delayMinutes:0,estimatedArrival:"10:32 AM"},
  {id:"r3",number:"Metro Purple",name:"Airport Metro",type:"metro",origin:"Baiyappanahalli",destination:"Airport",status:"on_time",delayMinutes:0,estimatedArrival:"10:38 AM"},
  {id:"r4",number:"BMTC 401",name:"Whitefield Exp",type:"bus",origin:"KR Market",destination:"Whitefield",status:"delayed",delayMinutes:25,estimatedArrival:"11:10 AM"},
  {id:"r5",number:"City Tram 1",name:"MG Road Tram",type:"tram",origin:"MG Road",destination:"Cubbon Park",status:"on_time",delayMinutes:0,estimatedArrival:"10:28 AM"},
  {id:"r6",number:"Route 1",name:"Hubli-Dharwad road",type:"bus",origin:"Hubli",destination:"Dharwad",status:"unknown",delayMinutes:0,estimatedArrival:"11:00 AM"},
  {id:"r8",number:"Route 2",name:"Railway station",type:"bus",origin:"City Center",destination:"Railway Station",status:"on_time",delayMinutes:0,estimatedArrival:"10:35 AM"},
  {id:"r9",number:"Route 3",name:"Kundgol Laxmeshwar road",type:"bus",origin:"Kundgol",destination:"Laxmeshwar",status:"delayed",delayMinutes:10,estimatedArrival:"10:55 AM"}
];

const REASONS_DATA=[
  {reason:"Breakdown",count:18,color:"#EF4444"},
  {reason:"Weather",count:12,color:"#3B82F6"},
  {reason:"Accident",count:8,color:"#F59E0B"},
  {reason:"Overcrowding",count:22,color:"#8B5CF6"},
  {reason:"Signal Fault",count:15,color:"#06B6D4"},
  {reason:"Other",count:9,color:"#64748B"}
];

const WEEKLY=[5,8,3,12,7,2,4];
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const REASONS_LIST=["breakdown","weather","accident","overcrowding","signal_fault","other"];
const REASON_EMOJIS={breakdown:"🔧",weather:"🌧️",accident:"⚠️",overcrowding:"👥",signal_fault:"📡",other:"•••"};
const SEVERITY_LIST=["minor","moderate","severe"];
const STATUS_LIST=["pending","reviewed","resolved"];

// Shared state variables (originally in auth.js but needed in this module too)
let currentUser = null;
let currentFilter = "all";
let selectedReason = null;
let selectedVeh = "bus";
let severityVal = 0.16;
let currentStep = 1;

// Export data constants to window so admin.js and reports.js can access them
window.ROUTES = ROUTES;
window.REASON_EMOJIS = REASON_EMOJIS;
window.DAYS = DAYS;
window.WEEKLY = WEEKLY;

function genReports(){
  const reps=[];
  for(let i=1;i<=50;i++){
    const route=ROUTES[Math.floor(Math.random()*ROUTES.length)];
    const d=new Date();d.setDate(d.getDate()-Math.floor(Math.random()*30));
    reps.push({
      id:`REP-${String(i).padStart(3,"0")}`,
      routeId:route.id,routeNumber:route.number,routeName:route.name,
      reason:REASONS_LIST[Math.floor(Math.random()*REASONS_LIST.length)],
      severity:SEVERITY_LIST[Math.floor(Math.random()*SEVERITY_LIST.length)],
      status:STATUS_LIST[Math.floor(Math.random()*STATUS_LIST.length)],
      reportedAt:d.toISOString(),
    });
  }
  return reps;
}
const MOCK_REPORTS=genReports();

// ═══════════════ PAGE ROUTING ═══════════════
function showPage(id){
  document.querySelectorAll(".page").forEach(p=>{
    p.classList.remove("active");
    p.style.display="none";
  });
  const p=document.getElementById(id);
  if(!p)return;
  p.style.display="flex";
  p.classList.add("active");
}
// Immediately export to window so other modules (auth.js) can call it
window.showPage = showPage;

// ═══════════════ ROUTES PAGE ═══════════════
function initRoutes(){
  populateRouteDropdown();
  renderRouteGrid(ROUTES);
  startTypewriter("Live Route Status");
  startClock();
}

function startTypewriter(text){
  const el=document.getElementById("hero-title");
  if(!el)return;
  el.innerHTML="";let i=0;
  const t=setInterval(()=>{
    if(i<text.length){el.innerHTML=text.slice(0,++i)+'<span class="typewriter"> </span>';}
    else{el.innerHTML=text;clearInterval(t);}
  },60);
}

function startClock(){
  function tick(){
    const now=new Date();
    const t=now.toLocaleString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"});
    const hEl=document.getElementById("hero-time");
    const aEl=document.getElementById("admin-clock");
    if(hEl)hEl.textContent=t;
    if(aEl)aEl.textContent=now.toLocaleTimeString("en-IN",{hour12:false});
  }
  tick();setInterval(tick,1000);
}

function renderRouteGrid(routes){
  const grid=document.getElementById("routes-grid");
  if(!grid)return;
  const typeEmoji={bus:"🚌",metro:"🚇",tram:"🚊",ferry:"⛴️"};
  grid.innerHTML=routes.map((r,i)=>`
    <div class="route-card ${r.type}" style="animation-delay:${i*0.07}s"
      onmousemove="tiltCard(event,this)"
      onmouseleave="resetCard(this)"
      onclick="goToReport('${r.id}')">
      <div class="card-top">
        <span class="route-badge badge-${r.type}">${r.number}</span>
        <span class="status-pill status-${r.status}">
          <span class="dot dot-${r.status==="on_time"?"green":r.status==="delayed"?"red":"amber"}"></span>
          ${r.status==="on_time"?"On Time":r.status==="delayed"?`Delayed +${r.delayMinutes}min`:"Unknown"}
        </span>
      </div>
      <div class="card-mid">
        <div class="card-icon">${typeEmoji[r.type]}</div>
        <div class="route-name">${r.name}</div>
        <div class="route-dir">
          <span>${r.origin}</span>
          <span class="arrow-icon">→</span>
          <span>${r.destination}</span>
        </div>
      </div>
      <div class="card-bot">
        <div class="eta">🕐 ${r.estimatedArrival}</div>
        <button class="report-btn" onclick="event.stopPropagation();goToReport('${r.id}')">Report Delay</button>
      </div>
    </div>
  `).join("");
}

function tiltCard(e,card){
  const r=card.getBoundingClientRect();
  const x=(e.clientX-r.left)/r.width-0.5;
  const y=(e.clientY-r.top)/r.height-0.5;
  card.style.transform=`translateY(-6px) perspective(600px) rotateY(${x*8}deg) rotateX(${-y*8}deg)`;
  card.style.setProperty("--mx",(x+0.5)*100+"%");
  card.style.setProperty("--my",(y+0.5)*100+"%");
}
function resetCard(card){card.style.transform="";}

function filterRoutes(){
  const q=document.getElementById("route-search").value.toLowerCase();
  const filtered=ROUTES.filter(r=>
    (currentFilter==="all"||r.type===currentFilter)&&
    (r.name.toLowerCase().includes(q)||r.number.toLowerCase().includes(q)||r.origin.toLowerCase().includes(q)||r.destination.toLowerCase().includes(q))
  );
  renderRouteGrid(filtered);
}

function setFilter(f){
  currentFilter=f;
  document.querySelectorAll(".filter-tab").forEach(t=>t.classList.toggle("active",t.dataset.filter===f));
  filterRoutes();
}

function populateRouteDropdown(){
  const sel=document.getElementById("report-route");
  if(!sel)return;
  sel.innerHTML='<option value="">— Choose a route —</option>'+
    ROUTES.map(r=>`<option value="${r.id}">${r.number} — ${r.name}</option>`).join("");
}

function goToReport(routeId){
  populateRouteDropdown();
  const sel=document.getElementById("report-route");
  if(sel)sel.value=routeId;
  // set today date and current time
  const now=new Date();
  const dEl=document.getElementById("report-date");
  const tEl=document.getElementById("report-time");
  if(dEl)dEl.value=now.toISOString().split("T")[0];
  if(tEl)tEl.value=now.toTimeString().slice(0,5);
  if (typeof window.gotoStep === "function") window.gotoStep(1);
  showPage("page-report");
}

// ═══════════════ VEHICLE BACKGROUND ═══════════════
let scrollY=0;
let autoX=0;
let rafId=null;

// Generate star field
(function genStars(){
  const svg=document.getElementById("stars-svg");if(!svg)return;
  for(let i=0;i<80;i++){
    const x=Math.random()*100;const y=Math.random()*55;
    const r=Math.random()*1.5+0.3;const op=Math.random()*0.6+0.2;
    const dur=Math.random()*2+1.5;const delay=Math.random()*3;
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx",x+"vw");c.setAttribute("cy",y+"vh");
    c.setAttribute("r",r);c.setAttribute("fill","white");
    c.setAttribute("opacity",op);
    c.style.animation=`twinkle-st ${dur}s ease-in-out ${delay}s infinite`;
    svg.appendChild(c);
  }
})();

// Road dashes
(function genDashes(){
  const inner=document.getElementById("dash-inner");if(!inner)return;
  for(let i=0;i<60;i++){
    const d=document.createElement("div");
    d.className="dash";inner.appendChild(d);
  }
})();

// SVG templates
function busSVG(scale=1){
  const s=scale;
  return`<svg class="bus-svg" width="${280*s}" height="${100*s}" viewBox="0 0 280 100" style="overflow:visible">
    <rect x="10" y="15" width="250" height="65" rx="10" fill="var(--veh-bus1, #1E40AF)"/>
    <rect x="18" y="8" width="234" height="18" rx="7" fill="var(--veh-bus2, #1E3A8A)"/>
    <rect x="22" y="22" width="38" height="24" rx="4" fill="rgba(147,210,255,0.75)"/>
    <rect x="68" y="22" width="38" height="24" rx="4" fill="rgba(147,210,255,0.75)"/>
    <rect x="114" y="22" width="38" height="24" rx="4" fill="rgba(147,210,255,0.75)"/>
    <rect x="160" y="22" width="38" height="24" rx="4" fill="rgba(147,210,255,0.75)"/>
    <rect x="206" y="22" width="25" height="36" rx="3" fill="rgba(147,210,255,0.4)" stroke="rgba(147,210,255,0.5)" stroke-width="1"/>
    <ellipse cx="252" cy="52" rx="9" ry="7" fill="#FEF08A" opacity="0.9"/>
    <ellipse cx="252" cy="52" rx="18" ry="13" fill="#FEF08A" opacity="0.12"/>
    <line x1="252" y1="46" x2="275" y2="39" stroke="rgba(254,240,138,0.25)" stroke-width="6" stroke-linecap="round"/>
    <line x1="252" y1="58" x2="275" y2="65" stroke="rgba(254,240,138,0.25)" stroke-width="6" stroke-linecap="round"/>
    <rect x="12" y="47" width="9" height="14" rx="2" fill="#EF4444" opacity="0.8"/>
    <g transform="translate(55,82)"><circle r="18" fill="#1F2937"/><circle r="12" fill="#374151"/><circle r="5" fill="#4B5563"/>
    <line x1="0" y1="-12" x2="0" y2="12" stroke="#6B7280" stroke-width="2" class="wheel-rotate" style="transform-origin:0px 0px"/>
    <line x1="-12" y1="0" x2="12" y2="0" stroke="#6B7280" stroke-width="2" class="wheel-rotate" style="transform-origin:0px 0px"/></g>
    <g transform="translate(215,82)"><circle r="18" fill="#1F2937"/><circle r="12" fill="#374151"/><circle r="5" fill="#4B5563"/>
    <line x1="0" y1="-12" x2="0" y2="12" stroke="#6B7280" stroke-width="2" class="wheel-rotate" style="transform-origin:0px 0px"/>
    <line x1="-12" y1="0" x2="12" y2="0" stroke="#6B7280" stroke-width="2" class="wheel-rotate" style="transform-origin:0px 0px"/></g>
    <circle cx="10" cy="75" r="5" fill="rgba(100,116,139,0.5)" class="exhaust"/>
  </svg>`;
}

function trainSVG(scale=1){
  return`<svg width="${480*scale}" height="${90*scale}" viewBox="0 0 480 90" style="overflow:visible">
    <rect x="0" y="8" width="148" height="58" rx="4" fill="var(--veh-train1, #5B21B6)"/>
    <rect x="0" y="38" width="148" height="6" fill="#06B6D4"/>
    <rect x="10" y="16" width="28" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="46" y="16" width="28" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="82" y="16" width="28" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="118" y="16" width="24" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="152" y="8" width="8" height="30" fill="#374151"/>
    <rect x="160" y="8" width="155" height="58" rx="4" fill="var(--veh-train2, #6D28D9)"/>
    <rect x="160" y="38" width="155" height="6" fill="#0891B2"/>
    <rect x="170" y="16" width="28" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="206" y="16" width="28" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="242" y="16" width="28" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="278" y="16" width="32" height="22" rx="3" fill="rgba(186,230,253,0.7)"/>
    <rect x="318" y="8" width="8" height="30" fill="#374151"/>
    <rect x="326" y="4" width="155" height="62" rx="7" fill="var(--veh-train3, #7C3AED)"/>
    <path d="M481 4 Q498 4 500 33 Q498 66 481 66 Z" fill="var(--veh-train2, #6D28D9)"/>
    <rect x="326" y="38" width="175" height="6" fill="#06B6D4"/>
    <rect x="336" y="12" width="28" height="22" rx="3" fill="rgba(186,230,253,0.8)"/>
    <rect x="372" y="12" width="28" height="22" rx="3" fill="rgba(186,230,253,0.8)"/>
    <rect x="408" y="12" width="28" height="22" rx="3" fill="rgba(186,230,253,0.8)"/>
    <rect x="444" y="12" width="28" height="22" rx="3" fill="rgba(186,230,253,0.8)"/>
    <rect x="492" y="15" width="8" height="8" rx="2" fill="#FEF08A"/>
    <rect x="492" y="43" width="8" height="8" rx="2" fill="#FEF08A"/>
    <line x1="420" y1="4" x2="400" y2="-8" stroke="#94A3B8" stroke-width="2"/>
    <line x1="400" y1="-8" x2="440" y2="-8" stroke="#94A3B8" stroke-width="3"/>
    <line x1="440" y1="-8" x2="420" y2="4" stroke="#94A3B8" stroke-width="2"/>
    <g transform="translate(25,74)"><circle r="14" fill="#1F2937"/><circle r="9" fill="#374151"/><circle r="4" fill="#4B5563"/>
    <line x1="0" y1="-9" x2="0" y2="9" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/>
    <line x1="-9" y1="0" x2="9" y2="0" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/></g>
    <g transform="translate(110,74)"><circle r="14" fill="#1F2937"/><circle r="9" fill="#374151"/><circle r="4" fill="#4B5563"/>
    <line x1="0" y1="-9" x2="0" y2="9" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/>
    <line x1="-9" y1="0" x2="9" y2="0" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/></g>
    <g transform="translate(355,74)"><circle r="14" fill="#1F2937"/><circle r="9" fill="#374151"/><circle r="4" fill="#4B5563"/>
    <line x1="0" y1="-9" x2="0" y2="9" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/>
    <line x1="-9" y1="0" x2="9" y2="0" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/></g>
    <g transform="translate(455,74)"><circle r="14" fill="#1F2937"/><circle r="9" fill="#374151"/><circle r="4" fill="#4B5563"/>
    <line x1="0" y1="-9" x2="0" y2="9" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/>
    <line x1="-9" y1="0" x2="9" y2="0" stroke="#6B7280" stroke-width="1.5" class="wheel-rotate" style="transform-origin:0px 0px"/></g>
    <line x1="-20" y1="28" x2="-70" y2="28" stroke="rgba(124,58,237,0.5)" stroke-width="2" stroke-dasharray="12 8" class="speed-line"/>
    <line x1="-20" y1="42" x2="-90" y2="42" stroke="rgba(6,182,212,0.4)" stroke-width="1" stroke-dasharray="18 10" class="speed-line"/>
  </svg>`;
}

function tramSVG(scale=1){
  return`<svg class="tram-rock" width="${190*scale}" height="${105*scale}" viewBox="0 0 190 105" style="overflow:visible;transform-origin:center bottom;">
    <line x1="0" y1="95" x2="190" y2="95" stroke="#374151" stroke-width="3"/>
    <line x1="0" y1="98" x2="190" y2="98" stroke="#374151" stroke-width="3"/>
    <line x1="95" y1="8" x2="95" y2="14" stroke="#94A3B8" stroke-width="3"/>
    <line x1="60" y1="8" x2="130" y2="8" stroke="#94A3B8" stroke-width="2"/>
    <rect x="8" y="14" width="174" height="74" rx="7" fill="var(--veh-tram1, #047857)"/>
    <rect x="3" y="7" width="184" height="16" rx="5" fill="var(--veh-tram2, #065F46)"/>
    <rect x="16" y="22" width="46" height="34" rx="4" fill="rgba(167,243,208,0.75)"/>
    <rect x="72" y="22" width="46" height="34" rx="4" fill="rgba(167,243,208,0.75)"/>
    <rect x="128" y="22" width="46" height="34" rx="4" fill="rgba(167,243,208,0.75)"/>
    <rect x="76" y="56" width="38" height="32" rx="3" fill="rgba(167,243,208,0.4)" stroke="rgba(167,243,208,0.5)" stroke-width="1"/>
    <circle cx="42" cy="95" r="9" fill="#1F2937"/><circle cx="42" cy="95" r="5" fill="#374151"/>
    <circle cx="148" cy="95" r="9" fill="#1F2937"/><circle cx="148" cy="95" r="5" fill="#374151"/>
  </svg>`;
}

function ferrySVG(scale=1){
  return`<svg class="ferry-bob" width="${300*scale}" height="${120*scale}" viewBox="0 0 300 120" style="overflow:visible">
    <path class="wave-anim" d="M-10 95 Q50 85 110 95 Q170 105 230 95 Q280 85 320 95 L320 115 L-10 115 Z" fill="rgba(30,64,175,0.35)"/>
    <path d="M15 82 Q25 105 150 110 Q275 105 285 82 L265 55 L35 55 Z" fill="#1D4ED8"/>
    <rect x="40" y="24" width="220" height="52" rx="7" fill="rgba(255,255,255,0.92)"/>
    <rect x="55" y="32" width="28" height="20" rx="3" fill="rgba(186,230,253,0.85)"/>
    <rect x="92" y="32" width="28" height="20" rx="3" fill="rgba(186,230,253,0.85)"/>
    <rect x="129" y="32" width="28" height="20" rx="3" fill="rgba(186,230,253,0.85)"/>
    <rect x="166" y="32" width="28" height="20" rx="3" fill="rgba(186,230,253,0.85)"/>
    <rect x="203" y="32" width="28" height="20" rx="3" fill="rgba(186,230,253,0.85)"/>
    <rect x="207" y="4" width="20" height="32" rx="4" fill="#EF4444"/>
    <rect x="203" y="2" width="28" height="8" rx="4" fill="#DC2626"/>
    <circle cx="220" cy="-2" r="5" fill="rgba(148,163,184,0.5)" class="smoke"/>
    <circle cx="216" cy="-12" r="7" fill="rgba(148,163,184,0.3)" class="smoke" style="animation-delay:0.7s"/>
    <circle cx="283" cy="38" r="5" fill="#22C55E" class="nav-blink"/>
    <path d="M285 92 Q300 86 315 92" stroke="rgba(255,255,255,0.35)" stroke-width="2" fill="none"/>
    <path d="M285 98 Q305 91 320 97" stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none"/>
  </svg>`;
}

// Vehicle config per layer
const LAYER_CONFIG=[
  {id:"layer1",speed:0.12,scale:0.42,opacity:0.22,bottom:"24%",vehicles:[
    {type:"train",offset:0},{type:"bus",offset:700}
  ]},
  {id:"layer2",speed:0.28,scale:0.62,opacity:0.32,bottom:"20%",vehicles:[
    {type:"tram",offset:200},{type:"bus",offset:1100}
  ]},
  {id:"layer3",speed:0.50,scale:0.82,opacity:0.48,bottom:"16%",vehicles:[
    {type:"ferry",offset:400},{type:"train",offset:1300}
  ]},
  {id:"layer4",speed:0.75,scale:1.05,opacity:0.62,bottom:"12%",vehicles:[
    {type:"bus",offset:150},{type:"tram",offset:1000}
  ]},
];

function getSVG(type,scale){
  if(type==="bus")return busSVG(scale);
  if(type==="train")return trainSVG(scale);
  if(type==="tram")return tramSVG(scale);
  if(type==="ferry")return ferrySVG(scale);
  return busSVG(scale);
}

function getVehicleWidth(type,scale){
  const base={bus:280,train:480,tram:190,ferry:300};
  return(base[type]||280)*scale;
}

// Build vehicle elements
const vehicleEls=[];
LAYER_CONFIG.forEach(layer=>{
  const container=document.getElementById(layer.id);
  if(!container)return;
  container.style.bottom=layer.bottom;
  layer.vehicles.forEach(v=>{
    const wrap=document.createElement("div");
    wrap.className="vehicle-wrap";
    wrap.style.cssText=`position:absolute;opacity:${layer.opacity};bottom:0;transform-origin:bottom center;`;
    wrap.innerHTML=getSVG(v.type,layer.scale);
    container.appendChild(wrap);
    vehicleEls.push({
      el:wrap,speed:layer.speed,
      offset:v.offset,vWidth:getVehicleWidth(v.type,layer.scale),
      type:v.type
    });
  });
});

// Auto-drive speed (pixels per frame)
const AUTO_SPEED=1.2;

window.addEventListener("scroll",()=>{scrollY=window.scrollY;},{passive:true});

function updateVehicles(){
  autoX+=AUTO_SPEED;
  const sw=window.innerWidth;
  vehicleEls.forEach(v=>{
    const totalTravel=sw+v.vWidth+200;
    const baseX=autoX*v.speed+v.offset;
    const looped=((baseX%totalTravel)+totalTravel)%totalTravel;
    const x=looped-(v.vWidth+100);
    const scrollBoost=scrollY*v.speed*0.3;
    const finalX=x+scrollBoost;
    v.el.style.transform=`translateX(${finalX}px)`;
  });
  // Move road dashes
  const dashInner=document.getElementById("dash-inner");
  if(dashInner){
    const dx=((autoX*0.6)%(sw+200));
    dashInner.style.transform=`translateX(${-dx}px)`;
  }
  rafId=requestAnimationFrame(updateVehicles);
}
rafId=requestAnimationFrame(updateVehicles);

// ═══════════════ INIT ═══════════════
// Use window.getSession since getSession is defined in auth.js (a separate ES module)
// auth.js loads first and exports it to window before app.js runs
window.addEventListener('DOMContentLoaded', () => {}, {once:true});

function appInit(){
  const sess = typeof window.getSession === 'function' ? window.getSession() : null;
  if(sess){
    currentUser=sess;
    if(sess.role==="admin"){showPage("page-admin");if(typeof window.initAdmin==="function")window.initAdmin();}
    else{showPage("page-routes");initRoutes();}
  }else{
    showPage("page-login");
  }
}

// Defer init slightly so all modules can load and export to window first
setTimeout(appInit, 0);

// Export key functions for use by other modules (auth.js, admin.js etc.)
window.initRoutes = initRoutes;
window.goToReport = goToReport;
window.filterRoutes = filterRoutes;
window.setFilter = setFilter;
window.populateRouteDropdown = populateRouteDropdown;
window.tiltCard = tiltCard;
window.resetCard = resetCard;
window.goHome = goHome;
// twinkle keyframe injection
const style=document.createElement("style");
style.textContent=`@keyframes twinkle-st{0%,100%{opacity:inherit;}50%{opacity:0.1;}}`;
document.head.appendChild(style);

// ═══════════════ TOP NAV BAR (routes page) ═══════════════
function buildTopNav(){
  if(document.getElementById("top-nav"))return;
  const nav=document.createElement("div");
  nav.id="top-nav";
  nav.style.cssText=`
    position:fixed;top:0;left:0;width:100%;z-index:200;
    background:rgba(10,15,30,0.92);backdrop-filter:blur(20px);
    border-bottom:1px solid rgba(59,130,246,0.15);
    height:52px;display:flex;align-items:center;
    padding:0 20px;gap:12px;
  `;
  nav.innerHTML=`
    <button onclick="goHome()" style="
      display:flex;align-items:center;gap:7px;
      background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);
      color:#93C5FD;padding:7px 14px;border-radius:10px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.background='rgba(59,130,246,0.25)'"
       onmouseout="this.style.background='rgba(59,130,246,0.12)'">
      🏠 Home
    </button>
    <div style="display:flex;align-items:center;gap:7px;margin-left:4px;">
      <svg width="22" height="22" viewBox="0 0 36 36"><rect x="2" y="10" width="32" height="18" rx="5" fill="#3B82F6"/><rect x="4" y="14" width="6" height="8" rx="2" fill="rgba(147,210,255,0.8)"/><rect x="13" y="14" width="6" height="8" rx="2" fill="rgba(147,210,255,0.8)"/><rect x="22" y="14" width="6" height="8" rx="2" fill="rgba(147,210,255,0.8)"/><circle cx="9" cy="30" r="4" fill="#1F2937"/><circle cx="9" cy="30" r="2" fill="#4B5563"/><circle cx="27" cy="30" r="4" fill="#1F2937"/><circle cx="27" cy="30" r="2" fill="#4B5563"/></svg>
      <span style="font-family:'Syne',sans-serif;font-weight:800;font-size:16px;background:linear-gradient(135deg,#3B82F6,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">TrackDelay</span>
    </div>
    <div style="flex:1;"></div>
    <button onclick="window.location.href='live-tracking.html'" style="
      display:flex;align-items:center;gap:7px;
      background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);
      color:#93C5FD;padding:7px 14px;border-radius:10px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.background='rgba(59,130,246,0.25)'"
       onmouseout="this.style.background='rgba(59,130,246,0.12)'">
      📍 Live Tracking
    </button>
    <button onclick="showPage('page-report');populateRouteDropdown();gotoStep(1);" style="
      display:flex;align-items:center;gap:7px;
      background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);
      color:#6EE7B7;padding:7px 14px;border-radius:10px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.background='rgba(16,185,129,0.25)'"
       onmouseout="this.style.background='rgba(16,185,129,0.12)'">
      📋 Report Delay
    </button>
    <button onclick="showPage('page-crowd'); if(window.initCrowd) window.initCrowd();" style="
      display:flex;align-items:center;gap:7px;
      background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);
      color:#FCD34D;padding:7px 14px;border-radius:10px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.background='rgba(245,158,11,0.25)'"
       onmouseout="this.style.background='rgba(245,158,11,0.12)'">
      👥 Crowd Aggregation
    </button>
    ${(window.getSession && window.getSession() && window.getSession().role === 'admin') ? `
    <button onclick="showPage('page-admin')" style="
      display:flex;align-items:center;gap:7px;
      background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);
      color:#C4B5FD;padding:7px 14px;border-radius:10px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.background='rgba(139,92,246,0.25)'"
       onmouseout="this.style.background='rgba(139,92,246,0.12)'">
      🛡️ Admin
    </button>
    ` : ''}
    <button onclick="doLogout()" style="
      display:flex;align-items:center;gap:7px;
      background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);
      color:#FCA5A5;padding:7px 14px;border-radius:10px;
      font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;
      cursor:pointer;transition:all 0.2s;
    " onmouseover="this.style.background='rgba(239,68,68,0.22)'"
       onmouseout="this.style.background='rgba(239,68,68,0.1)'">
      🚪 Logout
    </button>
  `;
  document.body.appendChild(nav);
  // push routes page content down
  const rp=document.getElementById("page-routes");
  if(rp)rp.style.paddingTop="52px";
}

function removeTopNav(){
  const n=document.getElementById("top-nav");
  if(n)n.remove();
  const rp=document.getElementById("page-routes");
  if(rp)rp.style.paddingTop="0";
}

function goHome(){
  showPage("page-routes");
  initRoutes();
  buildTopNav();
}

// patch showPage to manage nav
const _origShowPage=showPage;
window.showPage=function(id){
  _origShowPage(id);
  if(id==="page-routes"||id==="page-report"||id==="page-crowd"){
    buildTopNav();
    const rp=document.getElementById("page-routes");
    if(rp)rp.style.paddingTop="52px";
  } else {
    removeTopNav();
  }
  if(id==="page-routes")initRoutes();
};

// ═══════════════ AI CHATBOT ═══════════════
(function buildChatbot(){
  const css=`
  #chat-bubble{
    position:fixed;bottom:28px;right:28px;z-index:9999;
    width:56px;height:56px;border-radius:50%;
    background:linear-gradient(135deg,#3B82F6,#06B6D4);
    border:none;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    font-size:24px;box-shadow:0 8px 32px rgba(59,130,246,0.5);
    transition:all 0.3s;animation:bubblePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes bubblePop{from{transform:scale(0);}to{transform:scale(1);}}
  #chat-bubble:hover{transform:scale(1.1);box-shadow:0 12px 40px rgba(59,130,246,0.7);}
  #chat-bubble .notif-dot{
    position:absolute;top:2px;right:2px;
    width:14px;height:14px;border-radius:50%;
    background:#EF4444;border:2px solid #0A0F1E;
    font-size:8px;color:white;display:flex;align-items:center;justify-content:center;
    font-weight:700;animation:badgeBounce 1s ease-in-out infinite;
  }
  #chat-window{
    position:fixed;bottom:96px;right:28px;z-index:9998;
    width:360px;max-height:520px;
    background:rgba(10,15,30,0.97);
    border:1px solid rgba(59,130,246,0.25);
    border-radius:20px;
    box-shadow:0 24px 64px rgba(0,0,0,0.7);
    display:none;flex-direction:column;
    overflow:hidden;
    animation:chatIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  }
  @keyframes chatIn{from{opacity:0;transform:translateY(20px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}
  #chat-window.open{display:flex;}
  #chat-header{
    padding:14px 16px;
    background:linear-gradient(135deg,rgba(59,130,246,0.2),rgba(6,182,212,0.15));
    border-bottom:1px solid rgba(59,130,246,0.2);
    display:flex;align-items:center;gap:10px;
  }
  .chat-avatar{
    width:36px;height:36px;border-radius:50%;
    background:linear-gradient(135deg,#3B82F6,#06B6D4);
    display:flex;align-items:center;justify-content:center;
    font-size:18px;flex-shrink:0;
  }
  .chat-hinfo{flex:1;}
  .chat-hname{font-family:'Syne',sans-serif;font-size:14px;font-weight:700;}
  .chat-hsub{font-size:11px;color:#10B981;display:flex;align-items:center;gap:4px;}
  #chat-close{background:none;border:none;color:#64748B;font-size:20px;
    cursor:pointer;padding:0 4px;line-height:1;}
  #chat-close:hover{color:#F1F5F9;}
  #chat-msgs{
    flex:1;overflow-y:auto;padding:14px;
    display:flex;flex-direction:column;gap:10px;
    max-height:350px;
  }
  #chat-msgs::-webkit-scrollbar{width:3px;}
  #chat-msgs::-webkit-scrollbar-thumb{background:rgba(59,130,246,0.3);border-radius:2px;}
  .msg-row{display:flex;gap:8px;align-items:flex-end;}
  .msg-row.user{flex-direction:row-reverse;}
  .msg-avatar{width:28px;height:28px;border-radius:50%;flex-shrink:0;
    display:flex;align-items:center;justify-content:center;font-size:13px;}
  .bot-avatar{background:linear-gradient(135deg,#3B82F6,#06B6D4);}
  .user-avatar-sm{background:linear-gradient(135deg,#8B5CF6,#3B82F6);}
  .msg-bubble{
    max-width:240px;padding:10px 13px;border-radius:14px;
    font-size:13px;line-height:1.5;
  }
  .bot-bubble{
    background:rgba(59,130,246,0.12);
    border:1px solid rgba(59,130,246,0.2);
    color:#F1F5F9;border-bottom-left-radius:4px;
  }
  .user-bubble{
    background:linear-gradient(135deg,#3B82F6,#06B6D4);
    color:white;border-bottom-right-radius:4px;
  }
  .typing-bubble{
    background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);
    padding:12px 16px;border-radius:14px;border-bottom-left-radius:4px;
  }
  .typing-dots{display:flex;gap:4px;}
  .typing-dots span{
    width:7px;height:7px;border-radius:50%;background:#3B82F6;
    animation:typingDot 1.2s ease-in-out infinite;
  }
  .typing-dots span:nth-child(2){animation-delay:0.2s;}
  .typing-dots span:nth-child(3){animation-delay:0.4s;}
  @keyframes typingDot{0%,60%,100%{transform:translateY(0);opacity:0.4;}30%{transform:translateY(-6px);opacity:1;}}
  .quick-replies{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;}
  .qr-btn{
    padding:6px 12px;background:rgba(59,130,246,0.1);
    border:1px solid rgba(59,130,246,0.3);border-radius:20px;
    color:#93C5FD;font-size:12px;font-weight:500;
    cursor:pointer;transition:all 0.2s;font-family:'DM Sans',sans-serif;
    white-space:nowrap;
  }
  .qr-btn:hover{background:rgba(59,130,246,0.25);border-color:var(--blue);}
  #chat-input-row{
    padding:12px 14px;border-top:1px solid rgba(59,130,246,0.15);
    display:flex;gap:8px;align-items:center;
  }
  #chat-input{
    flex:1;padding:9px 13px;
    background:rgba(255,255,255,0.06);
    border:1px solid rgba(255,255,255,0.1);
    border-radius:12px;color:#F1F5F9;
    font-family:'DM Sans',sans-serif;font-size:13px;
    outline:none;transition:all 0.2s;
  }
  #chat-input:focus{border-color:#3B82F6;box-shadow:0 0 0 2px rgba(59,130,246,0.15);}
  #chat-send{
    width:36px;height:36px;border-radius:10px;
    background:linear-gradient(135deg,#3B82F6,#06B6D4);
    border:none;color:white;font-size:16px;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    transition:all 0.2s;flex-shrink:0;
  }
  #chat-send:hover{transform:scale(1.08);box-shadow:0 4px 12px rgba(59,130,246,0.4);}
  .cred-card{
    background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);
    border-radius:10px;padding:10px 12px;margin-top:6px;font-size:12px;
  }
  .cred-row{display:flex;justify-content:space-between;margin-bottom:4px;}
  .cred-key{color:#64748B;}
  .cred-val{font-family:'JetBrains Mono',monospace;color:#6EE7B7;font-weight:600;}
  .cred-copy{
    width:100%;padding:6px;background:rgba(16,185,129,0.15);
    border:1px solid rgba(16,185,129,0.3);border-radius:7px;
    color:#6EE7B7;font-size:11px;font-weight:600;cursor:pointer;
    margin-top:6px;font-family:'DM Sans',sans-serif;transition:all 0.2s;
  }
  .cred-copy:hover{background:rgba(16,185,129,0.3);}
  `;
  const styleEl=document.createElement("style");
  styleEl.textContent=css;
  document.head.appendChild(styleEl);

  // Bubble
  const bubble=document.createElement("button");
  bubble.id="chat-bubble";
  bubble.innerHTML=`🤖<div class="notif-dot">1</div>`;
  bubble.onclick=toggleChat;
  document.body.appendChild(bubble);

  // Window
  const win=document.createElement("div");
  win.id="chat-window";
  win.innerHTML=`
    <div id="chat-header">
      <div class="chat-avatar">🤖</div>
      <div class="chat-hinfo">
        <div class="chat-hname">TrackBot AI</div>
        <div class="chat-hsub"><span style="width:7px;height:7px;border-radius:50%;background:#10B981;display:inline-block;"></span> Online — TrackDelay Assistant</div>
      </div>
      <button id="chat-close" onclick="toggleChat()">×</button>
    </div>
    <div id="chat-msgs"></div>
    <div class="quick-replies" id="quick-replies"></div>
    <div id="chat-input-row">
      <input id="chat-input" placeholder="Ask me anything..." 
        onkeydown="if(event.key==='Enter')sendChat()"/>
      <button id="chat-send" onclick="sendChat()">➤</button>
    </div>
  `;
  document.body.appendChild(win);

  // Remove notif dot after open
  window.toggleChat=function(){
    const w=document.getElementById("chat-window");
    const dot=document.querySelector("#chat-bubble .notif-dot");
    if(w.classList.toggle("open")){
      if(dot)dot.style.display="none";
      if(!chatStarted)startChat();
      setTimeout(()=>{
        const msgs=document.getElementById("chat-msgs");
        if(msgs)msgs.scrollTop=msgs.scrollHeight;
      },100);
    }
  };
})();

let chatStarted=false;

function startChat(){
  chatStarted=true;
  addBotMsg("👋 Hey! I'm **TrackBot**, your AI assistant for TrackDelay!");
  setTimeout(()=>{
    addBotMsg("I can help you with:\n• 🔑 Login credentials\n• 🗺️ Navigating the app\n• 🚌 Route information\n• 📋 Reporting delays\n• 📊 Admin dashboard");
    setTimeout(()=>{
      setQuickReplies([
        "🔑 Show login credentials",
        "🗺️ Go to Routes",
        "📊 Open Admin Dashboard",
        "📋 How to report delay?",
        "❓ What is TrackDelay?"
      ]);
    },300);
  },800);
}

function addBotMsg(text,html){
  const msgs=document.getElementById("chat-msgs");
  if(!msgs)return;
  // remove typing if any
  const typing=document.getElementById("typing-indicator");
  if(typing)typing.remove();
  const row=document.createElement("div");
  row.className="msg-row";
  const formatted=html||(text
    .replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
    .replace(/\n/g,"<br>")
    .replace(/•/g,"&bull;"));
  row.innerHTML=`
    <div class="msg-avatar bot-avatar">🤖</div>
    <div class="msg-bubble bot-bubble">${formatted}</div>
  `;
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
}

function addUserMsg(text){
  const msgs=document.getElementById("chat-msgs");
  if(!msgs)return;
  const row=document.createElement("div");
  row.className="msg-row user";
  row.innerHTML=`
    <div class="msg-avatar user-avatar-sm">👤</div>
    <div class="msg-bubble user-bubble">${text}</div>
  `;
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
}

function showTyping(){
  const msgs=document.getElementById("chat-msgs");
  if(!msgs)return;
  const row=document.createElement("div");
  row.className="msg-row";row.id="typing-indicator";
  row.innerHTML=`
    <div class="msg-avatar bot-avatar">🤖</div>
    <div class="typing-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
  `;
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
}

function setQuickReplies(list){
  const qr=document.getElementById("quick-replies");
  if(!qr)return;
  qr.innerHTML=list.map(q=>`<button class="qr-btn" onclick="handleQuick('${q}')">${q}</button>`).join("");
}

function handleQuick(text){
  sendChatMsg(text);
}

function sendChat(){
  const inp=document.getElementById("chat-input");
  if(!inp||!inp.value.trim())return;
  const msg=inp.value.trim();
  inp.value="";
  sendChatMsg(msg);
}

function sendChatMsg(msg){
  addUserMsg(msg);
  setQuickReplies([]);
  showTyping();
  setTimeout(()=>botReply(msg),900);
}

function showCredentials(){
  const msgs=document.getElementById("chat-msgs");
  if(!msgs)return;
  const typing=document.getElementById("typing-indicator");
  if(typing)typing.remove();
  const row=document.createElement("div");
  row.className="msg-row";
  row.innerHTML=`
    <div class="msg-avatar bot-avatar">🤖</div>
    <div class="msg-bubble bot-bubble" style="max-width:280px;">
      Here are your login credentials! 🎉
      <div class="cred-card">
        <div style="font-weight:700;color:#93C5FD;margin-bottom:8px;">👑 Admin Account</div>
        <div class="cred-row"><span class="cred-key">Email</span><span class="cred-val">admin@transport.com</span></div>
        <div class="cred-row"><span class="cred-key">Password</span><span class="cred-val">Admin@1234</span></div>
        <button class="cred-copy" onclick="fillDemo('admin@transport.com','Admin@1234');showPage('page-login');toggleChat();">
          ✨ Auto-fill & Go to Login
        </button>
      </div>
      <div class="cred-card" style="margin-top:8px;">
        <div style="font-weight:700;color:#C4B5FD;margin-bottom:8px;">👤 Passenger Account</div>
        <div class="cred-row"><span class="cred-key">Email</span><span class="cred-val">user1@test.com</span></div>
        <div class="cred-row"><span class="cred-key">Password</span><span class="cred-val">User@1234</span></div>
        <button class="cred-copy" onclick="fillDemo('user1@test.com','User@1234');showPage('page-login');toggleChat();">
          ✨ Auto-fill & Go to Login
        </button>
      </div>
    </div>
  `;
  msgs.appendChild(row);
  msgs.scrollTop=msgs.scrollHeight;
  setQuickReplies(["🗺️ Go to Routes","📊 Open Admin Dashboard","📋 Report a delay"]);
}

function botReply(msg){
  const m=msg.toLowerCase();
  // credentials
  if(m.includes("login")||m.includes("credential")||m.includes("password")||m.includes("email")||m.includes("sign in")||m.includes("account")||m.includes("user")){
    showCredentials();
    return;
  }
  // navigation — home/routes
  if(m.includes("home")||m.includes("route")||m.includes("back")){
    addBotMsg("🏠 Taking you to the Routes page (home) right now!");
    setTimeout(()=>{
      showPage("page-routes");initRoutes();buildTopNav();
      setQuickReplies(["🔑 Show credentials","📋 Report a delay","📊 Admin Dashboard"]);
    },500);
    return;
  }
  // admin
  if(m.includes("admin")||m.includes("dashboard")||m.includes("chart")||m.includes("statistic")||m.includes("analytics")){
    addBotMsg("📊 To access the Admin Dashboard, login with:\n\n**Email:** admin@transport.com\n**Password:** Admin@1234\n\nShall I take you to login?");
    setQuickReplies(["✅ Yes take me to login","🔑 Show all credentials","🗺️ Go to Routes"]);
    return;
  }
  // yes/take me to login
  if(m.includes("yes")||m.includes("take me")||m.includes("go to login")){
    addBotMsg("✅ Heading to the login page now!");
    setTimeout(()=>{showPage("page-login");},500);
    setQuickReplies(["🔑 Show credentials","❓ Help"]);
    return;
  }
  // report
  if(m.includes("report")||m.includes("delay")||m.includes("form")){
    addBotMsg("📋 To report a delay:\n1. Go to **Routes** page\n2. Click any route card\n3. Fill in the **3-step form**\n4. Hit Submit!\n\nWant me to open the form now?");
    setQuickReplies(["✅ Open Report Form","🗺️ Go to Routes","🔑 Show credentials"]);
    return;
  }
  // open report form
  if(m.includes("open report")){
    addBotMsg("📋 Opening the Report Form for you!");
    setTimeout(()=>{showPage("page-report");populateRouteDropdown();gotoStep(1);},500);
    setQuickReplies(["🗺️ Go to Routes","📊 Admin Dashboard"]);
    return;
  }
  // what is delaytrack
  if(m.includes("what")||m.includes("delaytrack")||m.includes("app")||m.includes("about")){
    addBotMsg("🚌 **TrackDelay** is a Public Transport Delay Reporting Portal!\n\nYou can:\n• View live route statuses\n• Report delays with photos\n• Admins see real-time analytics\n• Track delay trends & heatmaps\n\nAll running in your browser — no server needed!");
    setQuickReplies(["🔑 Show credentials","🗺️ View Routes","📊 Admin Dashboard"]);
    return;
  }
  // greetings
  if(m.includes("hello")||m.includes("hi")||m.includes("hey")||m.includes("hola")){
    addBotMsg("Hey there! 👋 Great to meet you! I'm TrackBot, your TrackDelay assistant.\n\nWhat can I help you with today?");
    setQuickReplies(["🔑 Show login credentials","🗺️ Go to Routes","📊 Admin Dashboard","❓ What is TrackDelay?"]);
    return;
  }
  // logout
  if(m.includes("logout")||m.includes("sign out")){
    addBotMsg("🚪 Logging you out now. See you soon!");
    setTimeout(()=>doLogout(),800);
    return;
  }
  // help
  if(m.includes("help")||m.includes("?")){
    addBotMsg("Here's what I can do for you:");
    setQuickReplies([
      "🔑 Show login credentials",
      "🗺️ Go to Routes",
      "📊 Open Admin Dashboard",
      "📋 Report a delay",
      "❓ What is TrackDelay?"
    ]);
    return;
  }
  // default fallback
  addBotMsg("I'm not sure about that 🤔 But here are some things I can help with:");
  setQuickReplies([
    "🔑 Show login credentials",
    "🗺️ Go to Routes",
    "📊 Open Admin Dashboard",
    "📋 How to report delay?"
  ]);
}