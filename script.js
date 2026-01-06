const STORAGE_KEY = 'marcador_truco_final_v5_fixed';

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

// Variáveis de controle de gestos
let touchStartY = 0;
let isSwiping = false;
let lastInteraction = 0; // Trava de segurança para evitar clique duplo

/* ================= INIT ================= */
window.addEventListener('DOMContentLoaded', () => {
    carregarEstado();
    
    // Configura modal
    const btnCancel = document.getElementById('modal-btn-cancel');
    if(btnCancel) btnCancel.onclick = fecharModal;
    
    if (gameState.ativo) {
        if (gameState.mode === 'truco') {
            mostrarTela('game-screen-truco');
            atualizarTelaTruco();
            setupGestos();
        } else {
            mostrarTela('game-screen-fodinha');
            renderGameFodinha();
        }
    } else {
        mostrarTela('setup-screen');
        renderSetupFodinha();
        
        // Sincroniza visualmente as abas
        const btnMode = document.querySelector(`.mode-selector button[onclick*="'${gameState.mode}'"]`);
        if(btnMode) mudarModo(gameState.mode, btnMode);

        // Sincroniza visualmente os pontos do truco
        if(gameState.mode === 'truco') {
             const botoesPonto = document.querySelectorAll('#setup-truco .segment-opt');
             botoesPonto.forEach(btn => {
                 if(parseInt(btn.innerText) === gameState.truco.max) {
                     selPonto(gameState.truco.max, btn);
                 }
             });
        }
    }
});

/* ================= NAVEGAÇÃO ================= */
function mudarModo(modo, btn) {
    gameState.mode = modo;
    salvarEstado();

    document.querySelectorAll('.mode-selector .segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = document.getElementById('mode-glider');
    const buttons = [...btn.parentNode.querySelectorAll('button')];
    if(glider && buttons.length > 0) {
        glider.style.transform = `translateX(${buttons.indexOf(btn) * 100}%)`;
    }

    const setupTruco = document.getElementById('setup-truco');
    const setupFodinha = document.getElementById('setup-fodinha');
    
    if(setupTruco) setupTruco.classList.toggle('hidden', modo !== 'truco');
    if(setupFodinha) setupFodinha.classList.toggle('hidden', modo !== 'fodinha');
}

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const tela = document.getElementById(id);
    if(tela) tela.classList.remove('hidden');
}

/* ================= SETUP ================= */
function selPonto(valor, btn) {
    gameState.truco.max = valor;
    
    const container = btn.parentNode;
    container.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const index = [...container.querySelectorAll('button')].indexOf(btn);
    const glider = container.querySelector('.segment-glider');
    if(glider) glider.style.transform = `translateX(${index * 100}%)`;
}

function renderSetupFodinha() {
    const container = document.getElementById('players-container');
    if(!container) return;
    
    container.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-input-card';
        div.innerHTML = `
            <div style="margin-right:10px; font-weight:bold; color:#666;">${i + 1}</div>
            <input type="text" value="${p.name}" placeholder="Nome do Jogador"
                   oninput="atualizarNomeFodinha(${i}, this.value)">
            ${gameState.fodinha.players.length > 2
                ? `<button class="btn-remove-mini" onclick="removerJogador(${i})">×</button>`
                : ''}
        `;
        container.appendChild(div);
    });
}

function atualizarNomeFodinha(idx, val) {
    gameState.fodinha.players[idx].name = val;
    salvarEstado();
}

function addFodinhaPlayer() {
    gameState.fodinha.players.push({ name: '', score: 0 });
    renderSetupFodinha();
    salvarEstado();
}

function removerJogador(i) {
    if (gameState.fodinha.players.length <= 2) return;
    gameState.fodinha.players.splice(i, 1);
    renderSetupFodinha();
    salvarEstado();
}

/* ================= INICIAR JOGO ================= */
function iniciarJogo() {
    gameState.ativo = true;

    if (gameState.mode === 'truco') {
        gameState.truco.n1 = inputVal('input-time1');
        gameState.truco.n2 = inputVal('input-time2');
        
        const btnAtivo = document.querySelector('#setup-truco .segmented-control .segment-opt.active');
        if (btnAtivo) {
            gameState.truco.max = parseInt(btnAtivo.innerText) || 12;
        } else {
            gameState.truco.max = 12;
        }

        atualizarTelaTruco();
        mostrarTela('game-screen-truco');
        setupGestos();
    } else {
        const vidasInput = parseInt(inputVal('input-vidas-max'));
        gameState.fodinha.maxVidas = vidasInput && vidasInput > 0 ? vidasInput : 5;
        renderGameFodinha();
        mostrarTela('game-screen-fodinha');
    }

    salvarEstado();
}

