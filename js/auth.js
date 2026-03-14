import { auth, db } from '../config/firebase.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  doc, 
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ═══════════════ AUTH ═══════════════
let currentUser=null;
let currentFilter="all";
let selectedReason=null;
let selectedVeh="bus";
let severityVal=0.16;
let currentStep=1;

let currentRoleSelect = {
  login: "passenger",
  signup: "passenger"
};

export function setRole(page, role) {
  currentRoleSelect[page] = role;
  const pBtn = document.getElementById(`${page}-role-passenger`);
  const aBtn = document.getElementById(`${page}-role-admin`);
  const sContainer = document.getElementById(`${page}-social-container`);
  
  if (role === 'passenger') {
    pBtn.classList.add("active");
    aBtn.classList.remove("active");
    if(sContainer) sContainer.style.display = "block";
  } else {
    pBtn.classList.remove("active");
    aBtn.classList.add("active");
    if(sContainer) sContainer.style.display = "none";
  }
}

function getSession(){
  try{return JSON.parse(localStorage.getItem("tdr_session")||"null");}catch{return null;}
}
function setSession(u){localStorage.setItem("tdr_session",JSON.stringify(u));}
function clearSession(){localStorage.removeItem("tdr_session");}

function checkDeviceMultiAccount(uid, email) {
  let users = [];
  try { users = JSON.parse(localStorage.getItem("tdr_device_users") || "[]"); } catch(e){}
  
  if (!users.includes(uid)) {
    if (users.length > 0) {
      alert(`Notice: You have another account related to this device. Logging in as ${email}.`);
    }
    users.push(uid);
    localStorage.setItem("tdr_device_users", JSON.stringify(users));
  }
}

async function doLogin(e){
  e.preventDefault();
  const id=document.getElementById("login-id").value.trim();
  const pw=document.getElementById("login-pw").value;
  const btn=document.getElementById("login-btn");
  const err=document.getElementById("login-error");
  
  if(!id || !pw){
    err.textContent = "Please enter both email and password.";
    err.classList.add("show");
    btn.classList.add("shake");
    setTimeout(()=>btn.classList.remove("shake"),400);
    return;
  }
  
  err.classList.remove("show");
  btn.innerHTML='<div class="spinner"></div>';
  btn.classList.add("loading");

  try {
    const userCredential = await signInWithEmailAndPassword(auth, id, pw);
    const user = userCredential.user;
    
    // Fetch user role from Firestore
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    let role = "passenger";
    let name = "User";
    
    if (userDocSnap.exists()) {
      role = userDocSnap.data().role || "passenger";
      name = userDocSnap.data().name || "User";
    } else if (id === 'admin@transport.com') { // fallback for demo
      role = "admin";
      name = "Admin Demo User";
    }
    
    // Check if selected role aligns with actual role
    if (currentRoleSelect.login !== role && !(id === 'admin@transport.com' || id === 'user1@test.com')) {
      await auth.signOut(); // force sign out because of mismatch
      err.textContent = `Access denied. You selected ${currentRoleSelect.login} but this account is registered as ${role}.`;
      err.classList.add("show");
      btn.innerHTML="Sign In";
      btn.classList.remove("loading");
      return;
    }

    const sessData = { uid: user.uid, email: user.email, role: role, name: name };
    setSession(sessData);
    currentUser = sessData;
    
    checkDeviceMultiAccount(user.uid, user.email);
    
    if(document.getElementById("remember-check").classList.contains("checked")){
      localStorage.setItem("tdr_remember",btoa(id));
    }
    
    btn.innerHTML="✓ Success!";
    btn.classList.add("success");
    
    setTimeout(()=>{
      if (role === 'admin') {
        window.showPage("page-admin");
        if(typeof window.initAdmin === "function") window.initAdmin();
      } else {
        window.showPage("page-routes");
        if(typeof window.initRoutes === "function") window.initRoutes();
      }
      btn.innerHTML="Sign In";
      btn.classList.remove("loading","success");
    },600);
  } catch(error) {
    // Auto-create demo accounts if they don't exist yet
    if (id === 'admin@transport.com' || id === 'user1@test.com') {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, id, pw);
        const user = userCredential.user;
        const assignedRole = id === 'admin@transport.com' ? "admin" : "passenger";
        const assignedName = id === 'admin@transport.com' ? "Admin Demo User" : "Passenger Demo User";

        await setDoc(doc(db, "users", user.uid), {
          userId: user.uid,
          name: assignedName,
          email: id,
          role: assignedRole,
          createdAt: serverTimestamp()
        });
        
        const sessData = { uid: user.uid, email: user.email, role: assignedRole, name: assignedName };
        setSession(sessData);
        currentUser = sessData;
        
        checkDeviceMultiAccount(user.uid, user.email);
        
        if(document.getElementById("remember-check").classList.contains("checked")){
          localStorage.setItem("tdr_remember",btoa(id));
        }
        
        btn.innerHTML="✓ Success!";
        btn.classList.add("success");
        
        setTimeout(()=>{
          if (assignedRole === 'admin') {
            window.showPage("page-admin");
            if(typeof window.initAdmin === "function") window.initAdmin();
          } else {
            window.showPage("page-routes");
            if(typeof window.initRoutes === "function") window.initRoutes();
          }
          btn.innerHTML="Sign In";
          btn.classList.remove("loading","success");
        },600);
        return; // Success!
      } catch (createErr) {
        console.error("Auto-create demo account failed: ", createErr);
      }
    }
    
    err.textContent = "Invalid credentials. Try again.";
    err.classList.add("show");
    btn.innerHTML="Sign In";
    btn.classList.remove("loading");
    btn.classList.add("shake");
    setTimeout(()=>btn.classList.remove("shake"),400);
  }
}

