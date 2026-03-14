import { db } from '../config/firebase.js';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ═══════════════ ADMIN ═══════════════
let liveReports = [];
let unsubscribeAdmin = null;
let adminMap = null;
let mapMarkers = [];

// Initialize Google Map in Admin Dashboard
function initMap() {
  const mapContainer = document.getElementById("admin-map");
  if (!mapContainer) return;
  
  if (typeof google === 'undefined' || !google.maps) {
    mapContainer.innerHTML = '<div style="color:var(--danger)">Google Maps API not loaded.</div>';
    return;
  }
  
  // Default to Bangalore
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  
  adminMap = new google.maps.Map(mapContainer, {
    zoom: 11,
    center: defaultCenter,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "poi.park",
        elementType: "geometry",
        stylers: [{ color: "#263c3f" }],
      },
      {
        featureType: "poi.park",
        elementType: "labels.text.fill",
        stylers: [{ color: "#6b9a76" }],
      },
      {
        featureType: "road",
        elementType: "geometry",
        stylers: [{ color: "#38414e" }],
      },
      {
        featureType: "road",
        elementType: "geometry.stroke",
        stylers: [{ color: "#212a37" }],
      },
      {
        featureType: "road",
        elementType: "labels.text.fill",
        stylers: [{ color: "#9ca5b3" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ color: "#746855" }],
      },
      {
        featureType: "road.highway",
        elementType: "geometry.stroke",
        stylers: [{ color: "#1f2835" }],
      },
      {
        featureType: "road.highway",
        elementType: "labels.text.fill",
        stylers: [{ color: "#f3d19c" }],
      },
      {
        featureType: "transit",
        elementType: "geometry",
        stylers: [{ color: "#2f3948" }],
      },
      {
        featureType: "transit.station",
        elementType: "labels.text.fill",
        stylers: [{ color: "#d59563" }],
      },
      {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#17263c" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#515c6d" }],
      },
      {
        featureType: "water",
        elementType: "labels.text.stroke",
        stylers: [{ color: "#17263c" }],
      },
    ]
  });

  // Render markers if data is already present
  if (liveReports.length > 0) {
    updateMapMarkers();
  }
}

/**
 * Robust Removal Function
 */
async function removeReport(id) {
  console.log("Admin: Requesting removal for report ID:", id);
  if (!confirm("Are you sure you want to remove this report?")) {
    console.log("Admin: Removal cancelled by user.");
    return;
  }
  
  try {
    if (!db) {
      alert("Error: Database connection lost. Please refresh.");
      return;
    }
    
    // Explicitly target the document
    const reportRef = doc(db, "delayReports", id);
    await deleteDoc(reportRef);
    
    console.log("Admin: Successfully deleted document from Firestore:", id);
    alert("Report removed successfully!");
    
    // Manual UI Cleanup for the feed (Table will auto-update via onSnapshot)
    const feedItem = document.querySelector(`.feed-item[data-id="${id}"]`);
    if (feedItem) feedItem.remove();
    
    // Update map markers
    updateMapMarkers();
    
  } catch (error) {
    console.error("Admin: Deletion failed:", error);
    alert("Error removing report: " + error.message);
  }
}

// Global Exports
window.removeReport = removeReport;
window.initAdmin = initAdmin;
window.exportCSV = exportCSV;
window.toggleSidebar = toggleSidebar;
window.initMap = initMap;

function initAdmin(){
  const sess = typeof getSession === 'function' ? getSession() : null;
  if(sess){
    const initials=(sess.name||"A").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
    const av=document.getElementById("sidebar-avatar");
    const sn=document.getElementById("sidebar-name");
    if(av)av.textContent=initials;
    if(sn)sn.textContent=sess.name||"Admin";
  }
  
  if (typeof startClock === 'function') startClock();
  
  // Set up Firestore listener
  setupFirestoreListener();

  renderBarChart(); // currently mock
  renderHeatmap(); // currently mock
  
  setTimeout(()=>{
    const bar=document.getElementById("ops-bar");
    if(bar)bar.style.width="90%";
  },300);
}

