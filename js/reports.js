import { db, auth } from '../config/firebase.js';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ═══════════════ REPORT FORM ═══════════════
let selectedVeh = "bus";
let selectedReason = null;
let severityVal = 0.16;
let currentStep = 1;
let manualLat = null;
let manualLng = null;
let reportMap = null;
let reportMarker = null;

function setVeh(btn,type){
  selectedVeh=type;
  document.querySelectorAll(".veh-btn").forEach(b=>b.classList.toggle("active",b===btn));
}

function selectReason(card){
  document.querySelectorAll(".reason-card").forEach(c=>c.classList.remove("selected"));
  card.classList.add("selected");
  selectedReason=card.dataset.reason;
}

function setSeverityClick(e){
  const track=document.getElementById("sev-track");
  const r=track.getBoundingClientRect();
  severityVal=Math.max(0.05,Math.min(0.95,(e.clientX-r.left)/r.width));
  updateSeverityUI();
}

function updateSeverityUI(){
  document.getElementById("sev-thumb").style.left=(severityVal*100)+"%";
  const badge=document.getElementById("sev-badge");
  if(severityVal<0.4){
    badge.textContent="● Minor";badge.style.background="rgba(16,185,129,0.15)";badge.style.color="#6EE7B7";
  }else if(severityVal<0.75){
    badge.textContent="●● Moderate";badge.style.background="rgba(245,158,11,0.15)";badge.style.color="#FCD34D";
  }else{
    badge.textContent="●●● Severe";badge.style.background="rgba(239,68,68,0.15)";badge.style.color="#FCA5A5";
  }
}

function updateCharCount(){
  const val=document.getElementById("report-notes").value.length;
  const el=document.getElementById("char-count");
  el.textContent=`${val} / 500`;
  el.style.color=val>400?"var(--danger)":val>300?"var(--warning)":"var(--muted)";
}

function handlePhoto(e){
  const file=e.target.files[0];
  if(!file)return;
  if(file.size>5*1024*1024){alert("File must be under 5MB");return;}
  if(!["image/jpeg","image/png"].includes(file.type)){alert("Only JPEG and PNG allowed");return;}
  document.getElementById("upload-area").style.display="none";
  document.getElementById("photo-preview").style.display="flex";
  document.getElementById("preview-name").textContent=file.name;
  document.getElementById("preview-size").textContent=(file.size/1024).toFixed(1)+" KB";
}

function removePhoto(){
  document.getElementById("photo-input").value="";
  document.getElementById("upload-area").style.display="block";
  document.getElementById("photo-preview").style.display="none";
}

function nextStep(from){
  if(from===1){
    if(!document.getElementById("report-route").value){
      document.getElementById("report-route").style.borderColor="var(--danger)";
      setTimeout(()=>document.getElementById("report-route").style.borderColor="",1500);
      return;
    }
  }
  if(from===2&&!selectedReason){
    const grid=document.getElementById("reason-grid");
    grid.style.outline="2px solid var(--danger)";grid.style.borderRadius="14px";
    setTimeout(()=>grid.style.outline="",1500);
    return;
  }
  gotoStep(from+1);
}

function prevStep(from){gotoStep(from-1);}

function gotoStep(n){
  currentStep=n;
  document.querySelectorAll(".form-step").forEach((s,i)=>{
    s.classList.toggle("active",i+1===n);
  });
  [1,2,3].forEach(i=>{
    const sc=document.getElementById("sc"+i);
    if(i<n){sc.className="step-circle done";sc.textContent="✓";}
    else if(i===n){sc.className="step-circle active";sc.textContent=i;}
    else{sc.className="step-circle";sc.textContent=i;}
    if(i<3)document.getElementById("line"+i).classList.toggle("done",i<n);
  });
  if(n===1) {
    initMyReports();
  } else if(n===3) {
    // Initialize map on step 3 if not already done
    setTimeout(initReportMap, 100);
  }
}

