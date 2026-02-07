const STORAGE_KEY = 'marcador_truco_v_final_fixed_ui';
const HIST_KEY = 'marcador_historico_data';

/* ================= ESTADO GLOBAL ================= */
let gameState = {
    mode: 'truco', // 'truco' ou 'fodinha'
    ativo: false,
    matchSaved: false, // Flag para evitar salvar a mesma partida múltiplas vezes
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

// Variáveis de controle de gestos (Swipe)
let touchStartY = 0;
let isSwiping = false;
let lastInteraction = 0; 

/* ================= INIT ================= */
window.addEventListener('DOMContentLoaded', () => {
    carregarEstado();
    
    // Configura botões de modal
    const btnCancel = document.getElementById('modal-btn-cancel');
    if(btnCancel) btnCancel.onclick = fecharModal;
    
    if (gameState.ativo) {
        // Se estava jogando, restaura a tela do jogo
        if (gameState.mode === 'truco') {
            mostrarTela('game-screen-truco');
            atualizarTelaTruco();
            setupGestos();
        } else {
            mostrarTela('game-screen-fodinha');
            renderGameFodinha();
        }
    } else {
        // Se não estava jogando, vai pro setup
        mostrarTela('setup-screen');
        renderSetupFodinha();
        
        // Sincroniza a UI (botões ativos) com o estado salvo
        sincronizarInterfaceComEstado();
    }
});

/* ================= NAVEGAÇÃO E MODOS ================= */

// Função chamada ao clicar nos botões Truco/Fodinha
function mudarModo(modo, btn) {
    gameState.mode = modo;
    atualizarVisualSeletor(btn);
    alternarPaineisSetup(modo);
    salvarEstado();
}

// Atualiza apenas o visual do botão e do "glider"
function atualizarVisualSeletor(btn) {
    if(!btn) return;
    
    // Remove active de todos e adiciona no atual
    const container = btn.parentNode;
    container.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Move a barrinha (glider)
    const glider = document.getElementById('mode-glider');
    const buttons = [...container.querySelectorAll('button')];
    if(glider && buttons.length > 0) {
        glider.style.transform = `translateX(${buttons.indexOf(btn) * 100}%)`;
    }
}

// Mostra/Esconde os painéis de configuração (inputs)
function alternarPaineisSetup(modo) {
    const setupTruco = document.getElementById('setup-truco');
    const setupFodinha = document.getElementById('setup-fodinha');
    
    if(setupTruco) setupTruco.classList.toggle('hidden', modo !== 'truco');
    if(setupFodinha) setupFodinha.classList.toggle('hidden', modo !== 'fodinha');
}

// Garante que o botão visualmente ativo corresponda ao gameState.mode
function sincronizarInterfaceComEstado() {
    // Acha o botão correspondente ao modo salvo
    const btnAlvo = document.querySelector(`.mode-selector button[onclick*="'${gameState.mode}'"]`);
    
    if(btnAlvo) {
        atualizarVisualSeletor(btnAlvo);
        alternarPaineisSetup(gameState.mode);
    }
    
    // Sincroniza visualmente os pontos do truco (12, 24, 30)
    if(gameState.mode === 'truco') {
         const botoesPonto = document.querySelectorAll('#setup-truco .segment-opt');
         botoesPonto.forEach(btn => {
             // Remove active de todos primeiro
             btn.classList.remove('active');
             // Adiciona active se for o valor salvo
             if(parseInt(btn.innerText) === gameState.truco.max) {
                 btn.classList.add('active');
                 // Move o glider dos pontos
                 const glider = btn.parentNode.querySelector('.segment-glider');
                 const index = [...btn.parentNode.querySelectorAll('button')].indexOf(btn);
                 if(glider) glider.style.transform = `translateX(${index * 100}%)`;
             }
         });
    }
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

/* --- Setup Fodinha --- */
function renderSetupFodinha() {
    const container = document.getElementById('players-container');
    if(!container) return;
    
    container.innerHTML = '';

    gameState.fodinha.players.forEach((p, i) => {
        const div = document.createElement('div');
        div.className = 'player-input-card';
        div.innerHTML = `
            <div style="margin-right:10px; font-weight:bold; color:#666;">${i + 1}</div>
            <input type="text" value="${p.name}" placeholder="Nome"
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
    // 1. DETECÇÃO VISUAL SEGURA
    // Verifica qual botão está visualmente com a classe 'active' para definir o modo.
    const botaoAtivo = document.querySelector('.mode-selector .segment-opt.active');
    if (botaoAtivo) {
        const textoBotao = botaoAtivo.innerText.toLowerCase();
        if (textoBotao.includes('truco')) {
            gameState.mode = 'truco';
        } else if (textoBotao.includes('fodinha')) {
            gameState.mode = 'fodinha';
        }
    }

    gameState.ativo = true;
    gameState.matchSaved = false; // Reseta flag de histórico para nova partida

    if (gameState.mode === 'truco') {
        // Configura Truco
        gameState.truco.n1 = inputVal('input-time1');
        gameState.truco.n2 = inputVal('input-time2');
        
        // Pega o valor máximo dos botões de ponto
        const btnPontoAtivo = document.querySelector('#setup-truco .segmented-control .segment-opt.active');
        if (btnPontoAtivo) {
            gameState.truco.max = parseInt(btnPontoAtivo.innerText) || 12;
        }

        atualizarTelaTruco();
        mostrarTela('game-screen-truco');
        setupGestos();

    } else {
        // Configura Fodinha
        const vidasInput = parseInt(inputVal('input-vidas-max'));
        gameState.fodinha.maxVidas = vidasInput && vidasInput > 0 ? vidasInput : 5;
        
        renderGameFodinha();
        mostrarTela('game-screen-fodinha');
    }

    salvarEstado();
}

/* ================= LÓGICA DO TRUCO ================= */
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

    // Limpa eventos antigos
    el.ontouchstart = null; 
    el.ontouchend = null; 
    el.ontouchmove = null;

    el.addEventListener('touchstart', e => {
        touchStartY = e.touches[0].clientY;
        isSwiping = false;
    }, { passive: true });

    el.addEventListener('touchmove', e => {
        if (Math.abs(e.touches[0].clientY - touchStartY) > 10) {
            isSwiping = true;
        }
    }, { passive: true });

    el.addEventListener('touchend', e => {
        const dy = e.changedTouches[0].clientY - touchStartY;
        
        // Swipe detectado (> 60px)
        if (Math.abs(dy) > 60) {
            isSwiping = true;
            lastInteraction = Date.now();
            
            // Cima = +1, Baixo = -1
            const pontos = dy < 0 ? 1 : -1;
            alterarPonto(time, pontos);
        } else {
            isSwiping = false;
        }
    });
}

function pontuarTap(time) {
    const agora = Date.now();
    // Evita duplo clique fantasma após swipe
    if (agora - lastInteraction < 500) return;
    if (isSwiping) return; 

    alterarPonto(time, 1);
}

function alterarPonto(time, delta) {
    if (!gameState.ativo) return;
    const t = gameState.truco;
    
    if (time === 1) t.s1 += delta; else t.s2 += delta;
    
    // Limites (0 até Max)
    t.s1 = Math.max(0, Math.min(t.max, t.s1));
    t.s2 = Math.max(0, Math.min(t.max, t.s2));

    atualizarTelaTruco();
    salvarEstado();

    // Vitória
    if (t.s1 === t.max || t.s2 === t.max) {
        startConfetti();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        
        // Registrar no Histórico
        const nomeVencedor = t.s1 === t.max ? (t.n1 || 'NÓS') : (t.n2 || 'ELES');
        const placarFinal = `${t.s1} x ${t.s2}`;
        registrarVitoria(nomeVencedor, placarFinal, 'truco');

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

/* ================= LÓGICA DO FODINHA ================= */
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

    if (temVencedor) {
        startConfetti();
        // Registrar no Histórico
        const vencedor = vivos[0];
        const nomeVenc = vencedor.name || 'Jogador';
        registrarVitoria(nomeVenc, 'Sobrevivente', 'fodinha');
    } else {
        stopConfetti();
    }
}

function alterarVida(index, delta) {
    const p = gameState.fodinha.players[index];
    const max = gameState.fodinha.maxVidas;

    // Não permite aumentar vida se já morreu
    if (p.score >= max && delta > 0) return;

    p.score += delta;
    if (p.score < 0) p.score = 0;

    salvarEstado();
    renderGameFodinha();
}

/* ================= MODAIS E RESET ================= */
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
    gameState.matchSaved = false; // Permite salvar novamente se zerar os pontos na mesma partida
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
    gameState.matchSaved = false;
    stopConfetti();
    
    // Reseta pontos
    gameState.truco.s1 = 0;
    gameState.truco.s2 = 0;
    gameState.fodinha.players.forEach(p => p.score = 0);

    mostrarTela('setup-screen');
    renderSetupFodinha();
    
    sincronizarInterfaceComEstado();
    salvarEstado();
}

/* ================= HISTÓRICO (NOVO) ================= */

function registrarVitoria(vencedor, placar, modo) {
    if (gameState.matchSaved) return; // Evita duplicidade
    
    gameState.matchSaved = true;
    
    // Captura dados dos jogadores para o histórico
    let jogadores = [];
    if (modo === 'truco') {
        jogadores = [
            { nome: gameState.truco.n1 || 'NÓS', pontos: gameState.truco.s1 },
            { nome: gameState.truco.n2 || 'ELES', pontos: gameState.truco.s2 }
        ];
    } else {
        // No Fodinha, salva o estado final de todos os jogadores
        jogadores = gameState.fodinha.players.map(p => ({
            nome: p.name,
            vidas_perdidas: p.score,
            status: p.score >= gameState.fodinha.maxVidas ? 'eliminado' : 'vencedor'
        }));
    }

    const partida = {
        id: Date.now(),
        data: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit' }),
        modo: modo, 
        vencedor: vencedor,
        placar: placar,
        detalhes: modo === 'truco' ? `Max: ${gameState.truco.max}` : `${gameState.fodinha.players.length} Jogadores`,
        jogadores: jogadores // Novo campo
    };

    const historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    historico.unshift(partida); // Adiciona no começo
    localStorage.setItem(HIST_KEY, JSON.stringify(historico));
}

function abrirHistorico() {
    const listaEl = document.getElementById('history-list');
    const historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    
    mostrarTela('history-screen');
    
    if (historico.length === 0) {
        listaEl.innerHTML = '<div style="text-align: center; color: #444; margin-top: 50px; font-weight:bold;">Nada por aqui ainda...<br>Vá jogar!</div>';
        return;
    }

    listaEl.innerHTML = historico.map(p => `
        <div class="history-card mode-${p.modo}" onclick="verDetalhesPartida(${p.id})">
            <div class="hist-header">
                <span>${p.modo.toUpperCase()}</span>
                <span>${p.data}</span>
            </div>
            <div class="hist-main">
                <div class="hist-winner">
                    <span class="crown-icon">👑</span> ${p.vencedor}
                </div>
                <div class="hist-score">${p.placar}</div>
            </div>
            <div class="hist-details">
                ${p.detalhes} <span style="float:right; font-size: 0.8em; opacity: 0.7;">ℹ️ Ver detalhes</span>
            </div>
        </div>
    `).join('');
}

function fecharHistorico() {
    mostrarTela('setup-screen');
    sincronizarInterfaceComEstado(); 
}

function limparHistorico() {
    if(confirm('Tem certeza que quer apagar todo o histórico?')) {
        localStorage.removeItem(HIST_KEY);
        abrirHistorico(); 
    }
}

function verDetalhesPartida(id) {
    const historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
    const partida = historico.find(p => p.id === id);
    
    if (!partida) return;

    let htmlDetalhes = '';

    if (partida.modo === 'truco') {
        // Detalhes Truco
        if (partida.jogadores && partida.jogadores.length >= 2) {
             htmlDetalhes = `
                <div style="text-align:left; margin-top:10px;">
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:5px 0; margin-bottom:5px;">
                        <span style="font-weight:bold; color: #aaa;">${partida.jogadores[0].nome}</span>
                        <span style="font-size:1.2em; color:#fff;">${partida.jogadores[0].pontos}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:5px 0;">
                        <span style="font-weight:bold; color: #aaa;">${partida.jogadores[1].nome}</span>
                        <span style="font-size:1.2em; color:#fff;">${partida.jogadores[1].pontos}</span>
                    </div>
                </div>
            `;
        } else {
             // Fallback para histórico antigo
             htmlDetalhes = `<p style="color:#888;">Detalhes dos jogadores não disponíveis para esta partida antiga.</p>`;
        }
    } else {
        // Detalhes Fodinha
        if (partida.jogadores && partida.jogadores.length > 0) {
            htmlDetalhes = `<div style="text-align:left; margin-top:10px; max-height:200px; overflow-y:auto;">`;
            partida.jogadores.forEach(p => {
                const isWinner = p.status === 'vencedor';
                htmlDetalhes += `
                    <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #333; ${isWinner ? 'color:#ffd700;' : 'color:#ccc;'}">
                        <span>${isWinner ? '👑 ' : ''}${p.nome || 'Jogador'}</span>
                        <span>${p.vidas_perdidas} vidas perdidas</span>
                    </div>
                `;
            });
            htmlDetalhes += `</div>`;
        } else {
             htmlDetalhes = `<p style="color:#888;">Detalhes dos jogadores não disponíveis para esta partida antiga.</p>`;
        }
    }

    abrirModal(
        `Detalhes da Partida`, 
        `Data: ${partida.data}\nModo: ${partida.modo.toUpperCase()}`, 
        'Fechar'
    );
    
    // Injeta o HTML customizado na mensagem do modal para ficar mais rico
    // Pequeno hack: substitui o texto simples pelo HTML
    const msgEl = document.getElementById('modal-msg');
    if (msgEl) {
        msgEl.innerHTML = `<p style="margin-bottom:10px; color:#888;">${partida.data} - ${partida.modo.toUpperCase()}</p>` + htmlDetalhes;
    }
}

/* ================= HELPERS ================= */
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

/* ================= EFEITOS (Confetti) ================= */
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