function setupFirestoreListener() {
  if (unsubscribeAdmin) unsubscribeAdmin();

  const q = query(collection(db, "delayReports"), orderBy("timestamp", "desc"));
  
  unsubscribeAdmin = onSnapshot(q, (snapshot) => {
    liveReports = [];
    const liveReasons = {};
    let activeDelays = 0;
    
    snapshot.docChanges().forEach((change) => {
      const data = change.doc.data();
      const id = change.doc.id;
      
      if (change.type === "added") {
        // Only show live feed for very recent reports in a real scenario,
        // but for demo, we'll insert into feed if we want it to feel live
        // To avoid spamming on initial load, only push to feed if it's genuinely new
        if (snapshot.metadata.hasPendingWrites || change.doc.metadata.hasPendingWrites || !snapshot.metadata.fromCache) {
             // Let's just push to feed for live feel
             addFeedItemLive({ id, ...data });
        }
      } else if (change.type === "removed") {
        console.log("Admin: Firestore notification - report removed:", id);
        // Manual UI Cleanup for the feed
        const feedItem = document.querySelector(`.feed-item[data-id="${id}"]`);
        if (feedItem) {
          feedItem.style.opacity = "0";
          feedItem.style.transform = "translateX(20px)";
          setTimeout(() => feedItem.remove(), 300);
        }
      }
    });

    snapshot.forEach((doc) => {
      const data = doc.data();
      liveReports.push({ id: doc.id, ...data });
      
      const reason = data.delayReason || "other";
      liveReasons[reason] = (liveReasons[reason] || 0) + 1;
      
      if(data.status !== "resolved") {
        activeDelays++;
      }
    });

    // Animate Top KPIs
    animateCounter("kpi1", liveReports.length);
    animateCounter("kpi2", activeDelays);
    const badge = document.getElementById("report-count-badge");
    if(badge) badge.textContent = liveReports.length;

    // Convert to donut format
    const reasonColors = {
      breakdown: "#EF4444", weather: "#3B82F6", accident: "#F59E0B",
      overcrowding: "#8B5CF6", signal_fault: "#06B6D4", other: "#64748B"
    };
    
    const newReasonsData = Object.entries(liveReasons).map(([reason, count]) => ({
      reason: reason.replace("_", " "),
      count: count,
      color: reasonColors[reason] || "#64748B"
    }));

    renderDonutLive(newReasonsData);
    renderBarChart(); // Trigger chart calculation when data arrives
    renderReportsTableLive();
    updateMapMarkers(); // Add markers for real-time reports
  });
}

