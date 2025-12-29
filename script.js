// Variáveis Globais
let jogoAtivo = false;
let nome1 = "Nós";
let nome2 = "Eles";
let maxPontos = 12;
let score1 = 0;
let score2 = 0;

// Ao carregar a página
window.onload = function() {
    carregarEstado();
};

function carregarEstado() {
    // Verifica se existe um jogo em andamento salvo
    const salvo = localStorage.getItem('truco_estado');
    
    if (salvo) {
        const dados = JSON.parse(salvo);
        jogoAtivo = dados.jogoAtivo;
        
        if (jogoAtivo) {
            // Recupera dados
            nome1 = dados.nome1;
            nome2 = dados.nome2;
            maxPontos = dados.maxPontos;
            score1 = dados.score1;
            score2 = dados.score2;
            
            // Vai direto para o jogo
            mostrarTelaJogo();
        } else {
            mostrarTelaSetup();
        }
    } else {
        mostrarTelaSetup();
    }
}

function iniciarJogo() {
    // Pega os valores dos inputs
    const n1 = document.getElementById('input-time1').value.trim();
    const n2 = document.getElementById('input-time2').value.trim();
    const max = parseInt(document.getElementById('input-max').value);

    // Validação simples
    if (max < 1) {
        alert("A pontuação máxima deve ser pelo menos 1.");
        return;
    }

    // Define valores (ou usa padrão se vazio)
    nome1 = n1 || "Time 1";
    nome2 = n2 || "Time 2";
    maxPontos = max;
    score1 = 0;
    score2 = 0;
    jogoAtivo = true;

    salvarTudo();
    mostrarTelaJogo();
}

function mostrarTelaSetup() {
    document.getElementById('setup-screen').classList.remove('hidden');
    document.getElementById('game-screen').classList.add('hidden');
}

function mostrarTelaJogo() {
    // Atualiza textos na tela
    document.getElementById('nome-time1').innerText = nome1;
    document.getElementById('nome-time2').innerText = nome2;
    document.getElementById('display-meta').innerText = "Meta: " + maxPontos;
    atualizarPlacarVisual();

    // Troca telas
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

function mudarPontos(time, qtd) {
    if (time === 1) {
        score1 += qtd;
        if (score1 < 0) score1 = 0;
        if (score1 >= maxPontos) {
            score1 = maxPontos;
            setTimeout(() => vitoria(nome1), 100);
        }
    } else {
        score2 += qtd;
        if (score2 < 0) score2 = 0;
        if (score2 >= maxPontos) {
            score2 = maxPontos;
            setTimeout(() => vitoria(nome2), 100);
        }
    }
    salvarTudo();
    atualizarPlacarVisual();
}

function atualizarPlacarVisual() {
    document.getElementById('score-time1').innerText = score1;
    document.getElementById('score-time2').innerText = score2;
}

function salvarTudo() {
    const estado = {
        jogoAtivo: jogoAtivo,
        nome1: nome1,
        nome2: nome2,
        maxPontos: maxPontos,
        score1: score1,
        score2: score2
    };
    localStorage.setItem('truco_estado', JSON.stringify(estado));
}

function vitoria(vencedor) {
    alert(vencedor.toUpperCase() + " GANHARAM A PARTIDA!");
    if(confirm("Deseja iniciar um novo jogo com as mesmas configurações?")) {
        score1 = 0;
        score2 = 0;
        salvarTudo();
        atualizarPlacarVisual();
    } else {
        encerrarJogo();
    }
}

function encerrarJogo() {
    if(confirm("Deseja realmente sair e configurar um novo jogo?")) {
        jogoAtivo = false;
        // Limpa o estado para forçar a tela de setup no próximo load
        localStorage.removeItem('truco_estado');
        // Recarrega a página para voltar limpo
        location.reload(); 
    }
}