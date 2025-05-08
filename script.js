// --- Get DOM Elements ---
const canvas = document.getElementById('wheelCanvas');
const ctx = canvas.getContext('2d');
const spinButton = document.getElementById('spinButton');
const participantInput = document.getElementById('participantInput');
const addButton = document.getElementById('addButton');
const clearButton = document.getElementById('clearButton');
const winnerDisplay = document.getElementById('winnerDisplay');
const winnerNameEl = document.getElementById('winnerName');
const participantInfoEl = document.getElementById('participantInfo');
const participantListDiv = document.getElementById('participantList');
const entriesCountSpan = document.getElementById('entriesCount');
const tickSound = document.getElementById('tickSound');
const winSound = document.getElementById('winSound');

// --- State Variables ---
let participants = []; // سيخزن الأسماء الحقيقية
let participantColors = {};
let currentAngle = 0;
let spinSpeed = 0;
let isSpinning = false;
const friction = 0.991;
const minSpinSpeed = 0.002;
let selectedWinner = null;
let spinTimeout;
let lastTickAngle = 0;
let audioUnlocked = false;

// --- Wheel Configuration ---
let canvasSize = 0;
let WHEEL_CENTER_X = 0;
let WHEEL_CENTER_Y = 0;
let WHEEL_RADIUS = 0;

// --- Color Palette ---
const VIBRANT_COLORS = [
    '#FBC02D', '#0288D1', '#D32F2F', '#388E3C', '#F57C00',
    '#7B1FA2', '#C2185B', '#00796B', '#5D4037', '#455A64',
    '#FF6F00', '#4CAF50', '#2196F3', '#E91E63', '#673AB7',
    '#00BCD4', '#FFEB3B', '#9C27B0', '#8BC34A', '#FF9800'
];
let nextColorIndex = 0;

// --- Functions ---

function assignColorToParticipant(participantName) {
    if (!participantColors[participantName]) {
        participantColors[participantName] = VIBRANT_COLORS[nextColorIndex % VIBRANT_COLORS.length];
        nextColorIndex++;
    }
}

function renderParticipantList() {
    participantListDiv.innerHTML = '';
    if (participants.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = "لا يوجد مشاركين حالياً...";
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = '#aaa';
        participantListDiv.appendChild(emptyMsg);
    } else {
        participants.forEach((name, index) => {
            const p = document.createElement('p');
            p.textContent = "؟"; 
            participantListDiv.appendChild(p);
        });
    }
    entriesCountSpan.textContent = participants.length;
}

function resizeCanvas() {
    const outerRect = document.getElementById('wheelOuterContainer').getBoundingClientRect();
    const computedStyle = getComputedStyle(document.getElementById('wheelOuterContainer'));

    const paddingLeft = parseInt(computedStyle.paddingLeft, 10) || 0;
    const paddingRight = parseInt(computedStyle.paddingRight, 10) || 0;
    const paddingTop = parseInt(computedStyle.paddingTop, 10) || 0;
    const paddingBottom = parseInt(computedStyle.paddingBottom, 10) || 0;

    const availableWidth = outerRect.width - paddingLeft - paddingRight;
    const availableHeight = outerRect.height - paddingTop - paddingBottom;
    const availableSize = Math.max(10, Math.min(availableWidth, availableHeight));

    canvasSize = Math.max(50, Math.min(availableSize));

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize * dpr;
    canvas.height = canvasSize * dpr;

    canvas.style.width = `${canvasSize}px`;
    canvas.style.height = `${canvasSize}px`;

    WHEEL_CENTER_X = canvas.width / 2;
    WHEEL_CENTER_Y = canvas.height / 2;
    WHEEL_RADIUS = (canvas.width / 2) * 0.95;

    drawWheel();
}