async function doSignup(e){
  e.preventDefault();
  const name=document.getElementById("signup-name").value.trim();
  const id=document.getElementById("signup-id").value.trim();
  const pw=document.getElementById("signup-pw").value;
  const confirm=document.getElementById("signup-confirm").value;
  const err=document.getElementById("signup-error");
  const btn=document.getElementById("signup-btn");
  
  if(pw!==confirm){
    err.textContent="Passwords do not match.";
    err.style.display="block";
    return;
  }
  err.style.display="none";
  btn.innerHTML='<div class="spinner"></div>';
  btn.classList.add("loading");

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, id, pw);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      userId: user.uid,
      name: name || "User",
      email: id,
      role: currentRoleSelect.signup,
      createdAt: serverTimestamp()
    });
    
    const sessData = { uid: user.uid, email: user.email, role: currentRoleSelect.signup, name: name || "User" };
    setSession(sessData);
    currentUser = sessData;
    
    checkDeviceMultiAccount(user.uid, user.email);
    
    btn.innerHTML="✓ Created!";
    btn.classList.add("success");
    
    setTimeout(()=>{
      window.showPage("page-routes");
      if(typeof window.initRoutes === "function") window.initRoutes();
      btn.innerHTML="Create Account";
      btn.classList.remove("loading","success");
    },600);
  } catch(error){
    err.textContent = error.message;
    err.style.display="block";
    btn.innerHTML="Create Account";
    btn.classList.remove("loading");
  }
}

async function doLoginGoogle(){
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    
    // Check if user exists in db
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    let role = "passenger";
    
    if (!userDocSnap.exists()) {
      // Create new user profile
      await setDoc(userDocRef, {
        userId: user.uid,
        name: user.displayName || "Google User",
        email: user.email,
        role: "passenger", // Google login is strictly passenger
        createdAt: serverTimestamp()
      });
    } else {
      role = userDocSnap.data().role || "passenger";
    }

    const sessData = { uid: user.uid, email: user.email, role: role, name: user.displayName || "Google User" };
    setSession(sessData);
    currentUser = sessData;
    
    checkDeviceMultiAccount(user.uid, user.email);

    if (role === 'admin') {
      window.showPage("page-admin");
      if(typeof window.initAdmin === "function") window.initAdmin();
    } else {
      window.showPage("page-routes");
      if(typeof window.initRoutes === "function") window.initRoutes();
    }
  } catch (error) {
    console.error("Google login failed", error);
    alert("Google sign in failed: " + error.message);
  }
}

function doLogout(){
  clearSession();currentUser=null;
  window.showPage("page-login");
}

function doForgot(){
  const btn=document.getElementById("forgot-btn");
  btn.innerHTML='<div class="spinner"></div>';
  setTimeout(()=>{
    document.getElementById("forgot-form-area").style.display="none";
    document.getElementById("forgot-success").style.display="block";
  },1200);
}

function fillDemo(email,pw){
  document.getElementById("login-id").value=email;
  document.getElementById("login-pw").value=pw;
}

function togglePw(id){
  const inp=document.getElementById(id);
  inp.type=inp.type==="password"?"text":"password";
}

function toggleCheck(id){
  document.getElementById(id).classList.toggle("checked");
}

function setTab(page,type){
  const tabs=document.querySelectorAll(`#page-${page} .tab-btn`);
  tabs.forEach((t,i)=>t.classList.toggle("active",i===(type==="email"?0:1)));
  const label=document.getElementById(`${page}-id-label`);
  if(label)label.textContent=type==="email"?"Email address":"Phone number";
}

function checkPwStrength(pw){
  let score=0;
  if(pw.length>=8)score++;
  if(/[A-Z]/.test(pw))score++;
  if(/[0-9]/.test(pw))score++;
  if(/[^A-Za-z0-9]/.test(pw))score++;
  const colors=["","#EF4444","#F97316","#F59E0B","#10B981"];
  const labels=["Enter a password","Too short","Weak","Fair","Strong"];
  for(let i=1;i<=4;i++){
    const bar=document.getElementById("bar"+i);
    bar.style.background=i<=score?colors[score]:"rgba(255,255,255,0.1)";
  }
  document.getElementById("pw-label").textContent=pw?labels[score]:"Enter a password";
  document.getElementById("pw-label").style.color=colors[score]||"var(--muted)";
}

function checkConfirm(){
  const pw=document.getElementById("signup-pw").value;
  const c=document.getElementById("signup-confirm").value;
  const icon=document.getElementById("confirm-icon");
  if(!c)return;
  icon.textContent=pw===c?"✅":"❌";
}

// Ensure functions are available globally for HTML event handlers
window.doLogin = doLogin;
window.doSignup = doSignup;
window.doLoginGoogle = doLoginGoogle;
window.doLogout = doLogout;
window.doForgot = doForgot;
window.fillDemo = fillDemo;
window.togglePw = togglePw;
window.toggleCheck = toggleCheck;
window.setTab = setTab;
window.checkPwStrength = checkPwStrength;
window.checkConfirm = checkConfirm;

// Export session helpers so app.js can use them across module boundary
window.getSession = getSession;
window.setSession = setSession;
window.clearSession = clearSession;
