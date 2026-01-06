const STORAGE_KEY = 'marcador_truco_fodinha_v2'; // Mudei a key para evitar conflito com dados antigos bugados

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

/* ================= INIT ================= */
window.addEventListener('DOMContentLoaded', () => {
    carregarEstado();
    
    // Configura botões do modal
    document.getElementById('modal-btn-cancel').onclick = fecharModal;
    
    // Inicializa a UI correta baseada no estado salvo
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
        
        // Restaura a aba ativa no setup
        const btnMode = document.querySelector(`.mode-selector button[onclick*="'${gameState.mode}'"]`);
        if(btnMode) mudarModo(gameState.mode, btnMode);
    }
});

/* ================= MODO & NAVEGAÇÃO ================= */
function mudarModo(modo, btn) {
    gameState.mode = modo;
    salvarEstado(); // Salva a preferência de modo

    // UI da aba
    document.querySelectorAll('.mode-selector .segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = document.getElementById('mode-glider');
    const buttons = [...btn.parentNode.querySelectorAll('button')];
    // Calcula a posição do glider (0% ou 100%)
    glider.style.transform = `translateX(${buttons.indexOf(btn) * 100}%)`;

    // Alterna visibilidade dos setups
    document.getElementById('setup-truco').classList.toggle('hidden', modo !== 'truco');
    document.getElementById('setup-fodinha').classList.toggle('hidden', modo !== 'fodinha');
}

function mostrarTela(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const tela = document.getElementById(id);
    if(tela) tela.classList.remove('hidden');
}

/* ================= SETUP TRUCO ================= */
function selPonto(valor, btn) {
    gameState.truco.max = valor;
    
    const container = btn.parentNode;
    container.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const index = [...container.querySelectorAll('button')].indexOf(btn);
    container.querySelector('.segment-glider').style.transform = `translateX(${index * 100}%)`;
}

/* ================= SETUP FODINHA ================= */
function renderSetupFodinha() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-input-card';
        // HTML seguro para evitar injeção, embora local
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

function atualizarNomeFodinha(index, valor) {
    gameState.fodinha.players[index].name = valor;
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
        
        // Garante que max esteja correto (caso o usuário não tenha clicado nos botões)
        const maxInput = document.getElementById('input-max'); // Se houver hidden input
        // (No seu HTML atual não tem input-max atualizando, então confiamos no gameState)
        
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

/* ================= LÓGICA TRUCO ================= */
// Esta função faltava no código original e era chamada pelo HTML
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

    // Reseta handlers antigos para evitar acumulação
    el.ontouchstart = null;
    el.ontouchend = null;
    el.ontouchmove = null;

    el.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
        isSwiping = false; // Reseta flag
    }, { passive: true });

    el.addEventListener('touchmove', e => {
        // Se mover muito, marca como swipe para cancelar o click
        if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            isSwiping = true;
        }
    }, { passive: true });

    el.addEventListener('touchend', e => {
        const touchEndY = e.changedTouches[0].clientY;
        const dy = touchEndY - touchStartY;

        // Se o movimento vertical for significativo (> 60px)
        if (Math.abs(dy) > 60) {
            isSwiping = true; // Garante que o click não dispare
            // Swipe CIMA (negativo) = +1 ponto
            // Swipe BAIXO (positivo) = -1 ponto
            const delta = dy < 0 ? 1 : -1;
            alterarPonto(time, delta);
        }
    });
}

function pontuarTap(time) {
    // Só pontua se NÃO foi um gesto de arrastar (swipe)
    // Adiciona um pequeno delay para garantir que a flag isSwiping foi processada
    setTimeout(() => {
        if (!isSwiping) {
            alterarPonto(time, 1);
        }
        isSwiping = false; // Reseta para o próximo toque
    }, 50);
}

function alterarPonto(time, delta) {
    if (!gameState.ativo) return;

    const t = gameState.truco;
    
    // Atualiza lógica
    if (time === 1) t.s1 += delta;
    else t.s2 += delta;

    // Limites (0 até Max)
    t.s1 = Math.max(0, Math.min(t.max, t.s1));
    t.s2 = Math.max(0, Math.min(t.max, t.s2));

    atualizarTelaTruco();
    salvarEstado();

    // Vitória
    if (t.s1 === t.max || t.s2 === t.max) {
        startConfetti();
        // Opcional: vibrar celular
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } else {
        stopConfetti(); // Para confete se baixar pontos
    }
}

function atualizarTelaTruco() {
    const elS1 = document.getElementById('score-time1');
    const elS2 = document.getElementById('score-time2');
    
    elS1.innerText = gameState.truco.s1;
    elS2.innerText = gameState.truco.s2;
    
    document.getElementById('nome-time1').innerText = gameState.truco.n1 || 'NÓS';
    document.getElementById('nome-time2').innerText = gameState.truco.n2 || 'ELES';
    document.getElementById('display-meta').innerText = gameState.truco.max;

    // Efeitos visuais de vitória
    const card1 = document.getElementById('card-time1');
    const card2 = document.getElementById('card-time2');
    
    card1.classList.toggle('winning', gameState.truco.s1 === gameState.truco.max);
    card2.classList.toggle('winning', gameState.truco.s2 === gameState.truco.max);
}

