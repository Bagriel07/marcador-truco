const STORAGE_KEY = 'marcador_truco_fodinha_final_ok';

/* ================= ESTADO GLOBAL ================= */
let gameState = {
    mode: 'truco',
    ativo: false,
    truco: {
        n1: '',
        n2: '',
        max: 12,
        s1: 0,
        s2: 0
    },
    fodinha: {
        maxVidas: 5,
        players: [
            { name: '', score: 0 },
            { name: '', score: 0 }
        ]
    }
};

let bloqueioTap = false;

/* ================= INIT ================= */
window.onload = () => {
    carregarEstado();
    renderSetupFodinha();
};

/* ================= MODO ================= */
function mudarModo(modo, btn) {
    gameState.mode = modo;

    document.querySelectorAll('.mode-selector .segment-opt')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = document.getElementById('mode-glider');
    const buttons = [...btn.parentNode.querySelectorAll('button')];
    glider.style.transform = `translateX(${buttons.indexOf(btn) * 100}%)`;

    document.getElementById('setup-truco').classList.toggle('hidden', modo !== 'truco');
    document.getElementById('setup-fodinha').classList.toggle('hidden', modo !== 'fodinha');
}

/* ================= SETUP TRUCO ================= */
function selPonto(valor, btn) {
    gameState.truco.max = valor;

    const c = btn.parentNode;
    c.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const index = [...c.querySelectorAll('button')].indexOf(btn);
    c.querySelector('.segment-glider').style.transform = `translateX(${index * 100}%)`;
}

/* ================= SETUP FODINHA ================= */
function renderSetupFodinha() {
    const c = document.getElementById('players-container');
    c.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const d = document.createElement('div');
        d.className = 'player-input-card';
        d.innerHTML = `
            <div style="margin-right:10px">${i + 1}</div>
            <input value="${p.name}" placeholder="Nome do Jogador"
                   oninput="gameState.fodinha.players[${i}].name=this.value">
            ${gameState.fodinha.players.length > 2
                ? `<button class="btn-remove-mini" onclick="removerJogador(${i})">×</button>`
                : ''}
        `;
        c.appendChild(d);
    });
}

function addFodinhaPlayer() {
    gameState.fodinha.players.push({ name: '', score: 0 });
    renderSetupFodinha();
}

function removerJogador(i) {
    if (gameState.fodinha.players.length <= 2) return;
    gameState.fodinha.players.splice(i, 1);
    renderSetupFodinha();
}

/* ================= INICIAR ================= */
function iniciarJogo() {
    gameState.ativo = true;

    if (gameState.mode === 'truco') {
        gameState.truco.n1 = input('input-time1');
        gameState.truco.n2 = input('input-time2');
        atualizarTelaTruco();
        mostrarTela('game-screen-truco');
        setupGestos();
    } else {
        gameState.fodinha.maxVidas = parseInt(input('input-vidas-max')) || 5;
        renderGameFodinha();
        mostrarTela('game-screen-fodinha');
    }

    salvarEstado();
}

/* ================= TRUCO ================= */
function setupGestos() {
    criarGesto('card-time1', 1);
    criarGesto('card-time2', 2);
}

function criarGesto(id, time) {
    const el = document.getElementById(id);
    let y0 = 0;

    el.ontouchstart = e => {
        y0 = e.touches[0].clientY;
        bloqueioTap = false;
    };

    el.ontouchend = e => {
        const dy = e.changedTouches[0].clientY - y0;
        if (Math.abs(dy) > 50) {
            bloqueioTap = true;
            alterarPonto(time, dy < 0 ? 1 : -1);
        }
    };
}

function pontuarTap(time) {
    if (bloqueioTap) {
        bloqueioTap = false;
        return;
    }
    alterarPonto(time, 1);
}

function alterarPonto(time, delta) {
    if (!gameState.ativo) return;

    const t = gameState.truco;
    if (time === 1) t.s1 += delta;
    else t.s2 += delta;

    t.s1 = Math.max(0, Math.min(t.max, t.s1));
    t.s2 = Math.max(0, Math.min(t.max, t.s2));

    atualizarTelaTruco();
    salvarEstado();

    if (t.s1 === t.max || t.s2 === t.max) {
        gameState.ativo = false;
        startConfetti();
    }
}

function atualizarTelaTruco() {
    document.getElementById('score-time1').innerText = gameState.truco.s1;
    document.getElementById('score-time2').innerText = gameState.truco.s2;
    document.getElementById('nome-time1').innerText = gameState.truco.n1 || 'NÓS';
    document.getElementById('nome-time2').innerText = gameState.truco.n2 || 'ELES';
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
            <div class="fodinha-name">${p.name || `P${i + 1}`}</div>
            <div class="fodinha-score">${p.score}</div>
            <div class="fodinha-controls">
                <button onclick="alterarVida(${i},-1)">−</button>
                <button onclick="alterarVida(${i},1)">+</button>
            </div>
        `;
        g.appendChild(d);
    });
}

function alterarVida(i, d) {
    const p = gameState.fodinha.players[i];
    if (d > 0 && p.score >= gameState.fodinha.maxVidas) return;
    p.score = Math.max(0, p.score + d);
    salvarEstado();
    renderGameFodinha();
}

/* ================= MODAIS ================= */
function confirmarSaida() {
    abrirModal(
        'Sair da partida',
        'O jogo atual será encerrado.',
        'Sair',
        resetar
    );
}

function confirmarZerar() {
    abrirModal(
        'Zerar pontuação',
        'Os pontos voltarão para zero.',
        'Zerar',
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
            salvarEstado();
        }
    );
}

/* ================= RESET ================= */
function resetar() {
    gameState.ativo = false;
    stopConfetti();
    localStorage.removeItem(STORAGE_KEY);

    gameState.truco.s1 = 0;
    gameState.truco.s2 = 0;
    gameState.truco.n1 = '';
    gameState.truco.n2 = '';

    mostrarTela('setup-screen');
    renderSetupFodinha();
}

/* ================= UTIL ================= */
function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function input(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function salvarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
}

function carregarEstado() {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!s) return;
    gameState = s;
}

/* ================= CONFETTI ================= */
let confettiCtx, anim, ativo = false;

function startConfetti() {
    const c = document.getElementById('confetti-canvas');
    if (!c || ativo) return;

    ativo = true;
    c.style.display = 'block';
    c.width = innerWidth;
    c.height = innerHeight;
    confettiCtx = c.getContext('2d');

    const parts = Array.from({ length: 120 }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * -c.height,
        s: Math.random() * 6 + 4,
        v: Math.random() * 6 + 3
    }));

    function loop() {
        if (!ativo) return;
        confettiCtx.clearRect(0, 0, c.width, c.height);
        parts.forEach(p => {
            p.y += p.v;
            if (p.y > c.height) p.y = -20;
            confettiCtx.fillStyle = '#fff';
            confettiCtx.fillRect(p.x, p.y, p.s, p.s);
        });
        anim = requestAnimationFrame(loop);
    }
    loop();
}

function stopConfetti() {
    ativo = false;
    cancelAnimationFrame(anim);
    const c = document.getElementById('confetti-canvas');
    if (c) {
        confettiCtx.clearRect(0, 0, c.width, c.height);
        c.style.display = 'none';
    }
}