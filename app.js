// Import Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js"; 

// --- Config (KEY เดิมของคุณ) ---
const firebaseConfig = {
  apiKey: "AIzaSyCfS9Ps64tK_MCG5qD8D1Cs7w89bUySy3g",
  authDomain: "wishful-ddffb.firebaseapp.com",
  projectId: "wishful-ddffb",
  storageBucket: "wishful-ddffb.firebasestorage.app",
  messagingSenderId: "343543271972",
  appId: "1:343543271972:web:7c0d5cca047e862d937eb1",
  measurementId: "G-W6NNERVFJ9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- GLOBAL VARIABLES ---
let currentUserData = null;
let snowInterval = null;
const FAKE_DOMAIN = "@wishful.local"; 

const quotes = [
    "Simplicity is the ultimate sophistication.",
    "Quiet the mind, and the soul will speak.",
    "Do less, but with more focus.",
    "Elegance is refusal.",
    "What you seek is seeking you."
];

const shopItems = [
    { id: "reset_timer", icon: "⏳", name: "Time Turner", price: 200, type: "action" },
    { id: "i1", icon: "🕯️", name: "Scented Candle", price: 50, type: "item" },
    { id: "i2", icon: "☕", name: "Morning Brew", price: 80, type: "item" },
    { id: "i3", icon: "🖋️", name: "Fountain Pen", price: 150, type: "item" },
    { id: "i4", icon: "💎", name: "Diamond", price: 300, type: "item" },
    { id: "i5", icon: "👑", name: "Royal Crown", price: 500, type: "item" }
];

// --- UI HELPERS ---
function showToast(msg, type = 'normal') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle');
    t.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function confirmAction(title, desc) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-desc').innerText = desc;
        modal.classList.remove('hidden');

        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');
        const cleanUp = () => { yesBtn.onclick = null; noBtn.onclick = null; modal.classList.add('hidden'); };

        yesBtn.onclick = () => { cleanUp(); resolve(true); };
        noBtn.onclick = () => { cleanUp(); resolve(false); };
    });
}

// Password Toggle
document.querySelectorAll('.toggle-pass').forEach(item => {
    item.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('fa-eye'); this.classList.toggle('fa-eye-slash');
    });
});

// Toggle Auth Screens
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
document.getElementById('link-to-register').addEventListener('click', () => { loginForm.classList.add('hidden'); registerForm.classList.remove('hidden'); });
document.getElementById('link-to-login').addEventListener('click', () => { registerForm.classList.add('hidden'); loginForm.classList.remove('hidden'); });


// --- AUTHENTICATION ---
document.getElementById('btn-login').addEventListener('click', async () => {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if(!username || !password) return showToast("Please fill all fields", "error");
    const email = username + FAKE_DOMAIN;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        showToast("Welcome back.", "success");
    } catch (e) { 
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found') showToast("Account not found.", "error");
        else showToast("Login failed.", "error");
    }
});

document.getElementById('btn-register').addEventListener('click', async () => {
    const username = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    if(!username || !password) return showToast("Fill all fields", "error");
    if(password.length < 6) return showToast("Password min 6 chars", "error");
    const email = username + FAKE_DOMAIN;
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });
        await setDoc(doc(db, "users", cred.user.uid), { username: username, credits: 0, inventory: [], last_played: "" });
        showToast("Success! Please Login.", "success");
        await signOut(auth);
        registerForm.classList.add('hidden'); loginForm.classList.remove('hidden');
        document.getElementById('login-username').value = username;
    } catch (e) { 
        if (e.code === 'auth/email-already-in-use') showToast("Username taken.", "error");
        else showToast("Error: " + e.message, "error");
    }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    const authSec = document.getElementById('auth-section');
    const gameSec = document.getElementById('game-section');
    if (user) {
        authSec.classList.add('hidden'); gameSec.classList.remove('hidden');
        document.getElementById('display-name').innerText = user.displayName || "User";
        loadUserData(user.uid);
    } else {
        authSec.classList.remove('hidden'); gameSec.classList.add('hidden');
        registerForm.classList.add('hidden'); loginForm.classList.remove('hidden');
    }
});

