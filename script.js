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

/* ===================== INIT ===================== */
window.onload = () => {
    try {
        carregarEstado();
    } catch {
        localStorage.removeItem(STORAGE_KEY);
    }

    renderSetupFodinha();

    window.confetti = {
        start: startConfetti,
        stop: stopConfetti
    };
};

/* ===================== MODOS ===================== */
function mudarModo(modo, btn) {
    gameState.mode = modo;

    document.querySelectorAll('.mode-selector .segment-opt')
        .forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = document.getElementById('mode-glider');
    const buttons = Array.from(btn.parentNode.querySelectorAll('button'));
    const index = buttons.indexOf(btn);
    glider.style.transform = `translateX(${index * 100}%)`;

    document.getElementById('setup-truco').classList.toggle('hidden', modo !== 'truco');
    document.getElementById('setup-fodinha').classList.toggle('hidden', modo !== 'fodinha');
}

/* ===================== SETUP TRUCO ===================== */
function selPonto(valor, btn) {
    gameState.truco.max = valor;
    document.getElementById('input-max').value = valor;

    const container = btn.parentNode;
    container.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const buttons = Array.from(container.querySelectorAll('button'));
    const index = buttons.indexOf(btn);
    container.querySelector('.segment-glider').style.transform = `translateX(${index * 100}%)`;
}

/* ===================== SETUP FODINHA ===================== */
function addFodinhaPlayer() {
    gameState.fodinha.players.push({ name: "", score: 0 });
    renderSetupFodinha();

    setTimeout(() => {
        const c = document.querySelector('.dark-scroll-container');
        if (c) c.scrollTop = c.scrollHeight;
    }, 50);
}

function removeFodinhaPlayer(index) {
    if (gameState.fodinha.players.length <= 2) return;
    gameState.fodinha.players.splice(index, 1);
    renderSetupFodinha();
}

function updatePlayerName(index, value) {
    gameState.fodinha.players[index].name = value;
}

function renderSetupFodinha() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-input-card';
        div.innerHTML = `
            <div style="font-size:0.8rem; margin-right:10px;">${i + 1}</div>
            <input type="text"
                value="${p.name}"
                placeholder="Nome do Jogador"
                oninput="updatePlayerName(${i}, this.value)">
            ${gameState.fodinha.players.length > 2
                ? `<button class="btn-remove-mini" onclick="removeFodinhaPlayer(${i})">×</button>`
                : ''
            }
        `;
        container.appendChild(div);
    });
}

/* ===================== INICIAR JOGO ===================== */
function iniciarJogo() {
    gameState.ativo = true;

    if (gameState.mode === 'truco') {
        gameState.truco.n1 = document.getElementById('input-time1').value.trim();
        gameState.truco.n2 = document.getElementById('input-time2').value.trim();

        atualizarTelaTruco();
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen-truco').classList.remove('hidden');

        setupTouchHandlers();
    } else {
        const max = parseInt(document.getElementById('input-vidas-max').value);
        gameState.fodinha.maxVidas = max || 5;

        renderGameFodinha();
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen-fodinha').classList.remove('hidden');
    }

    salvarTudo();
}

/* ===================== TRUCO ===================== */
function setupTouchHandlers() {
    setupCardTouch('card-time1', 1);
    setupCardTouch('card-time2', 2);
}

function setupCardTouch(id, time) {
    const card = document.getElementById(id);
    if (!card) return;

    let startY = 0;

    card.addEventListener('touchstart', e => {
        startY = e.touches[0].clientY;
        blockClick = false;
    }, { passive: true });

    card.addEventListener('touchend', e => {
        const diffY = e.changedTouches[0].clientY - startY;
        if (Math.abs(diffY) > 50) {
            blockClick = true;
            mudarPontos(time, diffY < 0 ? 1 : -1);
        }
    });
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

    t.s1 = Math.max(0, Math.min(t.max, t.s1));
    t.s2 = Math.max(0, Math.min(t.max, t.s2));

    if (t.s1 === t.max || t.s2 === t.max) mostrarVitoria();

    salvarTudo();
    atualizarTelaTruco();
}

