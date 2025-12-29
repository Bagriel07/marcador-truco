let jogoAtivo = false;
let nome1 = "Nós", nome2 = "Eles";
let maxPontos = 12;
let score1 = 0, score2 = 0;
let historico = []; // Para função desfazer

// Inicialização
window.onload = function() {
    carregarEstado();
    // Confetes (simples)
    window.confetti = { start: startConfetti, stop: stopConfetti };
};

// ... (Variáveis globais continuam iguais: jogoAtivo, nome1, etc...)

// Inicialização
window.onload = function() {
    carregarEstado();
    // Inicializa a posição do seletor (glider)
    const defaultBtn = document.querySelector('.segment-opt.active');
    if(defaultBtn) moveGlider(defaultBtn);
    
    window.confetti = { start: startConfetti, stop: stopConfetti };
};

// --- Configuração (MODIFICADA PARA ANIMAÇÃO APPLE) ---
function selPonto(valor, btn) {
    document.getElementById('input-max').value = valor;
    document.querySelectorAll('.segment-opt').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    moveGlider(btn);
}

function moveGlider(targetBtn) {
    const glider = document.querySelector('.segment-glider');
    const index = Array.from(targetBtn.parentNode.children).indexOf(targetBtn);
    glider.style.transform = `translateX(${index * 100}%)`;
}

// ... (O resto do arquivo: iniciarJogo, mudarPontos, desfazer... continua IGUAL ao anterior)

function iniciarJogo() {
    const n1 = document.getElementById('input-time1').value.trim();
    const n2 = document.getElementById('input-time2').value.trim();
    nome1 = n1 || "Nós";
    nome2 = n2 || "Eles";
    maxPontos = parseInt(document.getElementById('input-max').value);
    
    score1 = 0; score2 = 0; historico = [];
    jogoAtivo = true;
    
    salvarTudo();
    atualizarTela();
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

// --- Jogo ---
function mudarPontos(time, qtd) {
    // Salva estado para desfazer
    historico.push({ s1: score1, s2: score2 });
    if (historico.length > 5) historico.shift(); // Guarda só os ultimos 5
    document.getElementById('btn-undo').disabled = false;

    // Vibração
    if (navigator.vibrate) navigator.vibrate(40);

    if (time === 1) score1 += qtd;
    else score2 += qtd;

    // Limites
    if (score1 < 0) score1 = 0;
    if (score2 < 0) score2 = 0;

    // Vitória
    if (score1 >= maxPontos) { score1 = maxPontos; vitoria(nome1); }
    else if (score2 >= maxPontos) { score2 = maxPontos; vitoria(nome2); }
    
    salvarTudo();
    atualizarTela();
}

function trucoGeral() {
    // Atalho para pedir truco (apenas visual ou som futuramente)
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    alert("TRUCO LADRÃO!");
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
    const s1 = document.getElementById('score-time1');
    const s2 = document.getElementById('score-time2');
    
    s1.innerText = score1;
    s2.innerText = score2;
    document.getElementById('nome-time1').innerText = nome1;
    document.getElementById('nome-time2').innerText = nome2;
    document.getElementById('display-meta').innerText = "Meta: " + maxPontos;

    // Destaque para quem está ganhando
    document.getElementById('card-time1').classList.remove('winning');
    document.getElementById('card-time2').classList.remove('winning');
    
    if (score1 > score2) document.getElementById('card-time1').classList.add('winning');
    if (score2 > score1) document.getElementById('card-time2').classList.add('winning');
}

function vitoria(vencedor) {
    startConfetti();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 500]);
    setTimeout(() => {
        alert(vencedor.toUpperCase() + " VENCERAM!");
        stopConfetti();
    }, 1000);
}

function encerrarJogo() {
    if(confirm("Sair do jogo atual?")) {
        jogoAtivo = false;
        historico = [];
        localStorage.removeItem('truco_pro_estado');
        location.reload();
    }
}

// Persistência
function salvarTudo() {
    const estado = { ativo: jogoAtivo, n1: nome1, n2: nome2, max: maxPontos, s1: score1, s2: score2, hist: historico };
    localStorage.setItem('truco_pro_estado', JSON.stringify(estado));
}

function carregarEstado() {
    const salvo = JSON.parse(localStorage.getItem('truco_pro_estado'));
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

// --- Confetes (Script Embutido Leve) ---
let confettiCtx;
let confettiActive = false;
const particles = [];

function startConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    confettiCtx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    confettiActive = true;
    
    for(let i=0; i<100; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            size: Math.random() * 10 + 5,
            speed: Math.random() * 5 + 2
        });
    }
    animateConfetti();
}

function animateConfetti() {
    if(!confettiActive) return;
    confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight);
    particles.forEach(p => {
        p.y += p.speed;
        if(p.y > window.innerHeight) p.y = -10;
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(p.x, p.y, p.size, p.size);
    });
    requestAnimationFrame(animateConfetti);
}

function stopConfetti() {
    confettiActive = false;
    if(confettiCtx) confettiCtx.clearRect(0,0, window.innerWidth, window.innerHeight);
}