function updateMapMarkers() {
  if (!adminMap || typeof google === 'undefined') return;
  
  // Clear existing markers
  mapMarkers.forEach(marker => marker.setMap(null));
  mapMarkers = [];
  
  const bounds = new google.maps.LatLngBounds();
  let validLocations = 0;
  
  liveReports.forEach(r => {
    if (r.latitude != null && r.longitude != null) {
      const position = { lat: r.latitude, lng: r.longitude };
      const marker = new google.maps.Marker({
        position: position,
        map: adminMap,
        title: `Report ${r.id.slice(0,8)} - ${r.delayReason ? r.delayReason.replace("_", " ") : "Unknown"}`,
        animation: google.maps.Animation.DROP
      });
      
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="color: black; font-family: sans-serif; padding: 5px;">
            <strong>Route:</strong> ${window.ROUTES ? (window.ROUTES.find(rt=>rt.id===r.route)?.number || r.route) : r.route}<br>
            <strong>Reason:</strong> ${r.delayReason ? r.delayReason.replace("_", " ") : "Unknown"}<br>
            <strong>Severity:</strong> <span style="text-transform:capitalize;">${r.severityLevel || "minor"}</span>
          </div>
        `
      });
      
      marker.addListener("click", () => {
        infoWindow.open({
          anchor: marker,
          map: adminMap,
        });
      });
      
      mapMarkers.push(marker);
      bounds.extend(position);
      validLocations++;
    }
  });
  
  // Fit map to show all markers if there are any valid ones
  if (validLocations > 0) {
    adminMap.fitBounds(bounds);
    // Add some padding by adjusting zoom out slightly after fitBounds
    const listener = google.maps.event.addListener(adminMap, "idle", function() { 
        if (adminMap.getZoom() > 14) adminMap.setZoom(14); 
        google.maps.event.removeListener(listener); 
    });
  }
}

function addFeedItemLive(r) {
  const feedList = document.getElementById("feed-list");
  if(!feedList) return;
  
  // If the item is already in the feed, don't duplicate logic here
  if (feedList.querySelector(`[data-id="${r.id}"]`)) return;
  
  const route = window.ROUTES ? window.ROUTES.find(rt=>rt.id===r.route) || {number:"—"} : {number:"—"};
  const sevColor = {minor:"var(--success)", moderate:"var(--warning)", severe:"var(--danger)"}[r.severityLevel] || "var(--success)";
  const reasonEmoji = window.REASON_EMOJIS ? window.REASON_EMOJIS[r.delayReason] || "•" : "•";
  const reasonText = r.delayReason ? r.delayReason.replace("_"," ") : "Unknown";
  
  const item = document.createElement("div");
  item.className = "feed-item";
  item.dataset.id = r.id; // Store ID for easy removal
  item.innerHTML = `
    <div class="feed-sev-bar" style="background:${sevColor}"></div>
    <div class="feed-content">
      <div class="feed-route" style="color:${sevColor}">${route.number}</div>
      <div class="feed-reason">${reasonEmoji} ${reasonText}</div>
      <div class="feed-time">just now</div>
    </div>`;
    
  feedList.insertBefore(item, feedList.firstChild);
  while(feedList.children.length > 15) feedList.removeChild(feedList.lastChild);
}

function animateCounter(id,target,duration=1500){
  const el=document.getElementById(id);if(!el)return;
  let start=null;
  function step(ts){
    if(!start)start=ts;
    const prog=Math.min((ts-start)/duration,1);
    const ease=1-Math.pow(1-prog,3);
    el.textContent=Math.round(ease*target);
    if(prog<1)requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderBarChart(){
  const chart=document.getElementById("bar-chart");if(!chart)return;
  
  // Calculate rolling 7-days strictly using calendar start-of-day boundaries
  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0];
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const dayLabels = [];
  const daysOfWeek = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  for(let i=6; i>=0; i--) {
     const d = new Date(todayStart);
     d.setDate(d.getDate() - i);
     dayLabels.push(daysOfWeek[d.getDay()]);
  }

  liveReports.forEach(r => {
    if(!r.timestamp) return;
    const rDate = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
    const rStart = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());
    
    // Calculate calendar days difference
    const diffTime = todayStart - rStart;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // If within last 7 days (diffDays between 0 [today] and 6 [6 days ago])
    if(diffDays >= 0 && diffDays <= 6) {
       // Index 6 is today, Index 0 is 6 days ago
       const index = 6 - diffDays;
       weeklyCounts[index]++;
    }
  });

  const max=Math.max(...weeklyCounts, 1); // ensure no div by 0
  chart.innerHTML=weeklyCounts.map((v,i)=>`
    <div class="bar-wrap">
      <div class="bar" style="height:0%" data-h="${v === 0 ? 0 : (v/max)*100}"></div>
      <div class="bar-label">${dayLabels[i]}</div>
    </div>
  `).join("");
  setTimeout(()=>{
    chart.querySelectorAll(".bar").forEach(b=>{
      b.style.height=b.dataset.h+"%";
    });
  },300);
}

function renderDonutLive(dataArray){
  const canvas=document.getElementById("donut-canvas");if(!canvas)return;
  const ctx=canvas.getContext("2d");
  const total=dataArray.reduce((a,b)=>a+b.count,0);
  
  // Clear canvas
  ctx.clearRect(0,0,canvas.width,canvas.height);
  
  let startAngle=-Math.PI/2;
  const cx=65,cy=65,or=55,ir=32;
  
  if(total === 0) {
     ctx.beginPath();ctx.arc(cx,cy,or,0,Math.PI*2);
     ctx.fillStyle="rgba(255,255,255,0.05)";ctx.fill();
  } else {
    dataArray.forEach(d=>{
      const slice=(d.count/total)*Math.PI*2;
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,or,startAngle,startAngle+slice);
      ctx.closePath();ctx.fillStyle=d.color;ctx.fill();
      startAngle+=slice;
    });
  }
  
  ctx.beginPath();ctx.arc(cx,cy,ir,0,Math.PI*2);
  ctx.fillStyle="#0d1528";ctx.fill();
  ctx.fillStyle="white";ctx.font="bold 14px Syne";
  ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(total,cx,cy-6);
  ctx.font="10px DM Sans";ctx.fillStyle="#64748B";
  ctx.fillText("Reports",cx,cy+8);

  const legend=document.getElementById("donut-legend");
  if(legend)legend.innerHTML=dataArray.map(d=>`
    <div class="legend-item">
      <div class="legend-dot" style="background:${d.color}"></div>
      <span class="legend-label">${d.reason}</span>
      <span class="legend-val">${d.count}</span>
    </div>
  `).join("");
}

function renderHeatmap(){
  const wrap=document.getElementById("heatmap-wrap");if(!wrap)return;
  const hours=[6,9,12,15,18,21];
  const days = window.DAYS || ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  let html='<div style="display:grid;grid-template-columns:auto repeat(7,1fr);gap:3px;font-size:10px;">';
  html+='<div></div>'+days.map(d=>`<div class="heat-day-label">${d}</div>`).join("");
  hours.forEach(h=>{
    html+=`<div style="color:var(--muted);font-size:9px;display:flex;align-items:center;padding-right:6px;font-family:'JetBrains Mono',monospace;">${h}:00</div>`;
    days.forEach((_,di)=>{
      const intensity=Math.random();
      const alpha=0.1+intensity*0.85;
      const color=intensity>0.7?`rgba(239,68,68,${alpha})`:intensity>0.4?`rgba(245,158,11,${alpha})`:`rgba(59,130,246,${alpha})`;
      const count=Math.round(intensity*10);
      html+=`<div class="heat-cell" style="background:${color}" title="${days[di]} ${h}:00 — ${count} delays"></div>`;
    });
  });
  html+="</div>";
  wrap.innerHTML=html;
}

function renderReportsTableLive(){
  const tbody=document.getElementById("reports-tbody");if(!tbody)return;
  
  const sevClass={minor:"sev-minor",moderate:"sev-moderate",severe:"sev-severe"};
  const typeEmoji={bus:"🚌",metro:"🚇",tram:"🚊",ferry:"⛴️"};
  const findRoute=id=>window.ROUTES ? window.ROUTES.find(r=>r.id===id)||{type:"bus",name:"Unknown",number:"—"} : {type:"bus",name:"Unknown",number:"—"};
  
  tbody.innerHTML=liveReports.slice(0,20).map(r=>{
    const route=findRoute(r.route);
    const dateOb = r.timestamp && typeof r.timestamp.toDate === 'function' ? r.timestamp.toDate() : new Date();
    const ago=timeAgo(dateOb);
    const reasonLabel = r.delayReason ? r.delayReason.replace("_"," ") : "Unknown";
    const status = r.status || "pending";
    const sev = r.severityLevel || "minor";
    const emoji = window.REASON_EMOJIS ? window.REASON_EMOJIS[r.delayReason]||"•" : "•";
    
    const hasLocation = r.latitude != null && r.longitude != null;
    let latDisplay = `<span style="color:var(--muted); font-size:12px; font-style:italic;">Location unavailable</span>`;
    let lngDisplay = `<span style="color:var(--muted); font-size:12px; font-style:italic;">Location unavailable</span>`;
    let mapDisplay = `<button disabled style="background:rgba(255,255,255,0.05);color:var(--muted);border:1px solid rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-size:11px;cursor:not-allowed;">View on Map</button>`;

    if (hasLocation) {
      latDisplay = `<span class="id-mono" style="font-size:12px;">${Number(r.latitude).toFixed(4)}</span>`;
      lngDisplay = `<span class="id-mono" style="font-size:12px;">${Number(r.longitude).toFixed(4)}</span>`;
      mapDisplay = `<a href="https://www.google.com/maps?q=${r.latitude},${r.longitude}" target="_blank" style="text-decoration:none;">
          <button style="background:rgba(59,130,246,0.15);color:var(--blue);border:1px solid rgba(59,130,246,0.3);padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600;display:flex;align-items:center;gap:4px;white-space:nowrap;transition:all 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.25)'" onmouseout="this.style.background='rgba(59,130,246,0.15)'">
            🗺️ View on Map
          </button>
        </a>`;
    }
    
    return`<tr>
      <td><span class="id-mono">${r.id.slice(0,8)}</span></td>
      <td><span style="font-size:12px;">${typeEmoji[r.vehicleType || route.type]||"🚌"}</span> ${route.number}</td>
      <td>${emoji} <span style="text-transform:capitalize;">${reasonLabel}</span></td>
      <td><span class="sev-pill ${sevClass[sev] || 'sev-minor'}">${sev}</span></td>
      <td style="color:var(--muted);font-size:12px;">${ago}</td>
      <td><span class="status-pill status-${status==="resolved"?"on_time":status==="pending"?"delayed":"unknown"}">${status}</span></td>
      <td>${latDisplay}</td>
      <td>${lngDisplay}</td>
      <td>${mapDisplay}</td>
      <td>
        <button class="remove-btn" onclick="window.removeReport('${r.id}')" title="Remove Report" style="background:rgba(239,68,68,0.15);color:var(--danger);border:1px solid rgba(239,68,68,0.3);padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;display:flex;align-items:center;gap:4px;transition:all 0.2s;">
          <span style="font-size:14px;">🗑️</span>
        </button>
      </td>
    </tr>`;
  }).join("");
}

function timeAgo(d){
  const s=Math.floor((Date.now()-d.getTime())/1000);
  if(s<60)return"just now";
  if(s<3600)return Math.floor(s/60)+"m ago";
  if(s<86400)return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}

function exportCSV(){
  const header="ID,Route,Reason,Severity,Status,Reported\n";
  const rows=liveReports.map(r=>{
    const rt = window.ROUTES ? window.ROUTES.find(rv=>rv.id===r.route) : null;
    const rtNum = rt ? rt.number : r.route;
    return `${r.id},${rtNum},${r.delayReason},${r.severityLevel},${r.status||'pending'},${r.timestamp?.toDate ? r.timestamp.toDate().toISOString() : ''}`;
  }).join("\n");
  const blob=new Blob([header+rows],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download="delaytrack-live-reports.csv";a.click();
}

function toggleSidebar(){
  const s=document.getElementById("sidebar");
  const m=document.getElementById("admin-main");
  s.classList.toggle("collapsed");
  m.classList.toggle("collapsed");
}

// (Functions are assigned to window at the top of the file)
