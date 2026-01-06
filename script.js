const STORAGE_KEY = 'marcador_truco_fodinha_final_v6';

let gameState = {
    mode: 'truco',
    ativo: false,
    truco: {
        n1: "",
        n2: "",
        max: 12,
        s1: 0,
        s2: 0
    },
    fodinha: {
        maxVidas: 5,
        players: [
            { name: "", score: 0 },
            { name: "", score: 0 }
        ]
    }
};

let blockClick = false;

/* ================= INIT ================= */
window.onload = () => {
    try { carregarEstado(); }
    catch { localStorage.removeItem(STORAGE_KEY); }

    renderSetupFodinha();

    window.confetti = { start: startConfetti, stop: stopConfetti };
};

/* ================= MODOS ================= */
function mudarModo(modo, btn) {
    gameState.mode = modo;

    document.querySelectorAll('.mode-selector .segment-opt')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = document.getElementById('mode-glider');
    const index = [...btn.parentNode.querySelectorAll('button')].indexOf(btn);
    glider.style.transform = `translateX(${index * 100}%)`;

    document.getElementById('setup-truco').classList.toggle('hidden', modo !== 'truco');
    document.getElementById('setup-fodinha').classList.toggle('hidden', modo !== 'fodinha');
}

/* ================= SETUP TRUCO ================= */
function selPonto(valor, btn) {
    gameState.truco.max = valor;
    document.getElementById('input-max').value = valor;

    const c = btn.parentNode;
    c.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const index = [...c.querySelectorAll('button')].indexOf(btn);
    c.querySelector('.segment-glider').style.transform = `translateX(${index * 100}%)`;
}

/* ================= SETUP FODINHA ================= */
function addFodinhaPlayer() {
    gameState.fodinha.players.push({ name: "", score: 0 });
    renderSetupFodinha();
}

function removeFodinhaPlayer(i) {
    if (gameState.fodinha.players.length <= 2) return;
    gameState.fodinha.players.splice(i, 1);
    renderSetupFodinha();
}

function updatePlayerName(i, v) {
    gameState.fodinha.players[i].name = v;
}

function renderSetupFodinha() {
    const c = document.getElementById('players-container');
    c.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const d = document.createElement('div');
        d.className = 'player-input-card';
        d.innerHTML = `
            <div style="font-size:0.8rem;margin-right:10px">${i+1}</div>
            <input value="${p.name}" placeholder="Nome do Jogador"
                   oninput="updatePlayerName(${i},this.value)">
            ${gameState.fodinha.players.length > 2
                ? `<button class="btn-remove-mini" onclick="removeFodinhaPlayer(${i})">×</button>`
                : ''}
        `;
        c.appendChild(d);
    });
}

/* ================= INICIAR JOGO ================= */
function iniciarJogo() {
    gameState.ativo = true;

    if (gameState.mode === 'truco') {
        gameState.truco.n1 = input('input-time1');
        gameState.truco.n2 = input('input-time2');

        atualizarTelaTruco();
        mostrarTela('game-screen-truco');
        setupTouchHandlers();
    } else {
        gameState.fodinha.maxVidas = parseInt(input('input-vidas-max')) || 5;
        renderGameFodinha();
        mostrarTela('game-screen-fodinha');
    }

    salvarTudo();
}

/* ================= TRUCO ================= */
function setupTouchHandlers() {
    setupCardTouch('card-time1', 1);
    setupCardTouch('card-time2', 2);
}

function setupCardTouch(id, time) {
    const card = document.getElementById(id);
    if (!card) return;

    let startY = 0;

    card.ontouchstart = e => {
        startY = e.touches[0].clientY;
        blockClick = false;
    };

    card.ontouchend = e => {
        const diff = e.changedTouches[0].clientY - startY;
        if (Math.abs(diff) > 50) {
            blockClick = true;
            mudarPontos(time, diff < 0 ? 1 : -1);
        }
    };
}

function pontuarTap(time) {
    if (blockClick) {
        blockClick = false;
        return;
    }
    mudarPontos(time, 1);
}

function mudarPontos(time, qtd) {
    if (!gameState.ativo) return;

    const t = gameState.truco;

    if (time === 1) t.s1 += qtd;
    else t.s2 += qtd;

    // limita corretamente
    t.s1 = Math.max(0, Math.min(t.max, t.s1));
    t.s2 = Math.max(0, Math.min(t.max, t.s2));

    atualizarTelaTruco();
    salvarTudo();

    // vitória APÓS atualizar a tela
    if (t.s1 === t.max || t.s2 === t.max) {
        finalizarPartida();
    }
}

function finalizarPartida() {
    gameState.ativo = false;
    startConfetti();
}

