// --- 1. Snow Effect ---
const canvas = document.getElementById('snowCanvas');
const ctx = canvas.getContext('2d');
let width, height;
let particles = [];
let baseSpeed = 1;
let currentSpeed = baseSpeed;
let snowColor = "rgba(255, 255, 255,"; 

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Snowflake {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * -height;
        this.size = Math.random() * 3 + 1;
        this.speed = Math.random() * 1 + 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.drift = Math.random() * 2 - 1;
    }
    update() {
        this.y += this.speed * currentSpeed;
        this.x += this.drift * 0.5;
        if (this.y > height) this.reset();
    }
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `${snowColor} ${this.opacity})`;
        ctx.fill();
    }
}
for (let i = 0; i < 100; i++) particles.push(new Snowflake());

function animateSnow() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    if (currentSpeed > baseSpeed) currentSpeed -= 0.05;
    requestAnimationFrame(animateSnow);
}
animateSnow();

// --- 2. Interaction ---
const wishInput = document.getElementById('user-wish');
wishInput.addEventListener('input', () => { currentSpeed = Math.random() * 6 + 2; });

// --- 3. App Logic & Cooldown ---
let userName = "";
const COOLDOWN_HOURS = 24;
const COOLDOWN_MS = COOLDOWN_HOURS * 60 * 60 * 1000;
const SECRET_CODE = "flow4u";
const SPECIAL_CODE = "kimloveop";
let isSpecialMode = false;
let countdownInterval;

window.onload = function() {
    checkCooldownState();
};

function startApp() {
    const lastWishTime = localStorage.getItem('lastWishTime');
    if (lastWishTime) {
        const timeDiff = Date.now() - parseInt(lastWishTime);
        if (timeDiff < COOLDOWN_MS) {
             const backBtn = document.getElementById('btn-back-cooldown');
             if(backBtn) backBtn.classList.add('hidden');
             goToScreen('screen-cooldown');
             return;
        }
    }
    goToScreen('screen-name');
}

function checkCooldownState() {
    const lastWishTime = localStorage.getItem('lastWishTime');
    if (lastWishTime) {
        const timeDiff = Date.now() - parseInt(lastWishTime);
        if (timeDiff < COOLDOWN_MS) {
            const targetTime = parseInt(lastWishTime) + COOLDOWN_MS;
            startCountdown(targetTime);
            return true; 
        }
    }
    return false;
}

// --- SPECIAL MODE LOGIC ---
function openSpecialModal() {
    const modal = document.getElementById('special-login-modal');
    modal.classList.remove('hidden');
    void modal.offsetWidth; 
    modal.classList.add('active-modal');
}