/* ================= TRUCO (LÓGICA CORRIGIDA) ================= */
function mudarPontos(time, delta) {
    alterarPonto(time, delta);
}

function setupGestos() {
    criarGesto('card-time1', 1);
    criarGesto('card-time2', 2);
}

function criarGesto(id, time) {
    const el = document.getElementById(id);
    if (!el) return;

    el.ontouchstart = null; 
    el.ontouchend = null; 
    el.ontouchmove = null;

    el.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    el.addEventListener('touchmove', e => {
        // Se moveu mais de 10px, consideramos que está tentando arrastar
        if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            isSwiping = true;
        }
    }, { passive: true });

    el.addEventListener('touchend', e => {
        const dy = e.changedTouches[0].clientY - touchStartY;
        
        // Se arrastou mais de 60px (Swipe real)
        if (Math.abs(dy) > 60) {
            isSwiping = true;
            lastInteraction = Date.now(); // Marca o tempo do swipe
            
            // Lógica: Cima (-dy) = +1, Baixo (+dy) = -1
            const pontos = dy < 0 ? 1 : -1;
            alterarPonto(time, pontos);
        } else {
            // Se foi um movimento muito curto, não é swipe, libera pro click
            isSwiping = false;
        }
    });
}

function pontuarTap(time) {
    const agora = Date.now();
    
    // SEGURANÇA: Se houve um swipe nos últimos 500ms, ignora este clique!
    // Isso impede que o swipe gere um clique fantasma e conte 2 pontos.
    if (agora - lastInteraction < 500) return;
    
    // Se a flag de swipe ainda estiver ativa por algum motivo, ignora
    if (isSwiping) return; 

    alterarPonto(time, 1);
}

function alterarPonto(time, delta) {
    if (!gameState.ativo) return;
    const t = gameState.truco;
    
    // Aplica o delta (garante que é sempre 1 por vez nas chamadas de swipe)
    if (time === 1) t.s1 += delta; else t.s2 += delta;
    
    t.s1 = Math.max(0, Math.min(t.max, t.s1));
    t.s2 = Math.max(0, Math.min(t.max, t.s2));

    atualizarTelaTruco();
    salvarEstado();

    if (t.s1 === t.max || t.s2 === t.max) {
        startConfetti();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else {
        stopConfetti();
    }
}

function atualizarTelaTruco() {
    const s1 = document.getElementById('score-time1');
    const s2 = document.getElementById('score-time2');
    if(s1) s1.innerText = gameState.truco.s1;
    if(s2) s2.innerText = gameState.truco.s2;
    
    const n1 = document.getElementById('nome-time1');
    const n2 = document.getElementById('nome-time2');
    if(n1) n1.innerText = gameState.truco.n1 || 'NÓS';
    if(n2) n2.innerText = gameState.truco.n2 || 'ELES';
    
    const meta = document.getElementById('display-meta');
    if(meta) meta.innerText = gameState.truco.max;

    const c1 = document.getElementById('card-time1');
    const c2 = document.getElementById('card-time2');
    if(c1) c1.classList.toggle('winning', gameState.truco.s1 === gameState.truco.max);
    if(c2) c2.classList.toggle('winning', gameState.truco.s2 === gameState.truco.max);
}

/* ================= FODINHA (COM COROA) ================= */
function renderGameFodinha() {
    const grid = document.getElementById('fodinha-game-grid');
    if(!grid) return;
    grid.innerHTML = '';

    const displayMax = document.getElementById('display-fodinha-max');
    if(displayMax) displayMax.innerText = gameState.fodinha.maxVidas;

    const vivos = gameState.fodinha.players.filter(p => p.score < gameState.fodinha.maxVidas);
    const temVencedor = vivos.length === 1 && gameState.fodinha.players.length > 1;

    gameState.fodinha.players.forEach((p, i) => {
        const eliminado = p.score >= gameState.fodinha.maxVidas;
        const ehRei = temVencedor && !eliminado;
        
        const card = document.createElement('div');
        card.className = `fodinha-card ${eliminado ? 'eliminated' : ''} ${ehRei ? 'winner' : ''}`;
        
        card.innerHTML = `
            <div class="fodinha-name">${p.name || `P${i + 1}`}</div>
            <div class="fodinha-score">${p.score}</div>
            <div class="fodinha-controls">
                <button class="btn-fodinha-ctrl" onclick="alterarVida(${i},-1)">−</button>
                <button class="btn-fodinha-ctrl btn-fodinha-plus" onclick="alterarVida(${i},1)">+</button>
            </div>
        `;
        grid.appendChild(card);
    });

    if (temVencedor) startConfetti();
    else stopConfetti();
}

function alterarVida(index, delta) {
    const p = gameState.fodinha.players[index];
    const max = gameState.fodinha.maxVidas;

    if (p.score >= max && delta > 0) return;

    p.score += delta;
    if (p.score < 0) p.score = 0;

    salvarEstado();
    renderGameFodinha();
}

/* ================= MODAL & UTIL ================= */
function abrirModal(titulo, mensagem, btnTxt, callback) {
    const titEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-msg');
    if(titEl) titEl.innerText = titulo;
    if(msgEl) msgEl.innerText = mensagem;
    
    const btnConfirm = document.getElementById('modal-btn-confirm');
    if(btnConfirm) {
        btnConfirm.innerText = btnTxt;
        const novoBtn = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
        novoBtn.onclick = () => { if (callback) callback(); fecharModal(); };
    }

    const modal = document.getElementById('custom-modal');
    if(modal) {
        modal.classList.remove('hidden');
        setTimeout(() => modal.style.opacity = '1', 10);
    }
}

function fecharModal() {
    const modal = document.getElementById('custom-modal');
    if(modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.classList.add('hidden'), 300);
    }
}

