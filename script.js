const STORAGE_KEY = 'marcador_truco_fodinha_final_v6'; 

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

window.onload = function() {
    try {
        carregarEstado();
        renderSetupFodinha();
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
    }
    // Garante que o input do Truco respeite placeholders se estiver vazio
    if(!gameState.truco.n1) {
        const input1 = document.getElementById('input-time1');
        if(input1) input1.value = "";
    }
    if(!gameState.truco.n2) {
        const input2 = document.getElementById('input-time2');
        if(input2) input2.value = "";
    }
    
    window.confetti = { start: startConfetti, stop: stopConfetti };
};

// --- MODOS ---
function mudarModo(modo, btn) {
    gameState.mode = modo;
    document.querySelectorAll('.mode-selector .segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const glider = document.getElementById('mode-glider');
    const buttons = Array.from(btn.parentNode.querySelectorAll('button'));
    const index = buttons.indexOf(btn);
    glider.style.transform = `translateX(${index * 100}%)`;

    if(modo === 'truco') {
        document.getElementById('setup-truco').classList.remove('hidden');
        document.getElementById('setup-fodinha').classList.add('hidden');
    } else {
        document.getElementById('setup-truco').classList.add('hidden');
        document.getElementById('setup-fodinha').classList.remove('hidden');
    }
}

// --- SETUP TRUCO ---
function selPonto(valor, btn) {
    gameState.truco.max = valor;
    document.getElementById('input-max').value = valor;
    const container = btn.parentNode;
    container.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const glider = container.querySelector('.segment-glider');
    const buttons = Array.from(container.querySelectorAll('button'));
    const index = buttons.indexOf(btn);
    glider.style.transform = `translateX(${index * 100}%)`;
}

// --- SETUP FODINHA ---
function addFodinhaPlayer() {
    gameState.fodinha.players.push({ name: "", score: 0 });
    renderSetupFodinha();
    // Scrolla para o fim da lista automaticamente
    setTimeout(() => {
        const container = document.querySelector('.dark-scroll-container');
        if(container) container.scrollTop = container.scrollHeight;
    }, 50);
}

function removeFodinhaPlayer(index) {
    if(gameState.fodinha.players.length <= 2) return;
    gameState.fodinha.players.splice(index, 1);
    renderSetupFodinha();
}

function updatePlayerName(index, val) {
    gameState.fodinha.players[index].name = val;
}

function renderSetupFodinha() {
    const container = document.getElementById('players-container');
    container.innerHTML = '';
    
    gameState.fodinha.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-input-card';
        div.innerHTML = `
            <div style="font-size:0.8rem; color:#444; margin-right:15px; font-weight:800;">${i+1}</div>
            <input type="text" 
                   value="${p.name}" 
                   oninput="updatePlayerName(${i}, this.value)" 
                   placeholder="Nome do Jogador"
                   autocomplete="off">
            ${gameState.fodinha.players.length > 2 ? 
                `<button class="btn-remove-mini" onclick="removeFodinhaPlayer(${i})">×</button>` 
                : ''}
        `;
        container.appendChild(div);
    });
}

// --- INICIAR JOGO ---
function iniciarJogo() {
    if(gameState.mode === 'truco') {
        gameState.truco.n1 = document.getElementById('input-time1').value.trim();
        gameState.truco.n2 = document.getElementById('input-time2').value.trim();
        
        if(!gameState.ativo) { gameState.truco.s1 = 0; gameState.truco.s2 = 0; }
        
        gameState.ativo = true;
        salvarTudo();
        atualizarTelaTruco();
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen-truco').classList.remove('hidden');
        setupTouchHandlers();
    } else {
        const maxInput = document.getElementById('input-vidas-max');
        const max = maxInput ? parseInt(maxInput.value) : 5;
        gameState.fodinha.maxVidas = max || 5;
        
        // Zera scores se for novo jogo
        if(!gameState.ativo) gameState.fodinha.players.forEach(p => p.score = 0);
        
        gameState.ativo = true;
        salvarTudo();
        renderGameFodinha();
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen-fodinha').classList.remove('hidden');
    }
}