function closeSpecialModal() {
    const modal = document.getElementById('special-login-modal');
    document.getElementById('special-password-input').value = "";
    modal.classList.remove('active-modal');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function checkSpecialPassword() {
    const input = document.getElementById('special-password-input');
    if (input.value === SPECIAL_CODE) {
        activateSpecialMode();
        closeSpecialModal();
    } else {
        input.value = "";
        showErrorModal(); 
    }
}

function activateSpecialMode() {
    isSpecialMode = true;
    document.body.classList.add('theme-special');
    snowColor = "rgba(253, 164, 175,"; 

    // Hide Heart
    document.getElementById('secret-trigger-btn').style.display = 'none';

    // Reset Cooldown
    localStorage.removeItem('lastWishTime');
    if (countdownInterval) clearInterval(countdownInterval);

    // Go to Name Screen
    goToScreen('screen-name');
}

// --- Navigation ---
function goToCooldownFromResult() {
    document.getElementById('btn-back-cooldown').classList.remove('hidden');
    goToScreen('screen-cooldown');
}

function goBackToResult() {
    goToScreen('screen-result');
}

function startCountdown(targetTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    updateTimerDisplay(targetTime);
    countdownInterval = setInterval(() => {
        updateTimerDisplay(targetTime);
    }, 1000);
}

function updateTimerDisplay(targetTime) {
    const now = Date.now();
    const diff = targetTime - now;

    if (diff <= 0) {
        clearInterval(countdownInterval);
        localStorage.removeItem('lastWishTime');
        goToScreen('screen-welcome');
        return;
    }
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const hStr = hours < 10 ? "0" + hours : hours;
    const mStr = minutes < 10 ? "0" + minutes : minutes;
    const sStr = seconds < 10 ? "0" + seconds : seconds;
    const timerString = `${hStr}:${mStr}:${sStr}`;

    const mainTimer = document.getElementById('countdown-timer');
    if(mainTimer) mainTimer.innerText = timerString;
    const resultTimer = document.getElementById('result-timer');
    if(resultTimer) resultTimer.innerText = timerString;
}

// --- RESET COOLDOWN & THEME (UPDATED) ---
function checkSecretCode() {
    const input = document.getElementById('secret-code');
    const enteredCode = input.value.trim();
    
    if (enteredCode === SECRET_CODE) {
        // 1. Clear Cooldown
        localStorage.removeItem('lastWishTime');
        clearInterval(countdownInterval);
        input.value = "";

        // 2. RESET THEME TO NORMAL
        isSpecialMode = false;
        document.body.classList.remove('theme-special');
        snowColor = "rgba(255, 255, 255,"; // Reset snow to white
        
        // 3. Show Heart Button Again (Restore default display)
        document.getElementById('secret-trigger-btn').style.display = ''; 

        // 4. Show Success Modal & Navigate
        showSuccessModal();
        setTimeout(() => { 
            hideSuccessModal(); 
            goToScreen('screen-welcome'); 
        }, 2000); 

    } else {
        input.value = ""; 
        showErrorModal();
    }
}

// Modals
function showSuccessModal() { const modal = document.getElementById('success-modal'); modal.classList.remove('hidden'); void modal.offsetWidth; modal.classList.add('active-modal'); }
function hideSuccessModal() { const modal = document.getElementById('success-modal'); modal.classList.remove('active-modal'); setTimeout(() => { modal.classList.add('hidden'); }, 300); }
function showErrorModal() { const modal = document.getElementById('error-modal'); modal.classList.remove('hidden'); void modal.offsetWidth; modal.classList.add('active-modal'); }
function closeErrorModal() { const modal = document.getElementById('error-modal'); modal.classList.remove('active-modal'); setTimeout(() => { modal.classList.add('hidden'); }, 300); }

const messages = [
    "Your wish has been heard. The universe is aligning for you.",
    "You've done great this year. May your smile shine brighter than the snow.",
    "No wish is too small, and no dream is too big.",
    "May happiness hug you like a warm blanket tonight.",
    "Miracles happen to those who believe. Get ready for yours.",
    "Something wonderful is coming your way. Be ready to receive.",
    "Trust the magic of new beginnings. Next year belongs to you."
];

const specialMessages = [
    "My only wish is to see you happy every single day.",
    "You are the best gift I could ever ask for.",
    "No matter what you wish for, I'll be there to help make it true.",
    "Merry Christmas, my love. You make every moment magical.",
    "Just seeing your smile makes my world complete."
];

const nightColors = [
    { c1: "#1e3a8a", c2: "#0f172a" },
    { c1: "#581c87", c2: "#1e1b4b" },
    { c1: "#0f766e", c2: "#022c22" },
    { c1: "#7f1d1d", c2: "#450a0a" },
    { c1: "#312e81", c2: "#000000" }
];

const specialColors = [
    { c1: "#be185d", c2: "#831843" },
    { c1: "#9d174d", c2: "#500724" },
    { c1: "#db2777", c2: "#831843" },
    { c1: "#881337", c2: "#4c0519" },
    { c1: "#e11d48", c2: "#881337" }
];

function setRandomCardColor() {
    let palette = isSpecialMode ? specialColors : nightColors;
    const randomColorPair = palette[Math.floor(Math.random() * palette.length)];
    const cardFront = document.getElementById('cardFrontDynamic');
    cardFront.style.setProperty('--card-c1', randomColorPair.c1);
    cardFront.style.setProperty('--card-c2', randomColorPair.c2);
}

function goToScreen(screenId) {
    const currentActive = document.querySelector('.screen.active');
    if (currentActive) {
        currentActive.classList.remove('active');
        setTimeout(() => { if(!currentActive.classList.contains('active')) { currentActive.classList.add('hidden'); } }, 600); 
    }
    const target = document.getElementById(screenId);
    target.classList.remove('hidden'); 
    setTimeout(() => { target.classList.add('active'); }, 50);

    if(screenId === 'screen-wish') {
        const nameInput = document.getElementById('username').value;
        userName = nameInput || "Someone Special";
    }
}

function showConfirmModal() {
    const wishText = document.getElementById('user-wish').value;
    if(!wishText.trim()) { alert("Please make a wish first :)"); return; }
    const modal = document.getElementById('modal-overlay');
    modal.classList.remove('hidden'); void modal.offsetWidth; modal.classList.add('active-modal');
}
function closeConfirmModal() { const modal = document.getElementById('modal-overlay'); modal.classList.remove('active-modal'); setTimeout(() => { modal.classList.add('hidden'); }, 300); }

function confirmSendWish() {
    closeConfirmModal();
    setTimeout(() => {
        const now = Date.now();
        localStorage.setItem('lastWishTime', now.toString());
        startCountdown(now + COOLDOWN_MS);

        let msgList = isSpecialMode ? specialMessages : messages;
        const randomMsg = msgList[Math.floor(Math.random() * msgList.length)];
        document.getElementById('final-message').innerText = randomMsg;
        document.getElementById('display-name').innerText = `- To ${userName} -`;

        if (isSpecialMode) {
            document.getElementById('card-front-icon').className = "fa-solid fa-heart card-icon-deco";
            document.getElementById('card-front-text').innerText = "For My Love";
        } else {
            document.getElementById('card-front-icon').className = "fa-solid fa-gift card-icon-deco";
            document.getElementById('card-front-text').innerText = "For You";
        }

        setRandomCardColor();
        const card = document.querySelector('.card');
        card.classList.remove('flipped');
        document.getElementById('action-buttons').classList.add('disabled');

        goToScreen('screen-result');
    }, 300);
}

function toggleCard(element) {
    const card = element.querySelector('.card');
    const actions = document.getElementById('action-buttons');
    card.classList.toggle('flipped');
    if (card.classList.contains('flipped')) { setTimeout(() => actions.classList.remove('disabled'), 300); } else { actions.classList.add('disabled'); }
}

function downloadCard(event) {
    event.stopPropagation();
    const cardBack = document.querySelector('.card-back');
    html2canvas(cardBack, { scale: 2, backgroundColor: "#fdfbf7" }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'my-christmas-wish.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}