function confirmarSaida() {
    abrirModal('Sair da partida', 'O jogo será encerrado.', 'Sair', resetarTudo);
}

function confirmarZerar() {
    abrirModal('Zerar pontos', 'Deseja reiniciar a contagem?', 'Zerar', zerarPontuacaoAtual);
}

function zerarPontuacaoAtual() {
    if (gameState.mode === 'truco') {
        gameState.truco.s1 = 0;
        gameState.truco.s2 = 0;
        atualizarTelaTruco();
    } else {
        gameState.fodinha.players.forEach(p => p.score = 0);
        renderGameFodinha();
    }
    stopConfetti();
    salvarEstado();
}

function resetarTudo() {
    gameState.ativo = false;
    stopConfetti();
    gameState.truco.s1 = 0;
    gameState.truco.s2 = 0;
    gameState.fodinha.players.forEach(p => p.score = 0);
    mostrarTela('setup-screen');
    renderSetupFodinha();
    salvarEstado();
}

function inputVal(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

function salvarEstado() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch(e) {}
}

function carregarEstado() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (s) gameState = { ...gameState, ...s };
    } catch (e) { localStorage.removeItem(STORAGE_KEY); }
}

/* ================= EFEITOS ================= */
let confettiCtx, confettiAnim, confettiAtivo = false;

function startConfetti() {
    const c = document.getElementById('confetti-canvas');
    if (!c || confettiAtivo) return;
    confettiAtivo = true; c.style.display = 'block';
    c.width = window.innerWidth; c.height = window.innerHeight;
    confettiCtx = c.getContext('2d');
    
    const p = Array.from({length:100}, () => ({
        x: Math.random()*c.width, y: Math.random()*-c.height,
        color: ['#ff0','#f00','#0f0','#00f','#fff'][Math.floor(Math.random()*5)],
        s: Math.random()*5+5, v: Math.random()*5+2, w: Math.random()*10
    }));

    function loop() {
        if (!confettiAtivo) return;
        confettiCtx.clearRect(0,0,c.width,c.height);
        p.forEach(k => {
            k.y += k.v; k.w += 0.1;
            confettiCtx.fillStyle = k.color;
            confettiCtx.fillRect(k.x + Math.sin(k.w)*2, k.y, k.s, k.s);
            if(k.y > c.height) k.y = -20;
        });
        confettiAnim = requestAnimationFrame(loop);
    }
    loop();
}

function stopConfetti() {
    confettiAtivo = false; cancelAnimationFrame(confettiAnim);
    const c = document.getElementById('confetti-canvas');
    if(c) { c.style.display = 'none'; if(confettiCtx) confettiCtx.clearRect(0,0,c.width,c.height); }
}
