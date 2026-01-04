const STORAGE_KEY = 'truco_v7_fix'; 

let jogoAtivo = false;
let nome1 = "Nós", nome2 = "Eles";
let maxPontos = 12;
let score1 = 0, score2 = 0;
let blockClick = false; // Flag para impedir conflito entre Swipe e Click

window.onload = function() {
    try {
        carregarEstado();
        setupTouchHandlers(); 
        const defaultBtn = document.querySelector(`.segment-opt[onclick*="${maxPontos}"]`) || document.querySelector('.segment-opt');
        if(defaultBtn) {
            document.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
            defaultBtn.classList.add('active');
            setTimeout(() => moveGlider(defaultBtn), 100);
        }
        window.confetti = { start: startConfetti, stop: stopConfetti };
    } catch (e) {
        console.warn("Resetando estado:", e);
        localStorage.removeItem(STORAGE_KEY);
    }
};

// --- Gerenciamento Inteligente de Toque vs Clique ---
function setupTouchHandlers() {
    setupCardTouch('card-time1', 1);
    setupCardTouch('card-time2', 2);
}

function setupCardTouch(cardId, timeIndex) {
    const card = document.getElementById(cardId);
    let startX = 0;
    let startY = 0;

    card.addEventListener('touchstart', (e) => {
        if (!jogoAtivo || e.target.closest('.ctrl-btn-v')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        blockClick = false; // Reseta bloqueio no início do toque
        card.classList.add('touched');
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
        card.classList.remove('touched');
        if (!jogoAtivo || e.target.closest('.ctrl-btn-v')) return;

        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        
        const diffX = endX - startX;
        const diffY = endY - startY;

        // Se arrastou mais de 50px horizontalmente...
        if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
            // É um SWIPE!
            blockClick = true; // IMPEDE que o 'onclick' aconteça depois
            
            // Vibração dupla para indicar subtração
            try { if (navigator.vibrate) navigator.vibrate([30, 50, 30]); } catch(e){}
            mudarPontos(timeIndex, -1);
        }
    });
}

// Chamado pelo onclick do HTML (Funciona em Mouse e Touch)
function pontuarTap(time) {
    if (!jogoAtivo) return;
    
    // Se houve um swipe milissegundos antes, ignoramos este clique
    if (blockClick) {
        blockClick = false;
        return;
    }

    try { if (navigator.vibrate) navigator.vibrate(15); } catch(e){}
    mudarPontos(time, 1);
}

// --- Interface e Lógica do Jogo ---
function selPonto(valor, btn) {
    document.getElementById('input-max').value = valor;
    maxPontos = valor; 
    document.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    moveGlider(btn);
}

function moveGlider(targetBtn) {
    const glider = document.querySelector('.segment-glider');
    if(glider && targetBtn) {
        const buttons = Array.from(targetBtn.parentNode.querySelectorAll('button'));
        const index = buttons.indexOf(targetBtn);
        glider.style.transform = `translateX(${index * 100}%)`;
    }
}

function iniciarJogo() {
    const n1 = document.getElementById('input-time1').value.trim();
    const n2 = document.getElementById('input-time2').value.trim();
    nome1 = n1 || "Nós";
    nome2 = n2 || "Eles";
    
    zerarPlacarAtual();
    jogoAtivo = true;
    
    salvarTudo();
    atualizarTela();
    
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

function mudarPontos(time, qtd) {
    if (!jogoAtivo) return;

    // Vibração botões
    if (Math.abs(qtd) > 1 || (qtd < 0 && !blockClick)) {
        try { if (navigator.vibrate) navigator.vibrate(40); } catch(e){}
    }

    if (time === 1) score1 += qtd;
    else score2 += qtd;

    if (score1 < 0) score1 = 0;
    if (score2 < 0) score2 = 0;
    if (score1 > maxPontos) score1 = maxPontos;
    if (score2 > maxPontos) score2 = maxPontos;

    if (score1 === maxPontos || score2 === maxPontos) {
        mostrarVitoria();
    }
    
    salvarTudo();
    atualizarTela();
}

function atualizarTela() {
    document.getElementById('score-time1').innerText = score1;
    document.getElementById('score-time2').innerText = score2;
    document.getElementById('nome-time1').innerText = nome1;
    document.getElementById('nome-time2').innerText = nome2;
    document.getElementById('display-meta').innerText = "Meta: " + maxPontos;

    const card1 = document.getElementById('card-time1');
    const card2 = document.getElementById('card-time2');
    
    card1.classList.remove('winning');
    card2.classList.remove('winning');
    
    if (score1 === maxPontos && score1 > 0) card1.classList.add('winning');
    if (score2 === maxPontos && score2 > 0) card2.classList.add('winning');
}

// --- Reset e Saída ---
function confirmarSaida() {
    abrirModal("Sair para o Menu?", "O jogo atual será perdido.", "Sair", () => {
        resetarParaMenu();
    });
}

function resetarParaMenu() {
    jogoAtivo = false;
    stopConfetti();
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
}

function confirmarZerar() {
     abrirModal("Reiniciar a Mão?", "O placar voltará a 0x0.", "Sim, Zerar", () => {
        zerarPlacarAtual();
        salvarTudo();
        atualizarTela();
    });
}

function zerarPlacarAtual() {
    score1 = 0;
    score2 = 0;
    stopConfetti();
    jogoAtivo = true;
}

function mostrarVitoria() {
    jogoAtivo = false; 
    startConfetti();
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]); } catch(e){}
}

// --- Modais ---
function abrirModal(titulo, mensagem, textoConfirmar, acaoConfirmar) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-msg').innerText = mensagem;
    
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');
    
    btnConfirm.innerText = textoConfirmar || "OK";
    btnCancel.onclick = () => modal.classList.add('hidden');

    const novoBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
    
    novoBtn.onclick = () => { 
        if(acaoConfirmar) acaoConfirmar(); 
        modal.classList.add('hidden'); 
    };
    
    modal.classList.remove('hidden');
}

// --- Persistência e Confetes (Padrão) ---
function salvarTudo() {
    if(!jogoAtivo && (score1 === maxPontos || score2 === maxPontos)) return;
    const estado = { ativo: jogoAtivo, n1: nome1, n2: nome2, max: maxPontos, s1: score1, s2: score2 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function carregarEstado() {
    const salvoStr = localStorage.getItem(STORAGE_KEY);
    if (!salvoStr) return;
    const salvo = JSON.parse(salvoStr);
    if (salvo && salvo.ativo) {
        nome1 = salvo.n1; nome2 = salvo.n2; maxPontos = salvo.max;
        score1 = salvo.s1; score2 = salvo.s2;
        jogoAtivo = true;
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        atualizarTela();
    }
}

let confettiCtx, confettiActive = false, particles = [], animationId;
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas || confettiActive) return; 
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    confettiCtx = canvas.getContext('2d');
    particles = []; confettiActive = true;
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff', '#c2a470'];
    for(let i=0; i<150; i++) { 
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height, color: colors[Math.floor(Math.random() * colors.length)], size: Math.random() * 8 + 4, speed: Math.random() * 6 + 3, wobble: Math.random() * 10 }); 
    }
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

function stopConfetti() { 
    confettiActive = false; cancelAnimationFrame(animationId);
    if(confettiCtx) confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight); 
}
