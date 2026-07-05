const STORAGE_KEY = 'marcador_truco_v_final_fixed_ui';
const HIST_KEY = 'marcador_historico_data';
const MAX_HISTORY = 50;
const MAX_FODINHA_PLAYERS = 12;

const TRUCO_POINT_PRESETS = {
    envido: { category: 'Envido', label: 'Envido', points: 2 },
    realEnvido: { category: 'Envido', label: 'Real envido', points: 3 },
    faltaEnvido: { category: 'Envido', label: 'Falta envido', dynamic: 'falta' },
    envidoNaoQuerido: { category: 'Envido', label: 'Envido não querido', points: 1 },
    flor: { category: 'Flor', label: 'Flor', points: 3 },
    contraFlor: { category: 'Flor', label: 'Contra flor', points: 6 },
    contraFlorResto: { category: 'Flor', label: 'Contra flor ao resto', dynamic: 'falta' },
    florNaoQuerida: { category: 'Flor', label: 'Flor não querida', points: 3 },
    mao: { category: 'Truco', label: 'Mão', points: 1 },
    truco: { category: 'Truco', label: 'Truco', points: 2 },
    retruco: { category: 'Truco', label: 'Retruco', points: 3 },
    valeQuatro: { category: 'Truco', label: 'Vale quatro', points: 4 },
    trucoNaoQuerido: { category: 'Truco', label: 'Truco não querido', points: 1 },
    retrucoNaoQuerido: { category: 'Truco', label: 'Retruco não querido', points: 2 },
    valeQuatroNaoQuerido: { category: 'Truco', label: 'Vale quatro não querido', points: 3 },
    ajusteMais: { category: 'Ajuste', label: 'Ajuste manual', points: 1 },
    ajusteMenos: { category: 'Ajuste', label: 'Correção manual', points: -1 }
};

let gameState = estadoPadrao();

let touchStartY = 0;
let isSwiping = false;
let lastInteraction = 0;
let confettiCtx = null;
let confettiAnim = null;
let confettiAtivo = false;
let confettiParticles = [];

window.addEventListener('DOMContentLoaded', () => {
    carregarEstado();
    configurarModal();
    configurarInputsPersistentes();
    configurarAcessibilidadePlacar();
    registrarServiceWorker();

    if (gameState.ativo) {
        if (gameState.mode === 'truco') {
            mostrarTela('game-screen-truco');
            atualizarTelaTruco();
        } else {
            mostrarTela('game-screen-fodinha');
            renderGameFodinha();
        }
    } else {
        mostrarTela('setup-screen');
        renderSetupFodinha();
        sincronizarInterfaceComEstado();
    }
});

window.addEventListener('resize', () => {
    if (confettiAtivo) prepararConfettiCanvas();
});

function estadoPadrao() {
    return {
        mode: 'truco',
        ativo: false,
        matchSaved: false,
        savedMatchId: null,
        truco: {
            n1: '',
            n2: '',
            max: 12,
            scoreMode: 'simple',
            s1: 0,
            s2: 0,
            selectedTeam: 1,
            roundNumber: 1,
            rounds: []
        },
        fodinha: {
            maxVidas: 5,
            players: [
                { name: '', score: 0 },
                { name: '', score: 0 }
            ]
        },
        log: []
    };
}

function normalizarEstado(saved) {
    const base = estadoPadrao();
    if (!saved || typeof saved !== 'object') return base;

    const players = Array.isArray(saved.fodinha?.players)
        ? saved.fodinha.players
            .map(p => ({
                name: typeof p?.name === 'string' ? p.name : '',
                score: clamp(parseInt(p?.score, 10) || 0, 0, 99)
            }))
            .slice(0, MAX_FODINHA_PLAYERS)
        : base.fodinha.players;

    while (players.length < 2) players.push({ name: '', score: 0 });

    const trucoMax = [12, 24, 30].includes(parseInt(saved.truco?.max, 10)) ? parseInt(saved.truco.max, 10) : 12;
    const trucoRounds = normalizarRodadasTruco(saved.truco?.rounds);
    const scoreFromRounds = calcularScoreRodadas(trucoRounds, trucoMax);
    const hasRoundEvents = trucoRounds.some(round => round.events.length > 0);
    const savedScoreMode = ['simple', 'complete'].includes(saved.truco?.scoreMode)
        ? saved.truco.scoreMode
        : (hasRoundEvents ? 'complete' : 'simple');

    return {
        ...base,
        ...saved,
        mode: saved.mode === 'fodinha' ? 'fodinha' : 'truco',
        ativo: Boolean(saved.ativo),
        matchSaved: Boolean(saved.matchSaved),
        savedMatchId: saved.savedMatchId || null,
        truco: {
            ...base.truco,
            ...(saved.truco || {}),
            max: trucoMax,
            scoreMode: savedScoreMode,
            s1: hasRoundEvents ? scoreFromRounds.s1 : clamp(parseInt(saved.truco?.s1, 10) || 0, 0, trucoMax),
            s2: hasRoundEvents ? scoreFromRounds.s2 : clamp(parseInt(saved.truco?.s2, 10) || 0, 0, trucoMax),
            selectedTeam: saved.truco?.selectedTeam === 2 ? 2 : 1,
            roundNumber: obterNumeroMaoAtual(trucoRounds),
            rounds: trucoRounds
        },
        fodinha: {
            ...base.fodinha,
            ...(saved.fodinha || {}),
            maxVidas: clamp(parseInt(saved.fodinha?.maxVidas, 10) || 5, 1, 99),
            players
        },
        log: Array.isArray(saved.log) && saved.log.length > 0
            ? saved.log
            : reconstruirLogRodadas(trucoRounds, trucoMax)
    };
}

function normalizarRodadasTruco(rounds) {
    if (!Array.isArray(rounds) || rounds.length === 0) {
        return [criarMaoTruco(1, { s1: 0, s2: 0 })];
    }

    const normalized = rounds
        .map((round, index) => {
            const number = parseInt(round?.number, 10) || index + 1;
            const events = Array.isArray(round?.events)
                ? round.events.map(event => normalizarEventoTruco(event, number)).filter(Boolean)
                : [];

            return {
                id: round?.id || criarIdTruco(),
                number,
                openedAt: round?.openedAt || Date.now(),
                start: {
                    s1: clamp(parseInt(round?.start?.s1, 10) || 0, 0, 30),
                    s2: clamp(parseInt(round?.start?.s2, 10) || 0, 0, 30)
                },
                events
            };
        })
        .sort((a, b) => a.number - b.number);

    return normalized.length > 0 ? normalized : [criarMaoTruco(1, { s1: 0, s2: 0 })];
}