// --- RENDER FODINHA ---
function renderGameFodinha() {
    const grid = document.getElementById('fodinha-game-grid');
    grid.innerHTML = '';
    
    const displayMax = document.getElementById('display-fodinha-max');
    if(displayMax) displayMax.innerText = gameState.fodinha.maxVidas;

    gameState.fodinha.players.forEach((p, i) => {
        const isEliminated = p.score >= gameState.fodinha.maxVidas;
        const displayName = p.name.trim() === "" ? `P${i + 1}` : p.name;
        
        const div = document.createElement('div');
        div.className = `fodinha-card ${isEliminated ? 'eliminated' : ''}`;
        
        div.innerHTML = `
            <div class="fodinha-name">${displayName}</div>
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
    if(!gameState.ativo) return;
    
    const p = gameState.fodinha.players[index];

    // TRAVA NO LIMITE (Não sobe se já estiver no máximo)
    if (delta > 0 && p.score >= gameState.fodinha.maxVidas) return;

    vibrar(20);
    p.score += delta;
    if(p.score < 0) p.score = 0;
    
    salvarTudo();
    renderGameFodinha();
}

// --- RENDER TRUCO ---
function setupTouchHandlers() {
    setupCardTouch('card-time1', 1);
    setupCardTouch('card-time2', 2);
}

function setupCardTouch(cardId, timeIndex) {
    const card = document.getElementById(cardId);
    if(!card) return;
    let startX = 0, startY = 0;
    card.addEventListener('touchstart', (e) => {
        if (!gameState.ativo || e.target.closest('.ctrl-btn-v')) return;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        blockClick = false; card.classList.add('touched');
    }, { passive: true });
    
    card.addEventListener('touchend', (e) => {
        card.classList.remove('touched');
        if (!gameState.ativo || e.target.closest('.ctrl-btn-v')) return;
        const diffY = e.changedTouches[0].clientY - startY;
        const diffX = e.changedTouches[0].clientX - startX;
        
        // SWIPE DOWN (Remover Ponto)
        if (diffY > 50 && Math.abs(diffY) > Math.abs(diffX)) {
            blockClick = true; 
            vibrar([30, 50]); 
            mudarPontos(timeIndex, -1);
        }
        // SWIPE UP (Adicionar Ponto) - NOVA FUNCIONALIDADE
        else if (diffY < -50 && Math.abs(diffY) > Math.abs(diffX)) {
            blockClick = true;
            vibrar(15);
            mudarPontos(timeIndex, 1);
        }
    });
}

function pontuarTap(time) {
    if (gameState.mode !== 'truco' || blockClick) { blockClick = false; return; }
    vibrar(15); mudarPontos(time, 1);
}

function mudarPontos(time, qtd) {
    if (!gameState.ativo) return;
    let t = gameState.truco;
    if (time === 1) t.s1 += qtd; else t.s2 += qtd;
    if (t.s1 < 0) t.s1 = 0; if (t.s2 < 0) t.s2 = 0;
    if (t.s1 > t.max) t.s1 = t.max; if (t.s2 > t.max) t.s2 = t.max;
    if (t.s1 === t.max || t.s2 === t.max) mostrarVitoria();
    salvarTudo(); atualizarTelaTruco();
}

function atualizarTelaTruco() {
    document.getElementById('score-time1').innerText = gameState.truco.s1;
    document.getElementById('score-time2').innerText = gameState.truco.s2;
    document.getElementById('nome-time1').innerText = gameState.truco.n1 || "NÓS";
    document.getElementById('nome-time2').innerText = gameState.truco.n2 || "ELES";
    document.getElementById('display-meta').innerText = gameState.truco.max;
    const c1 = document.getElementById('card-time1'), c2 = document.getElementById('card-time2');
    c1.classList.remove('winning'); c2.classList.remove('winning');
    if(gameState.truco.s1 === gameState.truco.max) c1.classList.add('winning');
    if(gameState.truco.s2 === gameState.truco.max) c2.classList.add('winning');
}

// --- UTIL ---
function confirmarSaida() {
    abrirModal("Sair para o Menu?", "O jogo atual será salvo.", "Sair", () => resetarParaMenu());
}

function resetarParaMenu() {
    gameState.ativo = false; stopConfetti();
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('game-screen-truco').classList.add('hidden');
    document.getElementById('game-screen-fodinha').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
    renderSetupFodinha();
    
    // Limpa inputs visuais do Truco
    const inp1 = document.getElementById('input-time1');
    const inp2 = document.getElementById('input-time2');
    if(inp1) inp1.value = "";
    if(inp2) inp2.value = "";
    gameState.truco.n1 = "";
    gameState.truco.n2 = "";
}

function confirmarZerar() {
    abrirModal("Reiniciar pontuação?", "Todos voltarão a zero.", "Sim, Zerar", () => {
        if(gameState.mode === 'truco') { gameState.truco.s1 = 0; gameState.truco.s2 = 0; atualizarTelaTruco(); }
        else { gameState.fodinha.players.forEach(p => p.score = 0); renderGameFodinha(); }
        gameState.ativo = true; stopConfetti(); salvarTudo();
    });
}

function mostrarVitoria() {
    gameState.ativo = false; startConfetti(); vibrar([200, 100, 200]);
}

function vibrar(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch(e){} }

function salvarTudo() { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState)); }

function carregarEstado() {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(s) gameState = { ...gameState, ...s };
    
    const inp1 = document.getElementById('input-time1');
    const inp2 = document.getElementById('input-time2');
    if(inp1) inp1.value = gameState.truco.n1 || "";
    if(inp2) inp2.value = gameState.truco.n2 || "";
    
    const modeBtn = document.querySelector(`.mode-selector button[onclick*="${gameState.mode}"]`);
    if(modeBtn) mudarModo(gameState.mode, modeBtn);
    
    if (gameState.ativo) {
        document.getElementById('setup-screen').classList.add('hidden');
        if(gameState.mode === 'truco') {
            document.getElementById('game-screen-truco').classList.remove('hidden');
            atualizarTelaTruco(); setupTouchHandlers();
        } else {
            document.getElementById('game-screen-fodinha').classList.remove('hidden');
            renderGameFodinha();
        }
    }
}

function abrirModal(t, m, btnT, acao) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = t;
    document.getElementById('modal-msg').innerText = m;
    const btn = document.getElementById('modal-btn-confirm');
    document.getElementById('modal-btn-cancel').onclick = () => modal.classList.add('hidden');
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.innerText = btnT || "OK";
    novoBtn.onclick = () => { if(acao) acao(); modal.classList.add('hidden'); };
    modal.classList.remove('hidden');
}

let confettiCtx, confettiActive = false, particles = [], animationId;
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas || confettiActive) return; 
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    confettiCtx = canvas.getContext('2d');
    particles = []; confettiActive = true;
    const colors = ['#ffffff', '#d3d3d3', '#a9a9a9', '#808080', '#f5f5f5'];
    for(let i=0; i<150; i++) particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height, color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() * 8 + 4, speed: Math.random() * 6 + 3, wobble: Math.random() * 10 }); 
    animateConfetti();
}
function animateConfetti() {
    if(!confettiActive) return;
    confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight);
    particles.forEach(p => { 
        p.y += p.speed; p.x += Math.sin(p.wobble) * 2; p.wobble += 0.1;
        if(p.y > window.innerHeight) { p.y = -20; p.x = Math.random() * window.innerWidth; }
        confettiCtx.fillStyle = p.color; confettiCtx.fillRect(p.x, p.y, p.size, p.size); 
    });
    animationId = requestAnimationFrame(animateConfetti);
}
function stopConfetti() { confettiActive = false; cancelAnimationFrame(animationId); if(confettiCtx) confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight); }