function initReportMap() {
  const mapContainer = document.getElementById("report-map");
  if (!mapContainer || reportMap || typeof google === 'undefined') return;
  
  // Default to Bangalore
  const defaultCenter = { lat: 12.9716, lng: 77.5946 };
  
  reportMap = new google.maps.Map(mapContainer, {
    zoom: 11,
    center: defaultCenter,
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
      { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] }
    ]
  });

  // Start by dropping a pin right at the default center so location is NEVER null
  manualLat = defaultCenter.lat;
  manualLng = defaultCenter.lng;
  reportMarker = new google.maps.Marker({
    position: defaultCenter,
    map: reportMap,
    animation: google.maps.Animation.DROP
  });

  reportMap.addListener("click", (event) => {
    manualLat = event.latLng.lat();
    manualLng = event.latLng.lng();
    
    // Add or move marker
    if (!reportMarker) {
      reportMarker = new google.maps.Marker({
        position: { lat: manualLat, lng: manualLng },
        map: reportMap,
        animation: google.maps.Animation.DROP
      });
    } else {
      reportMarker.setPosition({ lat: manualLat, lng: manualLng });
    }
    
    const txt = document.getElementById("report-location-text");
    if(txt) {
      txt.style.display="block";
      txt.textContent = `Location pinned: ${manualLat.toFixed(4)}, ${manualLng.toFixed(4)}`;
    }
  });

  // Try to use browser GPS to center the map initially if available
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        reportMap.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        reportMap.setZoom(14);
        
        // Auto-drop the marker upon successful GPS capture!
        manualLat = pos.coords.latitude;
        manualLng = pos.coords.longitude;
        if(reportMarker) {
          reportMarker.setPosition({ lat: manualLat, lng: manualLng });
        }
        
        const txt = document.getElementById("report-location-text");
        if(txt) {
          txt.style.display="block";
          txt.textContent = `Auto-located: ${manualLat.toFixed(4)}, ${manualLng.toFixed(4)}`;
        }
      },
      () => { /* Ignore silently */ },
      { timeout: 5000, maximumAge: 60000 }
    );
  }
}

let unsubMyReports = null;
function initMyReports(){
  const user = auth.currentUser;
  if (!user) return;
  
  if (unsubMyReports) unsubMyReports();
  
  const q = query(collection(db, "delayReports"), where("reportedBy", "==", user.uid));
  unsubMyReports = onSnapshot(q, (snapshot) => {
    const list = document.getElementById("my-reports-list");
    if(!list) return;
    
    if (snapshot.empty) {
      list.innerHTML = '<div style="color:var(--muted); font-size:13px; text-align:center; padding:20px;">No recent reports found.</div>';
      return;
    }
    
    let html = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const route = window.ROUTES ? window.ROUTES.find(r => r.id === data.route) || {number: "Unknown"} : {number: "Unknown"};
      const reasonLabel = data.delayReason ? data.delayReason.replace("_"," ") : "Unknown reason";
      
      html += `
        <div style="background:rgba(255,255,255,0.05); border:1px solid var(--border); border-radius:12px; padding:12px; display:flex; justify-content:space-between; align-items:center;">
          <div>
            <div style="font-weight:bold; font-size:14px; margin-bottom:4px;">${route.number} <span style="font-size:12px; font-weight:normal; color:var(--muted); text-transform:capitalize;">• ${reasonLabel}</span></div>
            <div style="font-size:11px; color:var(--muted);">${data.status || 'pending'}</div>
          </div>
          <button onclick="cancelReport('${docSnap.id}')" style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); color:#FCA5A5; padding:6px 12px; border-radius:8px; cursor:pointer; font-size:12px; font-family:'DM Sans',sans-serif; transition:all 0.2s;">
            Cancel
          </button>
        </div>
      `;
    });
    list.innerHTML = html;
  });
}

async function cancelReport(id) {
  if (confirm("Are you sure you want to cancel this report?")) {
    try {
      await deleteDoc(doc(db, "delayReports", id));
      console.log("Report cancelled intentionally by user.");
    } catch(err) {
      console.error("Cancellation failed", err);
      alert("Error cancelling report.");
    }
  }
}