function normalizarEventoTruco(event, roundNumber) {
    if (!event || typeof event !== 'object') return null;
    const points = parseInt(event.points, 10);
    if (!Number.isFinite(points) || points === 0) return null;

    return {
        id: event.id || criarIdTruco(),
        roundNumber,
        team: event.team === 2 ? 2 : 1,
        category: event.category || 'Ajuste',
        label: event.label || 'Pontuação',
        points,
        basePoints: parseInt(event.basePoints, 10) || points,
        dynamic: Boolean(event.dynamic),
        createdAt: event.createdAt || Date.now(),
        score: {
            s1: clamp(parseInt(event.score?.s1, 10) || 0, 0, 30),
            s2: clamp(parseInt(event.score?.s2, 10) || 0, 0, 30)
        }
    };
}

function calcularScoreRodadas(rounds, maxPontos) {
    return rounds.reduce((score, round) => {
        round.events.forEach(event => {
            if (event.team === 1) score.s1 = clamp(score.s1 + event.points, 0, maxPontos);
            if (event.team === 2) score.s2 = clamp(score.s2 + event.points, 0, maxPontos);
        });
        return score;
    }, { s1: 0, s2: 0 });
}

function reconstruirLogRodadas(rounds, maxPontos) {
    const log = [{ t: Date.now(), s1: 0, s2: 0 }];
    const score = { s1: 0, s2: 0 };

    rounds.forEach(round => {
        round.events.forEach(event => {
            if (event.team === 1) score.s1 = clamp(score.s1 + event.points, 0, maxPontos);
            if (event.team === 2) score.s2 = clamp(score.s2 + event.points, 0, maxPontos);
            log.push({ t: event.createdAt || Date.now(), s1: score.s1, s2: score.s2 });
        });
    });

    return log;
}

function obterNumeroMaoAtual(rounds) {
    return rounds.length > 0 ? rounds[rounds.length - 1].number : 1;
}

function criarIdTruco() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function criarMaoTruco(number, start) {
    return {
        id: criarIdTruco(),
        number,
        openedAt: Date.now(),
        start: {
            s1: start?.s1 || 0,
            s2: start?.s2 || 0
        },
        events: []
    };
}

function resetarRodadasTruco() {
    gameState.truco.roundNumber = 1;
    gameState.truco.rounds = [criarMaoTruco(1, { s1: gameState.truco.s1, s2: gameState.truco.s2 })];
}

function obterMaoAtual() {
    if (!Array.isArray(gameState.truco.rounds) || gameState.truco.rounds.length === 0) {
        resetarRodadasTruco();
    }

    return gameState.truco.rounds[gameState.truco.rounds.length - 1];
}

function mudarModo(modo, btn) {
    if (!['truco', 'fodinha'].includes(modo)) return;
    gameState.mode = modo;
    atualizarVisualSeletor(btn);
    alternarPaineisSetup(modo);
    salvarEstado();
}

function atualizarVisualSeletor(btn) {
    if (!btn) return;
    const container = btn.closest('.segmented-control');
    if (!container) return;

    const buttons = [...container.querySelectorAll('.segment-opt')];
    buttons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const glider = container.querySelector('.segment-glider');
    const index = buttons.indexOf(btn);
    if (glider && index >= 0) {
        glider.style.transform = `translateX(${index * 100}%)`;
    }
}

function alternarPaineisSetup(modo) {
    const setupTruco = document.getElementById('setup-truco');
    const setupFodinha = document.getElementById('setup-fodinha');

    if (setupTruco) setupTruco.classList.toggle('hidden', modo !== 'truco');
    if (setupFodinha) setupFodinha.classList.toggle('hidden', modo !== 'fodinha');
}

function sincronizarInterfaceComEstado() {
    const btnModo = document.querySelector(`.mode-selector button[onclick*="'${gameState.mode}'"]`);
    if (btnModo) atualizarVisualSeletor(btnModo);
    alternarPaineisSetup(gameState.mode);

    const inputTime1 = document.getElementById('input-time1');
    const inputTime2 = document.getElementById('input-time2');
    const inputMax = document.getElementById('input-max');
    const scoreModeInput = document.getElementById('input-truco-score-mode');
    const vidasInput = document.getElementById('input-vidas-max');

    if (inputTime1) inputTime1.value = gameState.truco.n1 || '';
    if (inputTime2) inputTime2.value = gameState.truco.n2 || '';
    if (inputMax) inputMax.value = gameState.truco.max;
    if (scoreModeInput) scoreModeInput.value = gameState.truco.scoreMode || 'simple';
    if (vidasInput) vidasInput.value = gameState.fodinha.maxVidas;

    const pontosBtns = document.querySelectorAll('#setup-truco .points-selector .segment-opt');
    pontosBtns.forEach(btn => {
        if (parseInt(btn.textContent, 10) === gameState.truco.max) {
            atualizarVisualSeletor(btn);
        }
    });

    const scoreModeBtn = document.querySelector(`.truco-score-mode-selector button[onclick*="'${gameState.truco.scoreMode || 'simple'}'"]`);
    if (scoreModeBtn) atualizarVisualSeletor(scoreModeBtn);
}

function mostrarTela(id) {
    const screens = document.querySelectorAll('.screen');
    const newScreen = document.getElementById(id);
    if (!newScreen) return;

    const currentScreen = [...screens].find(s => s.classList.contains('active'));
    if (currentScreen && currentScreen.id === id) return;

    newScreen.classList.remove('hidden', 'exit');
    void newScreen.offsetWidth;
    newScreen.classList.add('active');

    if (currentScreen) {
        currentScreen.classList.remove('active');
        currentScreen.classList.add('exit');
        setTimeout(() => {
            currentScreen.classList.add('hidden');
            currentScreen.classList.remove('exit');
        }, 230);
    } else {
        screens.forEach(s => {
            if (s !== newScreen) s.classList.add('hidden');
        });
    }
}

function selPonto(valor, btn) {
    gameState.truco.max = valor;
    const inputMax = document.getElementById('input-max');
    if (inputMax) inputMax.value = valor;
    atualizarVisualSeletor(btn);
    salvarEstado();
}

