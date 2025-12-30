// Configuração Global
const STORAGE_KEY = 'truco_apple_v1'; // Nova chave para limpar bugs antigos
let jogoAtivo = false;
let nome1 = "Nós", nome2 = "Eles";
let maxPontos = 12;
let score1 = 0, score2 = 0;
let historico = [];

// Inicialização segura
window.onload = function() {
    try {
        carregarEstado();
        const defaultBtn = document.querySelector('.segment-opt.active');
        if(defaultBtn) moveGlider(defaultBtn);
        window.confetti = { start: startConfetti, stop: stopConfetti };
    } catch (e) {
        console.error("Erro ao iniciar:", e);
        // Se der erro, reseta tudo para garantir que o app abra
        localStorage.removeItem(STORAGE_KEY);
    }
};

// --- Lógica de Interface ---
function selPonto(valor, btn) {
    document.getElementById('input-max').value = valor;
    document.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    moveGlider(btn);
}

function moveGlider(targetBtn) {
    const glider = document.querySelector('.segment-glider');
    if(glider && targetBtn) {
        const index = Array.from(targetBtn.parentNode.children).indexOf(targetBtn);
        glider.style.transform = `translateX(${index * 100}%)`;
    }
}

function iniciarJogo() {
    console.log("Iniciando jogo..."); // Log para debug
    const n1 = document.getElementById('input-time1').value.trim();
    const n2 = document.getElementById('input-time2').value.trim();
    
    nome1 = n1 || "Nós";
    nome2 = n2 || "Eles";
    maxPontos = parseInt(document.getElementById('input-max').value) || 12;
    
    score1 = 0; score2 = 0; historico = [];
    jogoAtivo = true;
    
    salvarTudo();
    atualizarTela();
    
    // Troca de telas
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

function mudarPontos(time, qtd) {
    historico.push({ s1: score1, s2: score2 });
    if (historico.length > 5) historico.shift();
    document.getElementById('btn-undo').disabled = false;

    if (navigator.vibrate) navigator.vibrate(40);

    if (time === 1) score1 += qtd;
    else score2 += qtd;

    if (score1 < 0) score1 = 0;
    if (score2 < 0) score2 = 0;

    if (score1 >= maxPontos) { score1 = maxPontos; mostrarVitoria(nome1); }
    else if (score2 >= maxPontos) { score2 = maxPontos; mostrarVitoria(nome2); }
    
    salvarTudo();
    atualizarTela();
}

function desfazer() {
    if (historico.length === 0) return;
    const anterior = historico.pop();
    score1 = anterior.s1;
    score2 = anterior.s2;
    if (historico.length === 0) document.getElementById('btn-undo').disabled = true;
    salvarTudo();
    atualizarTela();
}

function atualizarTela() {
    document.getElementById('score-time1').innerText = score1;
    document.getElementById('score-time2').innerText = score2;
    document.getElementById('nome-time1').innerText = nome1;
    document.getElementById('nome-time2').innerText = nome2;
    document.getElementById('display-meta').innerText = "Meta: " + maxPontos;

    document.getElementById('card-time1').classList.remove('winning');
    document.getElementById('card-time2').classList.remove('winning');
    
    if (score1 > score2) document.getElementById('card-time1').classList.add('winning');
    if (score2 > score1) document.getElementById('card-time2').classList.add('winning');
}

// --- Modais ---
function abrirModal(titulo, mensagem, textoConfirmar, acaoConfirmar, esconderCancelar = false) {
    const modal = document.getElementById('custom-modal');
    document.getElementById('modal-title').innerText = titulo;
    document.getElementById('modal-msg').innerText = mensagem;
    
    const btnConfirm = document.getElementById('modal-btn-confirm');
    const btnCancel = document.getElementById('modal-btn-cancel');
    
    btnConfirm.innerText = textoConfirmar || "OK";
    
    if(esconderCancelar) {
        btnCancel.style.display = 'none';
    } else {
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

function confirmarSaida() {
    abrirModal("Sair do Jogo?", "O jogo atual será perdido.", "Sair", () => {
        jogoAtivo = false;
        historico = [];
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    });
}

function mostrarVitoria(vencedor) {
    startConfetti();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    
    setTimeout(() => {
        abrirModal("Fim de Jogo!", vencedor.toUpperCase() + " VENCERAM!", "Novo Jogo", () => {
            stopConfetti();
            confirmarSaida();
        }, true);
    }, 500);
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
let confettiCtx;
let confettiActive = false;
const particles = [];
function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if(!canvas) return;
    confettiCtx = canvas.getContext('2d');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    confettiActive = true;
    for(let i=0; i<100; i++) {
        particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height, color: `hsl(${Math.random() * 360}, 100%, 50%)`, size: Math.random() * 10 + 5, speed: Math.random() * 5 + 2 });
    }
    animateConfetti();
}
function animateConfetti() {
    if(!confettiActive) return;
    confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight);
    particles.forEach(p => { p.y += p.speed; if(p.y > window.innerHeight) p.y = -10; confettiCtx.fillStyle = p.color; confettiCtx.fillRect(p.x, p.y, p.size, p.size); });
    requestAnimationFrame(animateConfetti);
}
function stopConfetti() { confettiActive = false; if(confettiCtx) confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight); }