// --- DATA & GAME ---
async function loadUserData(uid) {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        currentUserData = snap.data();
        if(!currentUserData.inventory) currentUserData.inventory = [];
    } else {
        currentUserData = { credits: 0, last_played: "", inventory: [] };
    }
    updateDisplay();
    checkDaily();
}

function updateDisplay() {
    if(currentUserData) document.getElementById('user-credits').innerText = currentUserData.credits || 0;
}

function checkDaily() {
    const today = new Date().toISOString().split('T')[0];
    const btn = document.getElementById('btn-send-wish');
    const timer = document.getElementById('timer-area');

    if(currentUserData.last_played === today) {
        btn.disabled = true;
        btn.innerText = "Daily Limit Reached";
        timer.classList.remove('hidden');
        startTimer();
    } else {
        btn.disabled = false;
        btn.innerText = "Manifest";
        timer.classList.add('hidden');
    }
}

function startTimer() {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0,0,0,0);
    setInterval(() => {
        const diff = tomorrow - Date.now();
        if(diff <= 0) return window.location.reload();
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        document.getElementById('countdown').innerText = `${h}:${m}:${s}`;
    }, 1000);
}

// --- CARD SYSTEM (FIXED) ---
const cardModal = document.getElementById('card-modal');
const magicCard = document.getElementById('magic-card');