/* ================= LÓGICA FODINHA ================= */
function renderGameFodinha() {
    const grid = document.getElementById('fodinha-game-grid');
    grid.innerHTML = '';

    document.getElementById('display-fodinha-max').innerText = gameState.fodinha.maxVidas;

    gameState.fodinha.players.forEach((p, i) => {
        const eliminado = p.score >= gameState.fodinha.maxVidas;
        
        const card = document.createElement('div');
        card.className = `fodinha-card ${eliminado ? 'eliminated' : ''}`;
        
        card.innerHTML = `
            <div class="fodinha-name">${p.name || `Jogador ${i + 1}`}</div>
            <div class="fodinha-score">${p.score}</div>
            <div class="fodinha-controls">
                <button class="btn-fodinha-ctrl" onclick="alterarVida(${i},-1)">−</button>
                <button class="btn-fodinha-ctrl btn-fodinha-plus" onclick="alterarVida(${i},1)">+</button>
            </div>
        `;
        grid.appendChild(card);
    });
    
    // Verifica se só sobrou um (Vitória) - Lógica opcional
    const vivos = gameState.fodinha.players.filter(p => p.score < gameState.fodinha.maxVidas);
    if (vivos.length === 1 && gameState.fodinha.players.length > 1) {
         // Opcional: destacar o vencedor
    }
}

function alterarVida(index, delta) {
    const p = gameState.fodinha.players[index];
    const max = gameState.fodinha.maxVidas;

    // Se já morreu, não mexe mais (ou permite corrigir se for subtração)
    if (p.score >= max && delta > 0) return;

    p.score += delta;
    if (p.score < 0) p.score = 0; // Não permite vida negativa

    salvarEstado();
    renderGameFodinha();

    // Se alguém foi eliminado agora
    if (p.score >= max && delta > 0) {
        if (navigator.vibrate) navigator.vibrate(200);
    }
}

/* ================= MODAIS (FALTAVA ISSO) ================= */
let acaoConfirmacao = null;

function abrirModal(titulo, mensagem, textoBotaoConfirmar, callbackAcao) {
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-msg').innerText = mensagem;
    
    const btnConfirm = document.getElementById('modal-btn-confirm');
    btnConfirm.innerText = textoBotaoConfirmar;
    
    // Remove listener antigo e adiciona novo
    const novoBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
    
    novoBtn.onclick = () => {
        if (callbackAcao) callbackAcao();
        fecharModal();
    };

    const modal = document.getElementById('custom-modal');
    modal.classList.remove('hidden');
    // Pequeno delay para animação CSS se houver opacity transition
    setTimeout(() => modal.style.opacity = '1', 10);
}

function fecharModal() {
    const modal = document.getElementById('custom-modal');
    modal.style.opacity = '0';
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function confirmarSaida() {
    abrirModal(
        'Sair da partida',
        'O progresso atual será perdido e voltaremos ao menu.',
        'Sair',
        resetarTudo
    );
}

function confirmarZerar() {
    abrirModal(
        'Zerar placar',
        'Tem certeza que deseja zerar os pontos desta partida?',
        'Zerar',
        zerarPontuacaoAtual
    );
}

/* ================= RESET & UTIL ================= */
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
    gameState.ativo = true; // Mantém ativo
    salvarEstado();
}

function resetarTudo() {
    gameState.ativo = false;
    stopConfetti();
    
    // Reseta pontos mas mantém nomes
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

/* ================= STORAGE ================= */
function salvarEstado() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.error('Erro ao salvar:', e);
    }
}

function carregarEstado() {
    try {
        const salvo = localStorage.getItem(STORAGE_KEY);
        if (salvo) {
            const parsed = JSON.parse(salvo);
            // Merge simples para garantir que a estrutura nova não quebre com dados velhos
            if (parsed && parsed.truco && parsed.fodinha) {
                gameState = { ...gameState, ...parsed };
            }
        }
    } catch (e) {
        console.warn('Estado inválido, resetando.');
        localStorage.removeItem(STORAGE_KEY);
    }
}

/* ================= CONFETTI (EFEITOS) ================= */
let confettiCtx, confettiAnim, confettiAtivo = false;

function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas || confettiAtivo) return;

    confettiAtivo = true;
    canvas.style.display = 'block';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    confettiCtx = canvas.getContext('2d');

    const particles = Array.from({ length: 100 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        color: ['#ff0', '#f00', '#0f0', '#00f', '#fff'][Math.floor(Math.random() * 5)],
        size: Math.random() * 5 + 5,
        speed: Math.random() * 5 + 2,
        wobble: Math.random() * 10
    }));

    function loop() {
        if (!confettiAtivo) return;
        confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.y += p.speed;
            p.wobble += 0.1;
            const xOffset = Math.sin(p.wobble) * 2;
            
            confettiCtx.fillStyle = p.color;
            confettiCtx.fillRect(p.x + xOffset, p.y, p.size, p.size);

            if (p.y > canvas.height) p.y = -20;
        });

        confettiAnim = requestAnimationFrame(loop);
    }
    loop();
}

function stopConfetti() {
    confettiAtivo = false;
    cancelAnimationFrame(confettiAnim);
    const canvas = document.getElementById('confetti-canvas');
    if (canvas) {
        if(confettiCtx) confettiCtx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
    }
}