function selTrucoScoreMode(mode, btn) {
    if (!['simple', 'complete'].includes(mode)) return;
    gameState.truco.scoreMode = mode;

    const input = document.getElementById('input-truco-score-mode');
    if (input) input.value = mode;

    atualizarVisualSeletor(btn);
    salvarEstado();
}

function renderSetupFodinha() {
    const container = document.getElementById('players-container');
    if (!container) return;

    container.replaceChildren();

    gameState.fodinha.players.forEach((player, index) => {
        const canRemove = gameState.fodinha.players.length > 2;
        const card = document.createElement('div');
        card.className = `player-input-card anim-slide-up${canRemove ? '' : ' no-remove'}`;

        const badge = document.createElement('span');
        badge.className = 'player-index';
        badge.textContent = index + 1;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = player.name || '';
        input.placeholder = 'Nome do jogador';
        input.autocomplete = 'off';
        input.addEventListener('input', () => atualizarNomeFodinha(index, input.value));

        card.append(badge, input);

        if (canRemove) {
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'btn-remove-mini';
            remove.textContent = '×';
            remove.setAttribute('aria-label', `Remover jogador ${index + 1}`);
            remove.addEventListener('click', () => removerJogador(index));
            card.appendChild(remove);
        }

        container.appendChild(card);
    });
}

function atualizarNomeFodinha(idx, val) {
    if (!gameState.fodinha.players[idx]) return;
    gameState.fodinha.players[idx].name = val;
    salvarEstado();
}