function atualizarTelaTruco() {
    document.getElementById('score-time1').innerText = gameState.truco.s1;
    document.getElementById('score-time2').innerText = gameState.truco.s2;
    document.getElementById('nome-time1').innerText = gameState.truco.n1 || "NÓS";
    document.getElementById('nome-time2').innerText = gameState.truco.n2 || "ELES";
    document.getElementById('display-meta').innerText = gameState.truco.max;

    document.getElementById('card-time1').classList.toggle(
        'winning',
        gameState.truco.s1 === gameState.truco.max
    );
    document.getElementById('card-time2').classList.toggle(
        'winning',
        gameState.truco.s2 === gameState.truco.max
    );
}

/* ===================== FODINHA ===================== */
function renderGameFodinha() {
    const grid = document.getElementById('fodinha-game-grid');
    grid.innerHTML = '';

    document.getElementById('display-fodinha-max').innerText =
        gameState.fodinha.maxVidas;

    gameState.fodinha.players.forEach((p, i) => {
        const eliminado = p.score >= gameState.fodinha.maxVidas;
        const div = document.createElement('div');
        div.className = `fodinha-card ${eliminado ? 'eliminated' : ''}`;

        div.innerHTML = `
            <div class="fodinha-name">${p.name || `P${i + 1}`}</div>
            <div class="fodinha-score">${p.score}</div>
            <div class="fodinha-controls">
                <button class="btn-fodinha-ctrl" onclick="mudarVidaFodinha(${i}, -1)">−</button>
                <button class="btn-fodinha-ctrl btn-fodinha-plus" onclick="mudarVidaFodinha(${i}, 1)">+</button>
            </div>
        `;
        grid.appendChild(div);
    });
}

function mudarVidaFodinha(index, delta) {
    const p = gameState.fodinha.players[index];
    if (delta > 0 && p.score >= gameState.fodinha.maxVidas) return;

    p.score += delta;
    if (p.score < 0) p.score = 0;

    salvarTudo();
    renderGameFodinha();
}

/* ===================== MODAIS iOS ===================== */
function confirmarSaida() {
    abrirModal(
        "Sair da Partida",
        "O jogo atual será encerrado e a pontuação perdida.",
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

/* ===================== RESET ===================== */
function resetarParaMenu() {
    gameState.ativo = false;
    stopConfetti();
    localStorage.removeItem(STORAGE_KEY);

    document.getElementById('game-screen-truco').classList.add('hidden');
    document.getElementById('game-screen-fodinha').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');

    gameState.truco.s1 = 0;
    gameState.truco.s2 = 0;
    gameState.truco.n1 = "";
    gameState.truco.n2 = "";

    renderSetupFodinha();
}

/* ===================== MODAL CORE ===================== */
function abrirModal(titulo, mensagem, textoConfirmar, acaoConfirmar) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-msg').innerText = mensagem;

    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');

    const novoConfirm = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(novoConfirm, btnConfirm);

    novoConfirm.innerText = textoConfirmar || "OK";
    novoConfirm.onclick = () => {
        if (acaoConfirmar) acaoConfirmar();
        modal.classList.add('hidden');
    };

    btnCancel.onclick = () => modal.classList.add('hidden');
    modal.classList.remove('hidden');
}

/* ===================== STORAGE ===================== */
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
        document.getElementById('setup-screen').classList.add('hidden');
        if (gameState.mode === 'truco') {
            document.getElementById('game-screen-truco').classList.remove('hidden');
            atualizarTelaTruco();
            setupTouchHandlers();
        } else {
            document.getElementById('game-screen-fodinha').classList.remove('hidden');
            renderGameFodinha();
        }
    }
}

/* ===================== CONFETTI ===================== */
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