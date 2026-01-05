const STORAGE_KEY = 'marcador_truco_fodinha_final_v7';

let gameState = {
    mode: 'truco',
    ativo: false,
    truco: { n1: "", n2: "", max: 12, s1: 0, s2: 0 },
    fodinha: {
        maxVidas: 5,
        players: [
            { name: "", score: 0 },
            { name: "", score: 0 }
        ]
    }
};

let blockClick = false;
let touchActive = false;

window.onload = () => {
    try {
        carregarEstado();
        renderSetupFodinha();
        sincronizarSeletorPontos();
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }

    window.confetti = { start: startConfetti, stop: stopConfetti };
};

// ---------------- MODOS ----------------
function mudarModo(modo, btn) {
    gameState.mode = modo;
    document.querySelectorAll('.mode-selector .segment-opt')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = document.getElementById('mode-glider');
    const index = [...btn.parentNode.children].indexOf(btn) - 1;
    glider.style.transform = `translateX(${index * 100}%)`;

    document.getElementById('setup-truco').classList.toggle('hidden', modo !== 'truco');
    document.getElementById('setup-fodinha').classList.toggle('hidden', modo !== 'fodinha');
}

// ---------------- SETUP TRUCO ----------------
function selPonto(valor, btn) {
    gameState.truco.max = valor;
    document.getElementById('input-max').value = valor;

    const container = btn.parentNode;
    container.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const index = [...container.querySelectorAll('button')].indexOf(btn);
    container.querySelector('.segment-glider').style.transform = `translateX(${index * 100}%)`;

    salvarTudo();
}

function sincronizarSeletorPontos() {
    const valor = gameState.truco.max;
    document.querySelectorAll('#setup-truco .segment-opt').forEach(btn => {
        if (parseInt(btn.innerText) === valor) {
            selPonto(valor, btn);
        }
    });
}

// ---------------- SETUP FODINHA ----------------
function addFodinhaPlayer() {
    gameState.fodinha.players.push({ name: "", score: 0 });
    renderSetupFodinha();
}

function removeFodinhaPlayer(i) {
    if (gameState.fodinha.players.length <= 2) return;
    gameState.fodinha.players.splice(i, 1);
    renderSetupFodinha();
}

function updatePlayerName(i, val) {
    gameState.fodinha.players[i].name = val;
}

// ---------------- INICIAR JOGO ----------------
function iniciarJogo() {
    gameState.ativo = true;

    if (gameState.mode === 'truco') {
        gameState.truco.n1 = input('input-time1');
        gameState.truco.n2 = input('input-time2');
        atualizarTelaTruco();
        setupTouchHandlers();
        mostrarTela('game-screen-truco');
    } else {
        gameState.fodinha.maxVidas = parseInt(input('input-vidas-max')) || 5;
        renderGameFodinha();
        mostrarTela('game-screen-fodinha');
    }

    salvarTudo();
}

// ---------------- TRUCO ----------------
function setupTouchHandlers() {
    ['card-time1', 'card-time2'].forEach((id, i) => {
        const card = document.getElementById(id);
        if (card.dataset.bound) return;

        card.dataset.bound = true;

        let startY = 0;
        card.addEventListener('touchstart', e => {
            touchActive = true;
            startY = e.touches[0].clientY;
        }, { passive: true });

        card.addEventListener('touchend', e => {
            const dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dy) > 50) {
                blockClick = true;
                mudarPontos(i + 1, dy < 0 ? 1 : -1);
            }
            setTimeout(() => touchActive = false, 50);
        });
    });
}

function pontuarTap(time) {
    if (touchActive || blockClick) {
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

    t.s1 = Math.min(Math.max(0, t.s1), t.max);
    t.s2 = Math.min(Math.max(0, t.s2), t.max);

    if (t.s1 === t.max || t.s2 === t.max) mostrarVitoria();
    salvarTudo();
    atualizarTelaTruco();
}

// 🌸 Ajustado
function flor(time) {
    const t = gameState.truco;
    const atual = time === 1 ? t.s1 : t.s2;
    mudarPontos(time, Math.min(3, t.max - atual));
}

// ---------------- FODINHA ----------------
function renderGameFodinha() {
    const grid = document.getElementById('fodinha-game-grid');
    grid.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = `fodinha-card ${p.score >= gameState.fodinha.maxVidas ? 'eliminated' : ''}`;
        div.innerHTML = `
            <div class="fodinha-name">${p.name || `P${i+1}`}</div>
            <div class="fodinha-score">${p.score}</div>
            <div class="fodinha-controls">
                <button onclick="mudarVidaFodinha(${i}, -1)">−</button>
                <button onclick="mudarVidaFodinha(${i}, 1)">+</button>
            </div>`;
        grid.appendChild(div);
    });
}

function mudarVidaFodinha(i, d) {
    const p = gameState.fodinha.players[i];
    if (d > 0 && p.score >= gameState.fodinha.maxVidas) return;

    p.score = Math.max(0, p.score + d);
    salvarTudo();
    renderGameFodinha();
}

// ---------------- UTIL ----------------
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function input(id) {
    return document.getElementById(id)?.value.trim() || "";
}

function salvarTudo() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function carregarEstado() {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (s) gameState = { ...gameState, ...s };
}

function mostrarVitoria() {
    gameState.ativo = false;
    startConfetti();
}