function addFodinhaPlayer() {
    if (gameState.fodinha.players.length >= MAX_FODINHA_PLAYERS) {
        abrirModal('Limite de jogadores', `Você pode adicionar até ${MAX_FODINHA_PLAYERS} jogadores.`, 'OK', null, {
            hideCancel: true
        });
        return;
    }

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

function iniciarJogo() {
    stopConfetti();
    gameState.ativo = true;
    gameState.matchSaved = false;
    gameState.savedMatchId = null;
    gameState.log = [];

    if (gameState.mode === 'truco') {
        gameState.truco.n1 = inputVal('input-time1');
        gameState.truco.n2 = inputVal('input-time2');
        gameState.truco.scoreMode = inputVal('input-truco-score-mode') === 'complete' ? 'complete' : 'simple';
        gameState.truco.max = clamp(parseInt(inputVal('input-max'), 10) || gameState.truco.max || 12, 12, 30);
        if (![12, 24, 30].includes(gameState.truco.max)) gameState.truco.max = 12;
        gameState.truco.s1 = 0;
        gameState.truco.s2 = 0;
        gameState.truco.selectedTeam = 1;
        resetarRodadasTruco();
        registrarSnapshotTruco();

        atualizarTelaTruco();
        mostrarTela('game-screen-truco');
    } else {
        gameState.fodinha.maxVidas = clamp(parseInt(inputVal('input-vidas-max'), 10) || 5, 1, 99);
        gameState.fodinha.players = gameState.fodinha.players.map(player => ({
            name: (player.name || '').trim(),
            score: 0
        }));

        renderGameFodinha();
        mostrarTela('game-screen-fodinha');
    }

    salvarEstado();
}

function mudarPontos(time, delta) {
    const isSimple = gameState.truco.scoreMode !== 'complete';
    const preset = isSimple
        ? {
            category: 'Simples',
            label: delta === 3 ? 'Três pontos' : (delta > 0 ? 'Ponto simples' : 'Correção simples'),
            points: delta
        }
        : (delta >= 0
            ? { category: 'Ajuste', label: 'Ajuste manual', points: delta }
            : { category: 'Ajuste', label: 'Correção manual', points: delta });
    registrarEventoTrucoCustom(time, preset);
}

function pontuarTap(time) {
    mudarPontos(time, 1);
}

function setupGestos() {}

function criarGesto() {}

function selecionarTimePontuacao(time, btn) {
    if (![1, 2].includes(time)) return;
    gameState.truco.selectedTeam = time;

    const buttons = [
        document.getElementById('point-team-1'),
        document.getElementById('point-team-2')
    ].filter(Boolean);

    buttons.forEach(button => button.classList.remove('active'));
    const target = btn || document.getElementById(`point-team-${time}`);
    if (target) target.classList.add('active');

    atualizarValoresAutomaticosTruco();
    salvarEstado();
}

function registrarEventoTruco(tipo) {
    const preset = TRUCO_POINT_PRESETS[tipo];
    if (!preset) return;
    registrarEventoTrucoCustom(gameState.truco.selectedTeam || 1, preset);
}

function registrarEventoTrucoCustom(time, preset) {
    if (!gameState.ativo || gameState.mode !== 'truco') return;
    if (gameState.matchSaved) {
        abrirModal('Partida encerrada', 'Use desfazer para corrigir o último lançamento ou inicie uma nova partida.', 'OK', null, {
            hideCancel: true
        });
        return;
    }

    const truco = gameState.truco;
    const basePoints = preset.dynamic === 'falta' ? calcularFaltaEnvido(time) : preset.points;
    const scoreAtual = time === 1 ? truco.s1 : truco.s2;
    const novoScore = clamp(scoreAtual + basePoints, 0, truco.max);
    const pontosAplicados = novoScore - scoreAtual;

    if (pontosAplicados === 0) return;

    const round = obterMaoAtual();
    round.events.push({
        id: criarIdTruco(),
        roundNumber: round.number,
        team: time,
        category: preset.category,
        label: preset.label,
        points: pontosAplicados,
        basePoints,
        dynamic: preset.dynamic === 'falta',
        createdAt: Date.now(),
        score: { s1: truco.s1, s2: truco.s2 }
    });

    recalcularTrucoPorEventos();
    const vencedor = obterVencedorTruco();
    atualizarTelaTruco();
    salvarEstado();

    if (vencedor) {
        startConfetti();
        vibrar([80, 40, 80]);
        registrarVitoria(vencedor.nome, `${truco.s1} x ${truco.s2}`, 'truco');
    } else {
        stopConfetti();
    }
}

function alterarPonto(time, delta) {
    mudarPontos(time, delta);
}

function novaMaoTruco() {
    if (!gameState.ativo || gameState.mode !== 'truco') return;
    if (obterVencedorTruco()) return;

    const round = obterMaoAtual();
    if (round.events.length === 0) return;

    const nextNumber = round.number + 1;
    gameState.truco.roundNumber = nextNumber;
    gameState.truco.rounds.push(criarMaoTruco(nextNumber, {
        s1: gameState.truco.s1,
        s2: gameState.truco.s2
    }));

    atualizarTelaTruco();
    salvarEstado();
}

function desfazerUltimoPonto() {
    if (gameState.mode !== 'truco') return;

    removerResultadoAtualSePendente();
    const removed = removerUltimoEventoTruco();
    if (!removed) return;

    recalcularTrucoPorEventos();

    atualizarTelaTruco();
    stopConfetti();
    salvarEstado();
}

function removerUltimoEventoTruco() {
    if (!Array.isArray(gameState.truco.rounds)) return null;

    for (let i = gameState.truco.rounds.length - 1; i >= 0; i--) {
        const round = gameState.truco.rounds[i];
        if (round.events.length > 0) {
            return round.events.pop();
        }

        if (i > 0 && round.events.length === 0) {
            gameState.truco.rounds.splice(i, 1);
        }
    }

    return null;
}

function recalcularTrucoPorEventos() {
    const truco = gameState.truco;
    const score = { s1: 0, s2: 0 };
    gameState.log = [{ t: Date.now(), s1: 0, s2: 0 }];

    if (!Array.isArray(truco.rounds) || truco.rounds.length === 0) {
        resetarRodadasTruco();
    }

    truco.rounds.forEach(round => {
        round.start = { s1: score.s1, s2: score.s2 };
        round.events.forEach(event => {
            if (event.team === 1) score.s1 = clamp(score.s1 + event.points, 0, truco.max);
            if (event.team === 2) score.s2 = clamp(score.s2 + event.points, 0, truco.max);
            event.score = { s1: score.s1, s2: score.s2 };
            gameState.log.push({ t: event.createdAt || Date.now(), s1: score.s1, s2: score.s2 });
        });
    });

    truco.s1 = score.s1;
    truco.s2 = score.s2;
    truco.roundNumber = obterMaoAtual().number;
}

function registrarSnapshotTruco() {
    if (!Array.isArray(gameState.log)) gameState.log = [];
    const ultimo = gameState.log[gameState.log.length - 1];
    const snapshot = {
        t: Date.now(),
        s1: gameState.truco.s1,
        s2: gameState.truco.s2
    };

    if (!ultimo || ultimo.s1 !== snapshot.s1 || ultimo.s2 !== snapshot.s2) {
        gameState.log.push(snapshot);
    }
}

function obterVencedorTruco() {
    const truco = gameState.truco;
    if (truco.s1 >= truco.max) return { nome: truco.n1 || 'NÓS', time: 1 };
    if (truco.s2 >= truco.max) return { nome: truco.n2 || 'ELES', time: 2 };
    return null;
}

function calcularFaltaEnvido(time) {
    const score = time === 1 ? gameState.truco.s1 : gameState.truco.s2;
    return Math.max(1, gameState.truco.max - score);
}

function obterNomeTime(time) {
    if (time === 1) return gameState.truco.n1 || 'NÓS';
    return gameState.truco.n2 || 'ELES';
}

function atualizarTelaTruco() {
    atualizarNumeroComAnimacao(document.getElementById('score-time1'), gameState.truco.s1);
    atualizarNumeroComAnimacao(document.getElementById('score-time2'), gameState.truco.s2);
    atualizarNumeroComAnimacao(document.getElementById('simple-score-time1'), gameState.truco.s1);
    atualizarNumeroComAnimacao(document.getElementById('simple-score-time2'), gameState.truco.s2);

    const n1 = document.getElementById('nome-time1');
    const n2 = document.getElementById('nome-time2');
    const simpleN1 = document.getElementById('simple-nome-time1');
    const simpleN2 = document.getElementById('simple-nome-time2');
    const meta = document.getElementById('display-meta');
    const c1 = document.getElementById('card-time1');
    const c2 = document.getElementById('card-time2');
    const simpleC1 = document.getElementById('simple-card-time1');
    const simpleC2 = document.getElementById('simple-card-time2');

    if (n1) n1.textContent = gameState.truco.n1 || 'NÓS';
    if (n2) n2.textContent = gameState.truco.n2 || 'ELES';
    if (simpleN1) simpleN1.textContent = gameState.truco.n1 || 'NÓS';
    if (simpleN2) simpleN2.textContent = gameState.truco.n2 || 'ELES';
    if (meta) meta.textContent = gameState.truco.max;
    if (c1) c1.classList.toggle('winning', gameState.truco.s1 >= gameState.truco.max);
    if (c2) c2.classList.toggle('winning', gameState.truco.s2 >= gameState.truco.max);
    if (simpleC1) simpleC1.classList.toggle('winning', gameState.truco.s1 >= gameState.truco.max);
    if (simpleC2) simpleC2.classList.toggle('winning', gameState.truco.s2 >= gameState.truco.max);

    const roundDisplay = document.getElementById('display-round');
    if (roundDisplay) roundDisplay.textContent = obterMaoAtual().number;

    atualizarModoTelaTruco();
    selecionarTimePontuacao(gameState.truco.selectedTeam || 1);
    renderTrucoRoundLog();
    renderTrucoSourceSummary();
    atualizarValoresAutomaticosTruco();
}

function atualizarModoTelaTruco() {
    const simplePanel = document.getElementById('truco-simple-panel');
    const completePanel = document.getElementById('truco-complete-panel');
    const isComplete = gameState.truco.scoreMode === 'complete';

    if (simplePanel) simplePanel.classList.toggle('hidden', isComplete);
    if (completePanel) completePanel.classList.toggle('hidden', !isComplete);
}

function atualizarValoresAutomaticosTruco() {
    const falta = calcularFaltaEnvido(gameState.truco.selectedTeam || 1);
    const faltaEl = document.getElementById('falta-envido-value');
    const contraFlorEl = document.getElementById('contra-flor-resto-value');

    if (faltaEl) faltaEl.textContent = formatarPontos(falta);
    if (contraFlorEl) contraFlorEl.textContent = formatarPontos(falta);

    const team1 = document.getElementById('point-team-1');
    const team2 = document.getElementById('point-team-2');
    if (team1) team1.textContent = gameState.truco.n1 || 'Nós';
    if (team2) team2.textContent = gameState.truco.n2 || 'Eles';
}

function renderTrucoRoundLog() {
    const container = document.getElementById('truco-round-log');
    if (!container) return;

    const round = obterMaoAtual();
    if (!round.events.length) {
        container.innerHTML = `
            <div class="empty-inline">
                <strong>Mão ${round.number} sem pontos</strong>
                <span>Escolha a dupla e lance Envido, Flor ou Truco.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = [...round.events].reverse().map(event => `
        <article class="round-event">
            <div>
                <strong>${escapeHtml(event.label)}</strong>
                <span>${escapeHtml(event.category)} · ${escapeHtml(obterNomeTime(event.team))}</span>
            </div>
            <div class="event-score">
                <strong>${formatarPontos(event.points)}</strong>
                <span>${event.score.s1} x ${event.score.s2}</span>
            </div>
        </article>
    `).join('');
}

function renderTrucoSourceSummary() {
    const container = document.getElementById('truco-source-summary');
    if (!container) return;

    const totals = obterResumoTrucoPorCategoria();
    if (!totals.length) {
        container.innerHTML = `
            <div class="empty-inline">
                <strong>Ainda sem origem registrada</strong>
                <span>Os totais por Envido, Flor e Truco aparecem aqui.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        ${totals.map(item => `
            <div class="summary-row">
                <span>${escapeHtml(item.category)}</span>
                <strong>${item.team1} x ${item.team2}</strong>
            </div>
        `).join('')}
    `;
}

function obterResumoTrucoPorCategoria(rounds = gameState.truco.rounds) {
    const order = ['Simples', 'Envido', 'Flor', 'Truco', 'Ajuste'];
    const totals = new Map(order.map(category => [category, { category, team1: 0, team2: 0 }]));

    (rounds || []).forEach(round => {
        (round.events || []).forEach(event => {
            if (!totals.has(event.category)) {
                totals.set(event.category, { category: event.category, team1: 0, team2: 0 });
            }

            const total = totals.get(event.category);
            if (event.team === 1) total.team1 += event.points;
            if (event.team === 2) total.team2 += event.points;
        });
    });

    return [...totals.values()]
        .filter(item => item.team1 !== 0 || item.team2 !== 0)
        .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));
}

function contarMaosComPontos(rounds = []) {
    return rounds.filter(round => Array.isArray(round.events) && round.events.length > 0).length || 1;
}

function clonarRodadasTruco(rounds = []) {
    return rounds.map(round => ({
        id: round.id,
        number: round.number,
        openedAt: round.openedAt,
        start: { ...round.start },
        events: round.events.map(event => ({
            id: event.id,
            roundNumber: event.roundNumber,
            team: event.team,
            category: event.category,
            label: event.label,
            points: event.points,
            basePoints: event.basePoints,
            dynamic: event.dynamic,
            createdAt: event.createdAt,
            score: { ...event.score }
        }))
    }));
}

function formatarPontos(points) {
    return points > 0 ? `+${points}` : `${points}`;
}

function renderGameFodinha() {
    const grid = document.getElementById('fodinha-game-grid');
    if (!grid) return;

    const maxVidas = gameState.fodinha.maxVidas;
    const vivos = gameState.fodinha.players.filter(p => p.score < maxVidas);
    const temVencedor = vivos.length === 1 && gameState.fodinha.players.length > 1;

    if (!temVencedor) {
        removerResultadoAtualSePendente();
        stopConfetti();
    }

    const displayMax = document.getElementById('display-fodinha-max');
    if (displayMax) displayMax.textContent = maxVidas;

    grid.replaceChildren();

    gameState.fodinha.players.forEach((player, index) => {
        const eliminado = player.score >= maxVidas;
        const vencedor = temVencedor && !eliminado;
        const vidasRestantes = Math.max(0, maxVidas - player.score);
        const percentualRestante = maxVidas > 0 ? (vidasRestantes / maxVidas) * 100 : 0;

        const card = document.createElement('article');
        card.className = `fodinha-card${eliminado ? ' eliminated' : ''}${vencedor ? ' winner' : ''}`;

        const nameRow = document.createElement('div');
        nameRow.className = 'fodinha-name-row';

        const name = document.createElement('span');
        name.className = 'fodinha-name';
        name.textContent = player.name || `Jogador ${index + 1}`;

        const status = document.createElement('span');
        status.className = 'fodinha-status';
        status.textContent = vencedor ? 'Venceu' : (eliminado ? 'Fora' : `${vidasRestantes} vidas`);

        const score = document.createElement('output');
        score.className = 'fodinha-score';
        score.textContent = player.score;

        const meter = document.createElement('div');
        meter.className = 'life-meter';

        const meterFill = document.createElement('div');
        meterFill.className = 'life-meter-fill';
        meterFill.style.width = `${percentualRestante}%`;
        meter.appendChild(meterFill);

        const controls = document.createElement('div');
        controls.className = 'fodinha-controls';

        const minus = document.createElement('button');
        minus.type = 'button';
        minus.className = 'btn-fodinha-ctrl';
        minus.textContent = '−';
        minus.setAttribute('aria-label', `Remover vida perdida de ${name.textContent}`);
        minus.addEventListener('click', () => alterarVida(index, -1));

        const plus = document.createElement('button');
        plus.type = 'button';
        plus.className = 'btn-fodinha-ctrl btn-fodinha-plus';
        plus.textContent = '+';
        plus.setAttribute('aria-label', `Adicionar vida perdida para ${name.textContent}`);
        plus.addEventListener('click', () => alterarVida(index, 1));

        nameRow.append(name, status);
        controls.append(minus, plus);
        card.append(nameRow, score, meter, controls);
        grid.appendChild(card);
    });

    if (temVencedor) {
        startConfetti();
        vibrar([80, 40, 80]);
        const vencedor = vivos[0];
        registrarVitoria(vencedor.name || 'Jogador', 'Sobrevivente', 'fodinha');
    }
}

function alterarVida(index, delta) {
    if (!gameState.ativo || gameState.mode !== 'fodinha') return;

    const player = gameState.fodinha.players[index];
    if (!player) return;

    const antes = player.score;
    player.score = clamp(player.score + delta, 0, gameState.fodinha.maxVidas);
    if (antes === player.score) return;

    salvarEstado();
    renderGameFodinha();
}

function atualizarNumeroComAnimacao(el, novoValor) {
    if (!el) return;
    const valorAtual = parseInt(el.textContent, 10);
    if (valorAtual === novoValor) return;

    el.textContent = novoValor;
    el.classList.remove('anim-pop');
    void el.offsetWidth;
    el.classList.add('anim-pop');
}

function confirmarSaida() {
    abrirModal('Sair da partida', 'A partida atual será encerrada. O histórico salvo não será apagado.', 'Sair', resetarTudo, {
        destructive: true
    });
}

function confirmarZerar() {
    abrirModal('Zerar pontos', 'A contagem da partida atual voltará para zero.', 'Zerar', zerarPontuacaoAtual, {
        destructive: true
    });
}

function zerarPontuacaoAtual() {
    removerResultadoAtualSePendente();
    gameState.matchSaved = false;
    gameState.savedMatchId = null;

    if (gameState.mode === 'truco') {
        gameState.truco.s1 = 0;
        gameState.truco.s2 = 0;
        gameState.log = [];
        resetarRodadasTruco();
        registrarSnapshotTruco();
        atualizarTelaTruco();
    } else {
        gameState.fodinha.players.forEach(player => player.score = 0);
        renderGameFodinha();
    }

    stopConfetti();
    salvarEstado();
}

function resetarTudo() {
    gameState.ativo = false;
    gameState.matchSaved = false;
    gameState.savedMatchId = null;
    gameState.truco.s1 = 0;
    gameState.truco.s2 = 0;
    gameState.truco.roundNumber = 1;
    gameState.truco.rounds = [];
    gameState.fodinha.players.forEach(player => player.score = 0);
    gameState.log = [];

    stopConfetti();
    mostrarTela('setup-screen');
    renderSetupFodinha();
    sincronizarInterfaceComEstado();
    salvarEstado();
}

function registrarVitoria(vencedor, placar, modo) {
    if (gameState.matchSaved) return;

    const data = new Date();
    const partida = criarPartida(vencedor, placar, modo, data);
    const historico = carregarHistorico();

    historico.unshift(partida);
    if (historico.length > MAX_HISTORY) historico.length = MAX_HISTORY;
    localStorage.setItem(HIST_KEY, JSON.stringify(historico));

    gameState.matchSaved = true;
    gameState.savedMatchId = partida.id;
    salvarEstado();

    setTimeout(() => {
        verDetalhesPartida(partida.id, true);
    }, 650);
}

function criarPartida(vencedor, placar, modo, data) {
    if (modo === 'truco') {
        return {
            id: Date.now(),
            data: formatarData(data),
            dataISO: data.toISOString(),
            modo,
            vencedor,
            placar,
            meta: gameState.truco.max,
            scoreMode: gameState.truco.scoreMode || 'simple',
            detalhes: `${labelTrucoScoreMode(gameState.truco.scoreMode)} · Meta ${gameState.truco.max} · ${contarMaosComPontos(gameState.truco.rounds)} mãos`,
            jogadores: [
                { nome: gameState.truco.n1 || 'NÓS', pontos: gameState.truco.s1 },
                { nome: gameState.truco.n2 || 'ELES', pontos: gameState.truco.s2 }
            ],
            rodadas: clonarRodadasTruco(gameState.truco.rounds),
            resumo: obterResumoTrucoPorCategoria(),
            log: [...(gameState.log || [])]
        };
    }

    return {
        id: Date.now(),
        data: formatarData(data),
        dataISO: data.toISOString(),
        modo,
        vencedor,
        placar,
        meta: gameState.fodinha.maxVidas,
        detalhes: `${gameState.fodinha.players.length} jogadores · ${gameState.fodinha.maxVidas} vidas`,
        jogadores: gameState.fodinha.players.map((player, index) => ({
            nome: player.name || `Jogador ${index + 1}`,
            vidas_perdidas: player.score,
            vidas_restantes: Math.max(0, gameState.fodinha.maxVidas - player.score),
            status: player.score >= gameState.fodinha.maxVidas ? 'eliminado' : 'vencedor'
        })),
        log: []
    };
}

function abrirHistorico() {
    const listaEl = document.getElementById('history-list');
    if (!listaEl) return;

    const historico = carregarHistorico();
    mostrarTela('history-screen');

    if (historico.length === 0) {
        listaEl.innerHTML = `
            <div class="empty-state">
                <img src="logo-marcador.svg" alt="">
                <strong>Nenhuma partida salva</strong>
                <span>Os resultados aparecem aqui quando alguém vence.</span>
            </div>
        `;
        return;
    }

    listaEl.innerHTML = historico.map(partida => `
        <article class="history-card mode-${escapeHtml(partida.modo || 'truco')}" onclick="verDetalhesPartida(${Number(partida.id)})">
            <div class="history-meta">
                <span>${escapeHtml(labelModo(partida.modo))}</span>
                <span>${escapeHtml(partida.data || '')}</span>
            </div>
            <div class="history-result">
                <strong class="history-winner">${escapeHtml(partida.vencedor || 'Vencedor')}</strong>
                <span class="history-score">${escapeHtml(partida.placar || '')}</span>
            </div>
            <div class="history-detail">
                <span>${escapeHtml(partida.detalhes || '')}</span>
                <span>Ver detalhes</span>
            </div>
        </article>
    `).join('');
}

function fecharHistorico() {
    mostrarTela('setup-screen');
    sincronizarInterfaceComEstado();
}

function limparHistorico() {
    abrirModal('Apagar histórico', 'Todos os resultados salvos serão removidos.', 'Apagar', () => {
        localStorage.removeItem(HIST_KEY);
        gameState.matchSaved = false;
        gameState.savedMatchId = null;
        abrirHistorico();
        salvarEstado();
    }, {
        destructive: true
    });
}

function verDetalhesPartida(id, resultadoFinal = false) {
    const partida = carregarHistorico().find(item => Number(item.id) === Number(id));
    if (!partida) return;

    const html = montarHtmlPartida(partida);

    if (resultadoFinal) {
        abrirModalHtml('Resultado final', html, 'Nova partida', resetarTudo, {
            cancelText: 'Continuar'
        });
    } else {
        abrirModalHtml('Detalhes da partida', html, 'Fechar', null, {
            hideCancel: true
        });
    }

    requestAnimationFrame(() => desenharGraficoDaPartida(partida));
}

function montarHtmlPartida(partida) {
    const modo = labelModo(partida.modo);
    const vencedor = escapeHtml(partida.vencedor || 'Vencedor');
    const placar = escapeHtml(partida.placar || '');
    const subtitulo = `${escapeHtml(modo)} · ${escapeHtml(partida.data || '')}`;

    if (partida.modo === 'truco') {
        const rows = normalizarJogadoresTruco(partida).map(jogador => {
            const venceu = jogador.nome === partida.vencedor;
            return `
                <div class="detail-row${venceu ? ' winner' : ''}">
                    <span>${escapeHtml(jogador.nome)}</span>
                    <span>${escapeHtml(jogador.pontos)}</span>
                </div>
            `;
        }).join('');

        const chart = Array.isArray(partida.log) && partida.log.length > 1
            ? `<canvas class="result-chart" id="chart-${Number(partida.id)}"></canvas>`
            : '';

        return `
            <div class="result-hero">
                <span class="result-subtitle">${subtitulo}</span>
                <strong class="result-winner">${vencedor}</strong>
                <span class="result-score">${placar}</span>
            </div>
            <div class="detail-list">${rows}</div>
            ${montarHtmlResumoTruco(partida)}
            ${montarHtmlRodadasTruco(partida)}
            ${chart}
        `;
    }

    const rows = normalizarJogadoresFodinha(partida).map(jogador => {
        const venceu = jogador.status === 'vencedor';
        const status = venceu ? 'Venceu' : `${jogador.vidas_perdidas} perdidas`;
        return `
            <div class="detail-row${venceu ? ' winner' : ' eliminated'}">
                <span>${escapeHtml(jogador.nome)}</span>
                <span>${escapeHtml(status)}</span>
            </div>
        `;
    }).join('');

    return `
        <div class="result-hero">
            <span class="result-subtitle">${subtitulo}</span>
            <strong class="result-winner">${vencedor}</strong>
            <span class="result-score">${placar}</span>
        </div>
        <div class="detail-list">${rows}</div>
    `;
}

function montarHtmlResumoTruco(partida) {
    const resumo = Array.isArray(partida.resumo) && partida.resumo.length
        ? partida.resumo
        : obterResumoTrucoPorCategoria(partida.rodadas || []);

    if (!resumo.length) return '';

    return `
        <div class="result-section-title">Origem dos pontos</div>
        <div class="detail-list">
            ${resumo.map(item => `
                <div class="detail-row">
                    <span>${escapeHtml(item.category)}</span>
                    <span>${Number(item.team1) || 0} x ${Number(item.team2) || 0}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function montarHtmlRodadasTruco(partida) {
    const rounds = Array.isArray(partida.rodadas)
        ? partida.rodadas.filter(round => Array.isArray(round.events) && round.events.length > 0)
        : [];

    if (!rounds.length) return '';

    return `
        <div class="result-section-title">Mãos da partida</div>
        <div class="round-history-list">
            ${rounds.map(round => `
                <section class="round-history-item">
                    <strong>Mão ${escapeHtml(round.number)}</strong>
                    ${(round.events || []).map(event => `
                        <div class="round-history-event">
                            <span>${escapeHtml(event.label)} · ${escapeHtml(obterNomeTimePartida(partida, event.team))}</span>
                            <strong>${formatarPontos(Number(event.points) || 0)}</strong>
                        </div>
                    `).join('')}
                </section>
            `).join('')}
        </div>
    `;
}

function obterNomeTimePartida(partida, time) {
    if (Array.isArray(partida.jogadores) && partida.jogadores.length >= 2) {
        return partida.jogadores[time === 1 ? 0 : 1]?.nome || (time === 1 ? 'NÓS' : 'ELES');
    }

    return time === 1 ? 'NÓS' : 'ELES';
}

function normalizarJogadoresTruco(partida) {
    if (Array.isArray(partida.jogadores) && partida.jogadores.length >= 2) {
        return partida.jogadores.map((j, index) => ({
            nome: j.nome || (index === 0 ? 'NÓS' : 'ELES'),
            pontos: Number.isFinite(Number(j.pontos)) ? Number(j.pontos) : 0
        }));
    }

    const partes = String(partida.placar || '0 x 0').split('x').map(p => parseInt(p, 10) || 0);
    return [
        { nome: 'NÓS', pontos: partes[0] || 0 },
        { nome: 'ELES', pontos: partes[1] || 0 }
    ];
}

function normalizarJogadoresFodinha(partida) {
    if (!Array.isArray(partida.jogadores)) return [];

    return partida.jogadores.map((j, index) => ({
        nome: j.nome || `Jogador ${index + 1}`,
        vidas_perdidas: Number.isFinite(Number(j.vidas_perdidas)) ? Number(j.vidas_perdidas) : 0,
        status: j.status === 'vencedor' ? 'vencedor' : 'eliminado'
    }));
}

function desenharGraficoDaPartida(partida) {
    if (partida.modo !== 'truco' || !Array.isArray(partida.log) || partida.log.length < 2) return;
    const canvas = document.getElementById(`chart-${Number(partida.id)}`);
    if (!canvas) return;
    desenharGrafico(canvas, partida.log, obterMetaPartida(partida));
}

function desenharGrafico(canvas, log, maxPontos) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(280, rect.width || 320);
    const height = Math.max(150, rect.height || 170);
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue('--text-muted').trim() || '#6e6e73';
    const gridColor = styles.getPropertyValue('--separator-strong').trim() || 'rgba(60,60,67,.28)';
    const primaryLine = styles.getPropertyValue('--blue').trim() || '#c54848';
    const secondaryLine = styles.getPropertyValue('--chart-secondary').trim() || '#6e6e73';

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const padding = 24;
    const graphW = width - padding * 2;
    const graphH = height - padding * 2;

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 3; i++) {
        const y = padding + (graphH / 3) * i;
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
    }
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Nós', padding, 16);
    ctx.fillStyle = primaryLine;
    ctx.fillRect(padding + 28, 8, 16, 4);
    ctx.fillStyle = textColor;
    ctx.fillText('Eles', padding + 58, 16);
    ctx.fillStyle = secondaryLine;
    ctx.fillRect(padding + 92, 8, 16, 4);

    drawLine('s1', primaryLine);
    drawLine('s2', secondaryLine);

    function drawLine(key, color) {
        const xStep = graphW / Math.max(1, log.length - 1);
        const yScale = graphH / Math.max(1, maxPontos);

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        log.forEach((point, index) => {
            const x = padding + index * xStep;
            const y = height - padding - ((Number(point[key]) || 0) * yScale);
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.fillStyle = color;
        log.forEach((point, index) => {
            const x = padding + index * xStep;
            const y = height - padding - ((Number(point[key]) || 0) * yScale);
            ctx.beginPath();
            ctx.arc(x, y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

function abrirModal(titulo, mensagem, btnTxt = 'OK', callback = null, options = {}) {
    const html = `<p>${escapeHtml(mensagem).replace(/\n/g, '<br>')}</p>`;
    abrirModalHtml(titulo, html, btnTxt, callback, options);
}

function abrirModalHtml(titulo, html, btnTxt = 'OK', callback = null, options = {}) {
    const modal = document.getElementById('custom-modal');
    const titleEl = document.getElementById('modal-title');
    const msgEl = document.getElementById('modal-msg');
    const actions = modal?.querySelector('.modal-actions');
    const oldConfirm = document.getElementById('modal-btn-confirm');
    const oldCancel = document.getElementById('modal-btn-cancel');

    if (!modal || !titleEl || !msgEl || !actions || !oldConfirm || !oldCancel) return;

    const confirm = oldConfirm.cloneNode(true);
    const cancel = oldCancel.cloneNode(true);
    oldConfirm.replaceWith(confirm);
    oldCancel.replaceWith(cancel);

    titleEl.textContent = titulo;
    msgEl.innerHTML = html;

    confirm.textContent = btnTxt;
    confirm.className = `modal-btn primary${options.destructive ? ' destructive' : ''}`;
    confirm.onclick = () => {
        if (typeof callback === 'function') callback();
        fecharModal();
    };

    cancel.textContent = options.cancelText || 'Cancelar';
    cancel.onclick = fecharModal;
    cancel.classList.toggle('hidden', Boolean(options.hideCancel));
    actions.classList.toggle('single', Boolean(options.hideCancel));

    modal.classList.remove('hidden');
    void modal.offsetWidth;
    modal.classList.add('active');
}

function fecharModal() {
    const modal = document.getElementById('custom-modal');
    if (!modal) return;

    modal.classList.remove('active');
    setTimeout(() => modal.classList.add('hidden'), 190);
}

function removerResultadoAtualSePendente() {
    if (!gameState.matchSaved || !gameState.savedMatchId) return;
    removerHistoricoPorId(gameState.savedMatchId);
    gameState.matchSaved = false;
    gameState.savedMatchId = null;
}

function removerHistoricoPorId(id) {
    const historico = carregarHistorico().filter(item => Number(item.id) !== Number(id));
    localStorage.setItem(HIST_KEY, JSON.stringify(historico));
}

function carregarHistorico() {
    try {
        const historico = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
        return Array.isArray(historico) ? historico : [];
    } catch (e) {
        localStorage.removeItem(HIST_KEY);
        return [];
    }
}

function configurarModal() {
    const btnCancel = document.getElementById('modal-btn-cancel');
    if (btnCancel) btnCancel.onclick = fecharModal;

    window.addEventListener('keydown', e => {
        if (e.key === 'Escape') fecharModal();
    });
}

function configurarInputsPersistentes() {
    const time1 = document.getElementById('input-time1');
    const time2 = document.getElementById('input-time2');
    const vidas = document.getElementById('input-vidas-max');

    if (time1) {
        time1.addEventListener('input', () => {
            gameState.truco.n1 = time1.value;
            salvarEstado();
        });
    }

    if (time2) {
        time2.addEventListener('input', () => {
            gameState.truco.n2 = time2.value;
            salvarEstado();
        });
    }

    if (vidas) {
        vidas.addEventListener('input', () => {
            gameState.fodinha.maxVidas = clamp(parseInt(vidas.value, 10) || 5, 1, 99);
            salvarEstado();
        });
    }
}

function configurarAcessibilidadePlacar() {
    [
        ['card-time1', 1],
        ['card-time2', 2],
        ['simple-card-time1', 1],
        ['simple-card-time2', 2]
    ].forEach(([id, time]) => {
        const card = document.getElementById(id);
        if (!card || card.dataset.keyBound === '1') return;
        card.dataset.keyBound = '1';
        card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                pontuarTap(time);
            }
        });
    });
}

function registrarServiceWorker() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function inputVal(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
}

function salvarEstado() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.warn('Não foi possível salvar o estado.', e);
    }
}

function carregarEstado() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        gameState = normalizarEstado(saved);
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
        gameState = estadoPadrao();
    }
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    })[char]);
}

function formatarData(date) {
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function labelModo(modo) {
    return modo === 'fodinha' ? 'Fodinha' : 'Truco';
}

function labelTrucoScoreMode(mode) {
    return mode === 'complete' ? 'Completo' : 'Simples';
}

function obterMetaPartida(partida) {
    if (Number.isFinite(Number(partida.meta))) return Number(partida.meta);
    const match = String(partida.detalhes || '').match(/\d+/);
    return match ? Number(match[0]) : 12;
}

function vibrar(pattern) {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
}

function startConfetti() {
    if (confettiAtivo) return;
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    confettiAtivo = true;
    canvas.style.display = 'block';
    prepararConfettiCanvas();

    const colors = ['#c54848', '#34c759', '#ff9f0a', '#ff3b30', '#ffffff'];
    confettiParticles = Array.from({ length: 90 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * -canvas.height,
        size: Math.random() * 5 + 4,
        speed: Math.random() * 3 + 2,
        drift: Math.random() * 1.6 - 0.8,
        spin: Math.random() * Math.PI,
        color: colors[Math.floor(Math.random() * colors.length)]
    }));

    animarConfetti();
}

function prepararConfettiCanvas() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    confettiCtx = canvas.getContext('2d');
    confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function animarConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas || !confettiCtx || !confettiAtivo) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    confettiCtx.clearRect(0, 0, width, height);

    confettiParticles.forEach(particle => {
        particle.y += particle.speed;
        particle.x += particle.drift;
        particle.spin += 0.08;

        confettiCtx.save();
        confettiCtx.translate(particle.x, particle.y);
        confettiCtx.rotate(particle.spin);
        confettiCtx.fillStyle = particle.color;
        confettiCtx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.58);
        confettiCtx.restore();

        if (particle.y > height + 20) {
            particle.y = -20;
            particle.x = Math.random() * width;
        }
    });

    confettiAnim = requestAnimationFrame(animarConfetti);
}

function stopConfetti() {
    confettiAtivo = false;
    cancelAnimationFrame(confettiAnim);
    confettiAnim = null;
    confettiParticles = [];

    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;

    canvas.style.display = 'none';
    if (confettiCtx) {
        confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
}
