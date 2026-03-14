import { db } from '../config/firebase.js';
import { collection, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

let unsubscribe = null;
let unsubPolls = null;
let currentSearch = "";
let latestReports = [];
let selectedPollVote = null;
let pollCounts = { green: 0, yellow: 0, red: 0 };

export function initCrowd() {
  const grid = document.getElementById("crowd-grid");
  if (!grid) return;
  grid.innerHTML = '<div style="color:white;text-align:center;width:100%;padding:40px;">Loading aggregation data...</div>';

  if (unsubscribe) {
    unsubscribe();
  }

  const reportsRef = collection(db, "delayReports");
  unsubscribe = onSnapshot(reportsRef, (snapshot) => {
    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    latestReports = reports;
    renderDashboard();
  }, (error) => {
    console.error("Error fetching delay reports: ", error);
    grid.innerHTML = '<div style="color:var(--danger);text-align:center;width:100%;padding:40px;">Failed to load data.</div>';
  });

  if (unsubPolls) unsubPolls();
  unsubPolls = onSnapshot(collection(db, "crowdPolls"), (snapshot) => {
    pollCounts = { green: 0, yellow: 0, red: 0 };
    snapshot.forEach(doc => {
      const v = doc.data().vote;
      if(pollCounts[v] !== undefined) pollCounts[v]++;
    });
    updatePollUI();
  });
}

function updatePollUI() {
  const gEl = document.getElementById("poll-cnt-green");
  const yEl = document.getElementById("poll-cnt-yellow");
  const rEl = document.getElementById("poll-cnt-red");
  
  if(gEl) gEl.textContent = `${pollCounts.green} votes`;
  if(yEl) yEl.textContent = `${pollCounts.yellow} votes`;
  if(rEl) rEl.textContent = `${pollCounts.red} votes`;
  
  updateMajorityUI();
}

function updateMajorityUI() {
  const resultDiv = document.getElementById("poll-result-message");
  if (!resultDiv) return;
  
  // strict majority logic
  let maxVotes = -1;
  let winner = null;
  let isTie = false;
  
  for (const [color, count] of Object.entries(pollCounts)) {
    if (count > maxVotes) {
      maxVotes = count;
      winner = color;
      isTie = false;
    } else if (count === maxVotes) {
      isTie = true;
    }
  }
  
  if (maxVotes === 0) {
    resultDiv.style.display = "none";
    return;
  }
  
  if (isTie) {
    resultDiv.style.display = "block";
    resultDiv.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
    resultDiv.style.color = "var(--text)";
    resultDiv.textContent = "Majority says: Undecided (Tie)";
  } else {
    resultDiv.style.display = "block";
    if (winner === "green") {
      resultDiv.style.backgroundColor = "rgba(16,185,129,0.1)";
      resultDiv.style.color = "#6EE7B7";
      resultDiv.textContent = "Majority says: Not Crowded 🟢";
    } else if (winner === "yellow") {
      resultDiv.style.backgroundColor = "rgba(245,158,11,0.1)";
      resultDiv.style.color = "#FCD34D";
      resultDiv.textContent = "Majority says: Medium Crowded 🟡";
    } else if (winner === "red") {
      resultDiv.style.backgroundColor = "rgba(239,68,68,0.1)";
      resultDiv.style.color = "#FCA5A5";
      resultDiv.textContent = "Majority says: Fully Crowded 🔴";
    }
  }
}

export function selectPollVote(color) {
  selectedPollVote = color;
  const colors = ['green', 'yellow', 'red'];
  
  colors.forEach(c => {
    const btn = document.getElementById(`btn-poll-${c}`);
    if (btn) {
      if (c === color) {
        btn.style.boxShadow = `0 0 0 3px rgba(255,255,255,0.4)`;
        btn.style.transform = "scale(1.05)";
      } else {
        btn.style.boxShadow = "none";
        btn.style.transform = "scale(1)";
      }
    }
  });
}

export async function submitPollVote() {
  if (window.hasVotedInPoll) {
    alert("You have already voted in the community poll during this session.");
    return;
  }

  if (!selectedPollVote) {
    alert("Please select an option first!");
    return;
  }
  
  const btn = document.getElementById("submit-poll-btn");
  const origText = btn.innerHTML;
  btn.innerHTML = 'Submitting...';
  btn.style.pointerEvents = 'none';
  
  try {
    const sess = typeof getSession === 'function' ? getSession() : null;
    const uid = sess ? sess.uid : "anonymous_" + Math.random().toString(36).substr(2, 9);
    
    // Optimistic Update so the result appears instantly
    if(pollCounts[selectedPollVote] !== undefined) {
      pollCounts[selectedPollVote]++;
    }
    updatePollUI(); // Triggers updateMajorityUI

    await addDoc(collection(db, "crowdPolls"), {
      vote: selectedPollVote,
      userId: uid,
      timestamp: serverTimestamp()
    });
    
    window.hasVotedInPoll = true; // Use session variable instead of localStorage for dev testing
    
    setTimeout(() => {
      btn.innerHTML = 'Vote Submitted ✓';
      selectPollVote(null); // reset selection
    }, 500);

  } catch(error) {
    console.error("Poll submission error", error);
    alert("Failed to submit vote. Check console.");
    
    // Revert optimistic update
    if(pollCounts[selectedPollVote] !== undefined) {
      pollCounts[selectedPollVote]--;
    }
    updatePollUI();
    
    btn.innerHTML = origText;
    btn.style.pointerEvents = '';
  }
}

function renderDashboard() {
  const totalReports = latestReports.length;
  const routeCounts = {}; 

  latestReports.forEach(r => {
    const rId = r.route;
    if (rId) {
      if (!routeCounts[rId]) routeCounts[rId] = 0;
      routeCounts[rId]++;
    }
  });

  const routesData = window.ROUTES || [];
  let summary = routesData.map(route => {
    const count = routeCounts[route.id] || 0;
    const confidence = totalReports > 0 ? Math.round((count / totalReports) * 100) : 0;
    let status = "Normal";
    let statusClass = "normal";
    
    if (count >= 5) {
      status = "High Delay";
      statusClass = "severe";
    } else if (count >= 2) {
      status = "Moderate Delay";
      statusClass = "moderate";
    }

    return { ...route, count, confidence, status, statusClass };
  });

  // Sort descending by count
  summary.sort((a, b) => b.count - a.count);

  const grid = document.getElementById("crowd-grid");
  if (!grid) return;

  const q = currentSearch.toLowerCase();
  const filtered = summary.filter(r => 
    r.name.toLowerCase().includes(q) || 
    r.number.toLowerCase().includes(q)
  );

  const typeEmoji = {bus:"🚌", metro:"🚇", tram:"🚊", ferry:"⛴️"};

  if (filtered.length === 0) {
    grid.innerHTML = '<div style="color:var(--muted);text-align:center;width:100%;padding:40px;">No matching routes found.</div>';
    return;
  }

  grid.innerHTML = filtered.map(r => `
    <div class="crowd-card">
      <div class="route-head">
        <div class="route-name">${typeEmoji[r.type] || "🚍"} ${r.number}</div>
        <div class="status-badge ${r.statusClass}">${r.status}</div>
      </div>
      <div style="font-size:13px;color:#9ca3af;">${r.name}</div>
      <div class="divider"></div>
      <div class="crowd-stat">
        <span>Commuter Reports</span>
        <strong>${r.count}</strong>
      </div>
      <div class="crowd-stat">
        <span>Crowd Confidence</span>
        <strong>${r.confidence}%</strong>
      </div>
    </div>
  `).join("");
}

export function filterCrowd() {
  const searchInput = document.getElementById("crowd-search");
  if (searchInput) {
    currentSearch = searchInput.value;
    renderDashboard();
  }
}

// Expose globally for HTML event listeners and routing
window.initCrowd = initCrowd;
window.filterCrowd = filterCrowd;
window.selectPollVote = selectPollVote;
window.submitPollVote = submitPollVote;