function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const numParticipants = participants.length;
    const dpr = window.devicePixelRatio || 1;
    const wheelBorderColor = getComputedStyle(document.documentElement).getPropertyValue('--wheel-border-color').trim() || '#ffffff';
    const wheelTextColor = getComputedStyle(document.documentElement).getPropertyValue('--wheel-text-color').trim() || '#000000';
    const symbolToDisplay = "؟";

    if (numParticipants === 0) {
        ctx.beginPath();
        ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1 * dpr;
        ctx.stroke();
        ctx.font = `bold ${14 * dpr}px Arial`;
        ctx.fillStyle = '#888';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("أضف أسماء للبدء", WHEEL_CENTER_X, WHEEL_CENTER_Y);
        return;
    }

    if (numParticipants === 1) {
        const participantActualName = participants[0]; 
        const color = participantColors[participantActualName] || VIBRANT_COLORS[0];
        ctx.beginPath();
        ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        const fontSize = Math.min(WHEEL_RADIUS / 3.5, 60 * dpr);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = wheelTextColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textAngle = currentAngle + Math.PI;
        ctx.save();
        ctx.translate(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.rotate(textAngle);
        ctx.fillText(symbolToDisplay, 0, 0);
        ctx.restore();
        return;
    }

    const anglePerSegment = (Math.PI * 2) / numParticipants;
    let fontSize;
    const baseFontSize = Math.min(45 * dpr, WHEEL_RADIUS / 7);
    if (numParticipants <= 6) { fontSize = baseFontSize * 1.0; }
    else if (numParticipants <= 12) { fontSize = baseFontSize * 0.9; }
    else if (numParticipants <= 20) { fontSize = baseFontSize * 0.75; }
    else { fontSize = Math.max(12 * dpr, baseFontSize * 0.6); }
    ctx.font = `bold ${fontSize}px Arial`;

    const textRadiusFactor = numParticipants > 10 ? 0.60 : 0.70;
    const textRadius = WHEEL_RADIUS * textRadiusFactor;

    participants.forEach((participantActualName, i) => { 
        const startAngle = currentAngle + i * anglePerSegment;
        const endAngle = startAngle + anglePerSegment;
        const color = participantColors[participantActualName] || VIBRANT_COLORS[i % VIBRANT_COLORS.length];

        ctx.beginPath();
        ctx.moveTo(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.arc(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        ctx.strokeStyle = wheelBorderColor;
        ctx.lineWidth = 1 * dpr;
        ctx.beginPath();
        ctx.moveTo(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.lineTo(WHEEL_CENTER_X + WHEEL_RADIUS * Math.cos(startAngle),
                   WHEEL_CENTER_Y + WHEEL_RADIUS * Math.sin(startAngle));
        ctx.stroke();

        const textAngle = startAngle + anglePerSegment / 2;
        ctx.save();
        ctx.translate(WHEEL_CENTER_X, WHEEL_CENTER_Y);
        ctx.rotate(textAngle);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = wheelTextColor;
        ctx.fillText(symbolToDisplay, textRadius, 0);
        ctx.restore();
    });
}

function playTickIfNeeded(currentNormalizedAngle) {
    if (!audioUnlocked || participants.length <= 1) return;
    const segmentAngle = (Math.PI * 2) / participants.length;
    const currentSegmentIndex = Math.floor(currentNormalizedAngle / segmentAngle);
    const lastSegmentIndex = Math.floor(lastTickAngle / segmentAngle);

    if (currentSegmentIndex !== lastSegmentIndex) {
        try {
            if (tickSound.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                tickSound.currentTime = 0;
                tickSound.play().catch(e => { if (e.name !== 'AbortError') {} });
            }
        } catch (error) { console.error("Error playing tick sound:", error); }
        lastTickAngle = currentNormalizedAngle;
    }
}

function getWinner(finalAngle) {
    if (participants.length === 0) return null;
    if (participants.length === 1) return participants[0];

    const anglePerSegment = (Math.PI * 2) / participants.length;
    const normalizedAngle = (finalAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    const pointerEffectiveAngle = (Math.PI * 2 - normalizedAngle) % (Math.PI * 2);
    const winnerIndex = Math.floor(pointerEffectiveAngle / anglePerSegment);

    if (winnerIndex >= 0 && winnerIndex < participants.length) {
        return participants[winnerIndex]; 
    } else {
        console.error("Winner index calculation error.");
        return participants[0]; 
    }
}

function spinAnimation() {
    if (!isSpinning) return;

    spinSpeed *= friction;
    currentAngle += spinSpeed;

    const normalizedCurrentAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    playTickIfNeeded(normalizedCurrentAngle);

    if (spinSpeed < minSpinSpeed) {
        isSpinning = false;
        spinSpeed = 0;
        currentAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
        selectedWinner = getWinner(currentAngle); 

        if (selectedWinner) {
            winnerNameEl.textContent = selectedWinner; 
            winnerDisplay.classList.remove('hidden');
            try {
                if (audioUnlocked && winSound.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                    winSound.currentTime = 0;
                    winSound.play().catch(e => { console.warn("Win sound play error:", e); });
                }
            } catch (error) { console.error("Error playing win sound:", error); }

            setTimeout(() => {
                if (!isSpinning && selectedWinner) {
                    const winnerIndex = participants.indexOf(selectedWinner);
                    if (winnerIndex > -1) {
                        participants.splice(winnerIndex, 1);
                        renderParticipantList(); 
                        updateParticipantInfo();
                        drawWheel(); 
                    }
                }
                if (!isSpinning) enableControls();
                selectedWinner = null; 
            }, 2500);

        } else if (participants.length > 0) {
            console.error("Spin finished but couldn't determine winner.");
            winnerNameEl.textContent = "خطأ!";
            winnerDisplay.classList.remove('hidden');
            enableControls();
        } else {
            enableControls();
        }
        clearTimeout(spinTimeout);
    } else {
        requestAnimationFrame(spinAnimation);
    }
    drawWheel();
}

function enableControls() {
    spinButton.disabled = participants.length <= 1;
    addButton.disabled = false;
    clearButton.disabled = participants.length === 0;
    participantInput.disabled = false;
    if (window.innerWidth > 768) {
        participantInput.focus();
    }
}

function disableControls() {
    spinButton.disabled = true;
    addButton.disabled = true;
    clearButton.disabled = true;
    participantInput.disabled = true;
}

function updateParticipantInfo() {
    const count = participants.length;
    let infoText = "";
    const canSpin = count > 1;

    if (count === 0) { infoText = "أضف مشاركين لتبدأ"; }
    else if (count === 1) { infoText = `مشارك واحد مضاف. أضف المزيد للدوران.`; } 
    else { infoText = `${count} مشاركين جاهزين`; }

    participantInfoEl.textContent = infoText;
    spinButton.disabled = !canSpin || isSpinning;
    clearButton.disabled = count === 0 || isSpinning;
    addButton.disabled = isSpinning;
    participantInput.disabled = isSpinning;
    entriesCountSpan.textContent = count;
}

function handleAddParticipant() {
    if (isSpinning) return;
    const name = participantInput.value.trim(); 
    if (name) {
        if (participants.some(p => p.toLowerCase() === name.toLowerCase())) {
            alert("هذا الإدخال موجود بالفعل!"); 
            participantInput.select();
            return;
        }
        if (participants.length >= 100) {
            alert("لقد وصلت إلى الحد الأقصى لعدد المشاركين (100).");
            return;
        }
        participants.push(name); 
        assignColorToParticipant(name); 
        participantInput.value = '';
        renderParticipantList(); 
        updateParticipantInfo();
        drawWheel(); 
        winnerDisplay.classList.add('hidden');
        enableControls();
    }
    if (window.innerWidth > 768) {
        participantInput.focus();
    }
}

function handleClearAll() {
    if (isSpinning) return;
    if (participants.length > 0 && confirm("هل أنت متأكد أنك تريد مسح جميع المشاركين؟")) {
        participants = [];
        participantColors = {};
        nextColorIndex = 0;
        selectedWinner = null;
        winnerDisplay.classList.add('hidden');
        isSpinning = false;
        spinSpeed = 0;
        currentAngle = 0;
        clearTimeout(spinTimeout);
        renderParticipantList();
        updateParticipantInfo();
        drawWheel();
        enableControls();
    }
}

function handleStartSpin() {
    if (isSpinning || participants.length <= 1) return;
    isSpinning = true;
    disableControls();
    winnerDisplay.classList.add('hidden');
    selectedWinner = null;
    lastTickAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
    const baseSpeed = 0.35 + Math.random() * 0.3;
    const randomBoost = Math.random() * 0.15;
    spinSpeed = baseSpeed + randomBoost;
    clearTimeout(spinTimeout);
    spinTimeout = setTimeout(() => {
        if (isSpinning) {
            console.warn("Spin animation safety timeout triggered.");
            isSpinning = false;
            spinSpeed = 0;
            currentAngle = (currentAngle % (Math.PI * 2) + (Math.PI * 2)) % (Math.PI * 2);
            selectedWinner = getWinner(currentAngle); 
            if (selectedWinner) { winnerNameEl.textContent = selectedWinner + " (مهلة)"; }
            else { winnerNameEl.textContent = "خطأ (مهلة)"; }
            winnerDisplay.classList.remove('hidden');
            enableControls();
            drawWheel();
        }
    }, 25000);
    requestAnimationFrame(spinAnimation);
}

function unlockAudio() {
    if (audioUnlocked) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
        console.warn("Web Audio API not supported.");
        audioUnlocked = true; return;
    }
    const context = new AudioContext();
    if (context.state === 'suspended') {
        context.resume().then(() => { playSilentSound(context); })
                     .catch(e => { console.error("Failed resume AC:", e); });
    } else { playSilentSound(context); }

    function playSilentSound(ctx) {
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer; source.connect(ctx.destination);
        source.start(0);
        source.onended = () => {
            source.disconnect();
            try { tickSound.load(); winSound.load(); } catch (e) {}
            console.log("Audio context unlocked.");
            audioUnlocked = true;
            document.body.removeEventListener('click', unlockAudio, { capture: true });
            document.body.removeEventListener('touchstart', unlockAudio, { capture: true });
            document.body.removeEventListener('keydown', unlockAudio, { capture: true });
        }
    }
}

function init() {
    addButton.addEventListener('click', handleAddParticipant);
    clearButton.addEventListener('click', handleClearAll);
    spinButton.addEventListener('click', handleStartSpin);
    participantInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); handleAddParticipant(); }
    });
    window.addEventListener('resize', resizeCanvas);
    renderParticipantList();
    updateParticipantInfo();
    resizeCanvas();
    document.body.addEventListener('click', unlockAudio, { once: true, capture: true });
    document.body.addEventListener('touchstart', unlockAudio, { once: true, capture: true });
    document.body.addEventListener('keydown', unlockAudio, { once: true, capture: true });
    console.log("Spinning Wheel Initialized (Secret Mode).");
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else { init(); }