async function submitReport(e){
  const btn=document.getElementById("submit-btn");
  
  // Validate selected route and reason again just in case
  const routeId = document.getElementById("report-route").value;
  if(!routeId || !selectedReason) {
    alert("Please ensure a route and a valid reason are selected.");
    return;
  }
  
  // ripple
  const rippleWrap=document.getElementById("ripple-wrap");
  const rip=document.createElement("div");
  rip.className="ripple";
  rip.style.cssText="width:40px;height:40px;left:50%;top:50%;margin-left:-20px;margin-top:-20px;";
  rippleWrap.appendChild(rip);
  setTimeout(()=>rip.remove(),600);
  
  document.getElementById("submit-text").innerHTML='<div class="spinner"></div>';
  btn.style.pointerEvents="none";
  
  try {
    const user = auth.currentUser;
    // Map internal UI severity to semantic values based on the slider value
    let severityLevel = "minor";
    if (severityVal >= 0.4 && severityVal < 0.75) severityLevel = "moderate";
    else if (severityVal >= 0.75) severityLevel = "severe";

    // Prepare coordinates: Because we auto-filled manualLat in initReportMap,
    // they are guaranteed to exist, which completely prevents "Location unavailable"
    let latitude = manualLat;
    let longitude = manualLng;
    
    // Safety Catch: if they completely bypassed Step 3 quickly and map never loaded:
    if (latitude === null || longitude === null) {
      // Fallback to automatic GPS natively
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 0,
            enableHighAccuracy: true
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        console.log("Location auto-captured during bypass:", latitude, longitude);
      } catch (geoErr) {
        console.warn("Geolocation failed during bypass:", geoErr.message);
        // Absolute last resort (Bangalore default)
        latitude = 12.9716;
        longitude = 77.5946;
      }
    } else {
      console.log("Using map location:", latitude, longitude);
    }

    const reportData = {
      route: routeId,
      vehicleType: selectedVeh,
      delayReason: selectedReason,
      severityLevel: severityLevel,
      notes: document.getElementById("report-notes").value.trim(),
      timestamp: (() => {
        const dateInput = document.getElementById("report-date").value;
        const timeInput = document.getElementById("report-time").value;
        if (dateInput && timeInput) {
          return new Date(`${dateInput}T${timeInput}`);
        }
        // Fallback to current time if inputs are missing
        return new Date();
      })(),
      reportedBy: user ? user.uid : "anonymous",
      latitude: latitude,
      longitude: longitude
    };

    const docRef = await addDoc(collection(db, "delayReports"), reportData);
    console.log("Report saved successfully with ID: ", docRef.id);
    
    showSuccess();
    btn.style.pointerEvents="";
    document.getElementById("submit-text").textContent="Submit Report 🚀";
  } catch (error) {
    console.error("Error submitting report: ", error);
    alert("There was an error submitting your report. Please try again.");
    btn.style.pointerEvents="";
    document.getElementById("submit-text").textContent="Submit Report 🚀";
  }
}

function showSuccess(){
  const ov=document.getElementById("success-overlay");
  ov.classList.add("show");
  spawnConfetti();
  let count=3;
  const t=setInterval(()=>{
    document.getElementById("redirect-count").textContent=--count;
    if(count<=0){clearInterval(t);hideSuccess();}
  },1000);
}

function hideSuccess(){
  document.getElementById("success-overlay").classList.remove("show");
  gotoStep(1);selectedReason=null;
  document.querySelectorAll(".reason-card").forEach(c=>c.classList.remove("selected"));
  document.getElementById("report-notes").value="";
  if(document.getElementById("report-location-text")) {
     document.getElementById("report-location-text").style.display="none";
  }
  manualLat = null;
  manualLng = null;
  if(reportMarker) {
    reportMarker.setMap(null);
    reportMarker = null;
  }
  showPage("page-routes");
}

function spawnConfetti(){
  const wrap=document.getElementById("confetti-wrap");
  wrap.innerHTML="";
  const colors=["#3B82F6","#06B6D4","#10B981","#F59E0B","#8B5CF6","#EF4444","#FFFFFF"];
  for(let i=0;i<60;i++){
    const dot=document.createElement("div");
    dot.className="confetti-dot";
    dot.style.cssText=`
      left:${10+Math.random()*80}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-delay:${Math.random()*0.5}s;
      animation-duration:${1+Math.random()*1}s;
      width:${4+Math.random()*8}px;height:${4+Math.random()*8}px;
      border-radius:${Math.random()>0.5?"50%":"2px"};
    `;
    wrap.appendChild(dot);
  }
}

// Ensure functions are global
window.setVeh = setVeh;
window.selectReason = selectReason;
window.setSeverityClick = setSeverityClick;
window.updateCharCount = updateCharCount;
window.handlePhoto = handlePhoto;
window.removePhoto = removePhoto;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.gotoStep = gotoStep;
window.submitReport = submitReport;
window.hideSuccess = hideSuccess;
window.cancelReport = cancelReport;