function atualizarTelaTruco() {
    document.getElementById('score-time1').innerText = gameState.truco.s1;
    document.getElementById('score-time2').innerText = gameState.truco.s2;
    document.getElementById('nome-time1').innerText = gameState.truco.n1 || "NÓS";
    document.getElementById('nome-time2').innerText = gameState.truco.n2 || "ELES";
    document.getElementById('display-meta').innerText = gameState.truco.max;

    document.getElementById('card-time1')
        .classList.toggle('winning', gameState.truco.s1 === gameState.truco.max);
    document.getElementById('card-time2')
        .classList.toggle('winning', gameState.truco.s2 === gameState.truco.max);
}

/* ================= FODINHA ================= */
function renderGameFodinha() {
    const g = document.getElementById('fodinha-game-grid');
    g.innerHTML = '';

    document.getElementById('display-fodinha-max').innerText =
        gameState.fodinha.maxVidas;

    gameState.fodinha.players.forEach((p, i) => {
        const d = document.createElement('div');
        d.className = `fodinha-card ${p.score >= gameState.fodinha.maxVidas ? 'eliminated' : ''}`;
        d.innerHTML = `
            <div class="fodinha-name">${p.name || `P${i+1}`}</div>
            <div class="fodinha-score">${p.score}</div>
            <div class="fodinha-controls">
                <button class="btn-fodinha-ctrl" onclick="mudarVidaFodinha(${i},-1)">−</button>
                <button class="btn-fodinha-ctrl btn-fodinha-plus" onclick="mudarVidaFodinha(${i},1)">+</button>
            </div>
        `;
        g.appendChild(d);
    });
}

function mudarVidaFodinha(i, d) {
    const p = gameState.fodinha.players[i];
    if (d > 0 && p.score >= gameState.fodinha.maxVidas) return;

    p.score = Math.max(0, p.score + d);
    salvarTudo();
    renderGameFodinha();
}

/* ================= MODAIS ================= */
function confirmarSaida() {
    abrirModal(
        "Sair da Partida",
        "O jogo atual será encerrado.",
        "Sair",
        () => resetarParaMenu()
    );
}

function confirmarZerar() {
    abrirModal(
        "Zerar Pontuação",
        "Todos os pontos voltarão para zero.",
        "Zerar",
        () => {
            if (gameState.mode === 'truco') {
                gameState.truco.s1 = 0;
                gameState.truco.s2 = 0;
                atualizarTelaTruco();
            } else {
                gameState.fodinha.players.forEach(p => p.score = 0);
                renderGameFodinha();
            }
            gameState.ativo = true;
            stopConfetti();
            salvarTudo();
        }
    );
}

/* ================= RESET ================= */
function resetarParaMenu() {
    gameState.ativo = false;
    stopConfetti();
    localStorage.removeItem(STORAGE_KEY);

    mostrarTela('setup-screen');

    gameState.truco.s1 = 0;
    gameState.truco.s2 = 0;
    gameState.truco.n1 = "";
    gameState.truco.n2 = "";

    renderSetupFodinha();
}

/* ================= UTIL ================= */
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function input(id) {
    return document.getElementById(id)?.value.trim() || "";
}

/* ================= STORAGE ================= */
function salvarTudo() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function carregarEstado() {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!s) return;

    gameState = { ...gameState, ...s };

    document.getElementById('input-time1').value = gameState.truco.n1 || "";
    document.getElementById('input-time2').value = gameState.truco.n2 || "";

    if (gameState.ativo) {
        if (gameState.mode === 'truco') {
            mostrarTela('game-screen-truco');
            atualizarTelaTruco();
            setupTouchHandlers();
        } else {
            mostrarTela('game-screen-fodinha');
            renderGameFodinha();
        }
    }
}

/* ================= CONFETTI ================= */
let confettiCtx, confettiActive = false, particles = [], anim;

function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas || confettiActive) return;

    canvas.style.display = 'block';
    canvas.width = innerWidth;
    canvas.height = innerHeight;

    confettiCtx = canvas.getContext('2d');
    confettiActive = true;
    particles = [];

    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            size: Math.random() * 8 + 4,
            speed: Math.random() * 6 + 3
        });
    }

    animateConfetti();
}

function animateConfetti() {
    if (!confettiActive) return;

    confettiCtx.clearRect(0, 0, innerWidth, innerHeight);
    particles.forEach(p => {
        p.y += p.speed;
        if (p.y > innerHeight) p.y = -20;
        confettiCtx.fillStyle = '#fff';
        confettiCtx.fillRect(p.x, p.y, p.size, p.size);
    });

    anim = requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    confettiActive = false;
    if (anim) cancelAnimationFrame(anim);
    if (confettiCtx) confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
    if (canvas) canvas.style.display = 'none';
}