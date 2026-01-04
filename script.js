const STORAGE_KEY = 'truco_v5_tap'; // Nova chave para evitar conflito com versão anterior

let jogoAtivo = false;
let nome1 = "Nós", nome2 = "Eles";
let maxPontos = 12;
let score1 = 0, score2 = 0;
let historico = [];

window.onload = function() {
    try {
        carregarEstado();
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

// --- Interface ---
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
    
    score1 = 0; 
    score2 = 0; 
    historico = [];
    jogoAtivo = true;
    
    salvarTudo();
    atualizarTela();
    
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

// --- Nova Função: Tocar na tela para somar 1 ---
function pontuarTap(time) {
    // Vibração curtinha e rápida para feedback tátil
    try { if (navigator.vibrate) navigator.vibrate(15); } catch(e){}
    mudarPontos(time, 1);
}

function mudarPontos(time, qtd) {
    historico.push({ s1: score1, s2: score2 });
    if (historico.length > 10) historico.shift(); 
    document.getElementById('btn-undo').disabled = false;

    // Vibração maior se for botão (flor ou menos)
    if (Math.abs(qtd) > 1 || qtd < 0) {
        try { if (navigator.vibrate) navigator.vibrate(40); } catch(e){}
    }

    if (time === 1) score1 += qtd;
    else score2 += qtd;

    if (score1 < 0) score1 = 0;
    if (score2 < 0) score2 = 0;

    let venceu = false;
    if (score1 >= maxPontos) { score1 = maxPontos; mostrarVitoria(nome1); venceu = true;}
    else if (score2 >= maxPontos) { score2 = maxPontos; mostrarVitoria(nome2); venceu = true;}
    
    salvarTudo();
    atualizarTela();
}

function desfazer() {
    if (historico.length === 0) return;
    const anterior = historico.pop();
    score1 = anterior.s1;
    score2 = anterior.s2;
    
    if (historico.length === 0) document.getElementById('btn-undo').disabled = true;
    
    stopConfetti(); 
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
    
    if (score1 > score2) card1.classList.add('winning');
    if (score2 > score1) card2.classList.add('winning');
}

// --- Lógica de Reset e Saída ---
function resetarPartida() {
    jogoAtivo = false;
    score1 = 0;
    score2 = 0;
    historico = [];
    localStorage.removeItem(STORAGE_KEY);
    atualizarTela();
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('setup-screen').classList.remove('hidden');
}

function confirmarSaida() {
    abrirModal("Sair do Jogo?", "O placar atual será apagado.", "Sair", () => {
        resetarPartida();
    });
}

function mostrarVitoria(vencedor) {
    startConfetti();
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]); } catch(e){}
    
    setTimeout(() => {
        abrirModal("Fim de Jogo!", vencedor.toUpperCase() + " VENCERAM!", "Novo Jogo", () => {
            stopConfetti();
            resetarPartida(); 
        }, true);
    }, 600);
}

// --- Modais ---
function abrirModal(titulo, mensagem, textoConfirmar, acaoConfirmar, esconderCancelar = false) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-msg').innerText = mensagem;
    
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');
    
    btnConfirm.innerText = textoConfirmar || "OK";
    
    if(esconderCancelar) btnCancel.style.display = 'none';
    else {
        btnCancel.style.display = 'block';
        btnCancel.onclick = () => modal.classList.add('hidden');
    }

    const novoBtn = btnConfirm.cloneNode(true);
    btnConfirm.parentNode.replaceChild(novoBtn, btnConfirm);
    
    novoBtn.onclick = () => { 
        if(acaoConfirmar) acaoConfirmar(); 
        modal.classList.add('hidden'); 
    };
    
    modal.classList.remove('hidden');
}

// --- Persistência ---
function salvarTudo() {
    const estado = { ativo: jogoAtivo, n1: nome1, n2: nome2, max: maxPontos, s1: score1, s2: score2, hist: historico };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function carregarEstado() {
    const salvoStr = localStorage.getItem(STORAGE_KEY);
    if (!salvoStr) return;
    
    const salvo = JSON.parse(salvoStr);
    if (salvo && salvo.ativo) {
        nome1 = salvo.n1; nome2 = salvo.n2; maxPontos = salvo.max;
        score1 = salvo.s1; score2 = salvo.s2; historico = salvo.hist || [];
        
        document.getElementById('btn-undo').disabled = (historico.length === 0);
        jogoAtivo = true;
        document.getElementById('setup-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        atualizarTela();
    }
}

// --- Confetes ---
let confettiCtx, confettiActive = false, particles = [], animationId;
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas) return;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    confettiCtx = canvas.getContext('2d');
    particles = []; confettiActive = true;
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'];
    for(let i=0; i<120; i++) { 
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