// Interactive Tilt
magicCard.addEventListener('mousemove', (e) => {
    const rect = magicCard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; 
    const rotateY = ((x - centerX) / centerX) * 10;
    
    // Check if flipped to adjust rotation logic
    if (!magicCard.classList.contains('flipped')) {
        magicCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    } else {
        magicCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${180 + rotateY}deg) scale(1.02)`;
    }
});

magicCard.addEventListener('mouseleave', () => {
    if (!magicCard.classList.contains('flipped')) {
        magicCard.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
    } else {
        magicCard.style.transform = `perspective(1000px) rotateX(0) rotateY(180deg) scale(1)`;
    }
});

// Flip Logic
magicCard.addEventListener('click', () => {
    if(!magicCard.classList.contains('flipped')) {
        magicCard.classList.add('flipped');
        document.querySelector('.tap-hint').style.display = 'none';
        document.getElementById('btn-close-card').classList.remove('hidden');
    }
});

document.getElementById('btn-close-card').addEventListener('click', () => {
    cardModal.classList.add('hidden');
    magicCard.classList.remove('rare');
});


// Helper to Prepare Card (Fix Bug: Always start face down)
function prepareCard(contentHTML, isRare = false) {
    magicCard.classList.remove('flipped'); // Reset flip state
    magicCard.style.transform = "perspective(1000px) rotateX(0) rotateY(0)"; // Reset rotation
    
    if(isRare) magicCard.classList.add('rare');
    else magicCard.classList.remove('rare');
    
    document.getElementById('card-inner-content').innerHTML = contentHTML;
    document.querySelector('.tap-hint').style.display = 'block';
    document.getElementById('btn-close-card').classList.add('hidden');
    
    cardModal.classList.remove('hidden');
}


// Manifest Button
document.getElementById('btn-send-wish').addEventListener('click', async () => {
    const wish = document.getElementById('wish-input').value.trim();
    if(!wish) return showToast("Please define your desire.", "error");

    const today = new Date().toISOString().split('T')[0];
    const user = auth.currentUser;
    
    try {
        const reward = 100;
        const newCredits = (currentUserData.credits || 0) + reward;
        await updateDoc(doc(db, "users", user.uid), {
            credits: newCredits, last_played: today, history: arrayUnion({ wish: wish, date: new Date().toISOString() })
        });

        currentUserData.credits = newCredits; currentUserData.last_played = today;
        updateDisplay(); checkDaily();

        // Prepare Card Data (Quote)
        const quote = quotes[Math.floor(Math.random()*quotes.length)];
        const contentHTML = `
            <p class="card-quote">"${quote}"</p>
            <div class="card-reward">
                <span>REWARD</span>
                <strong>+100 Credits</strong>
            </div>
        `;
        
        // Show Card
        const isRare = Math.random() < 0.2;
        prepareCard(contentHTML, isRare);
        document.getElementById('wish-input').value = "";

    } catch(e) { showToast("Error connecting to universe.", "error"); }
});


// --- SHOP ---
const tabs = ['home', 'shop', 'inventory'];
tabs.forEach(t => {
    document.getElementById(`nav-${t}`).addEventListener('click', () => {
        tabs.forEach(x => { document.getElementById(`tab-${x}`).classList.add('hidden'); document.getElementById(`nav-${x}`).classList.remove('active'); });
        document.getElementById(`tab-${t}`).classList.remove('hidden'); document.getElementById(`nav-${t}`).classList.add('active');
        if(t === 'shop') renderShop(); if(t === 'inventory') renderInv();
    });
});

function renderShop() {
    const c = document.getElementById('shop-container'); c.innerHTML = "";
    shopItems.forEach(item => {
        const owned = currentUserData.inventory && currentUserData.inventory.includes(item.id);
        const div = document.createElement('div'); 
        div.className = `item-card ${item.id === 'reset_timer' ? 'special' : ''}`; // Add special class
        
        let btnText = owned ? 'Acquired' : 'Purchase';
        let btnDisabled = owned;
        if (item.type === "action") { btnText = "Use Magic"; btnDisabled = false; }

        div.innerHTML = `
            <span class="item-icon">${item.icon}</span><span class="item-name">${item.name}</span>
            <span class="item-price">${item.price}</span>
            <button class="btn-buy" id="buy-${item.id}">${btnText}</button>
        `;
        c.appendChild(div);
        
        const btn = document.getElementById(`buy-${item.id}`);
        if(btnDisabled) btn.disabled = true;
        else btn.onclick = () => buyItem(item);
    });
}

async function buyItem(item) {
    if(currentUserData.credits < item.price) return showToast("Insufficient credits.", "error");
    
    const confirmed = await confirmAction(`Purchase ${item.name}?`, `Cost: ${item.price} Credits`);
    if(!confirmed) return;
    
    try {
        const newCredits = currentUserData.credits - item.price;
        const updates = { credits: newCredits };

        if (item.id === "reset_timer") {
            updates.last_played = ""; 
            currentUserData.last_played = "";
            checkDaily();
            showToast("Time has been reversed!", "success");
        } else {
            updates.inventory = arrayUnion(item.id);
            currentUserData.inventory.push(item.id);
            
            // Show Item Reveal Modal
            const contentHTML = `
                <span class="reward-icon">${item.icon}</span>
                <span class="reward-name">${item.name}</span>
            `;
            prepareCard(contentHTML, true); // Always rare effect for purchase
        }

        await updateDoc(doc(db, "users", auth.currentUser.uid), updates);
        currentUserData.credits = newCredits;
        updateDisplay(); 
        renderShop();
        
    } catch(e) { showToast("Transaction failed.", "error"); }
}

function renderInv() {
    const c = document.getElementById('inventory-container'); c.innerHTML = "";
    if(!currentUserData.inventory.length) { c.innerHTML = "<p class='empty-state'>Empty.</p>"; return; }
    currentUserData.inventory.forEach(id => {
        const item = shopItems.find(i => i.id === id);
        if(item) {
            const div = document.createElement('div'); div.className = "item-card";
            div.innerHTML = `<span class="item-icon">${item.icon}</span><span class="item-name">${item.name}</span>`;
            c.appendChild(div);
        }
    });
}

// --- THEME & SNOW ---
document.getElementById('theme-toggle').addEventListener('click', () => {
    const isLight = document.body.getAttribute('data-theme') === 'light';
    if(isLight) { document.body.removeAttribute('data-theme'); startSnow(); } 
    else { document.body.setAttribute('data-theme', 'light'); stopSnow(); }
});

function createSnow() {
    const f = document.createElement('div'); f.className = 'snowflake';
    f.style.left = Math.random()*100+'vw'; f.style.width = f.style.height = Math.random()*3+2+'px';
    f.style.animationDuration = Math.random()*5+3+'s'; f.style.opacity = Math.random()*0.5;
    document.getElementById('snow-container').appendChild(f); setTimeout(()=>f.remove(), 8000);
}
function startSnow() { if(snowInterval) clearInterval(snowInterval); snowInterval = setInterval(createSnow, 200); }
function stopSnow() { if(snowInterval) clearInterval(snowInterval); document.getElementById('snow-container').innerHTML = ''; }
startSnow();