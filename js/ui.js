// ui.js — Controla la interfaz, el modo entrenador y los modales.
(function () {
  const game = new Blackjack({ bankroll: 1000, minBet: 5, numDecks: 6 });

  const $ = (id) => document.getElementById(id);
  const controls = $('controls');
  const coachEl = $('coach');
  const centerMsg = $('centerMsg');

  let coachOn = true;          // modo entrenador activado
  let pendingBet = 0;          // apuesta en construcción
  let lastBet = 25;            // repetir apuesta

  try { coachOn = localStorage.getItem('coach') !== 'off'; } catch (e) {}

  const A2L = { H: 'H', S: 'S', D: 'D', P: 'P' };

  // ---------- Render de cartas ----------
  function cardEl(card, faceDown) {
    const el = document.createElement('div');
    el.className = 'card ' + (faceDown ? 'back' : (card.red ? 'red' : 'black'));
    if (!faceDown) {
      el.innerHTML =
        `<div class="r">${card.rank}</div>` +
        `<div class="center">${card.suit}</div>` +
        `<div class="s">${card.suit}</div>`;
    }
    return el;
  }

  function renderDealer() {
    const wrap = $('dealerHand');
    const cardsDiv = wrap.querySelector('.cards');
    cardsDiv.innerHTML = '';
    const d = game.dealer;
    if (!d.cards || d.cards.length === 0) { setBadge(wrap, null); return; }

    d.cards.forEach((c) => cardsDiv.appendChild(cardEl(c, false)));
    if (d.hidden) cardsDiv.appendChild(cardEl(null, true));

    if (d.hidden) {
      const upVal = Strategy.evaluateHand([d.cards[0]]).total;
      setBadge(wrap, upVal + ' + ?', '');
    } else {
      const info = Strategy.evaluateHand(d.cards);
      setBadge(wrap, info.total, info.bust ? 'bust' : '');
    }
  }

  function setBadge(wrap, text, cls) {
    let badge = wrap.querySelector('.total-badge');
    if (text === null) { if (badge) badge.remove(); return; }
    if (!badge) { badge = document.createElement('div'); badge.className = 'total-badge'; wrap.appendChild(badge); }
    badge.className = 'total-badge ' + (cls || '');
    badge.textContent = text;
  }

  function renderPlayer() {
    const container = $('playerHands');
    container.innerHTML = '';
    game.hands.forEach((h, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'hand' + (game.state === 'playerTurn' && i === game.activeHand ? ' active' : '');
      const cardsDiv = document.createElement('div');
      cardsDiv.className = 'cards';
      h.cards.forEach((c) => cardsDiv.appendChild(cardEl(c, false)));
      wrap.appendChild(cardsDiv);

      const info = Strategy.evaluateHand(h.cards);
      let cls = info.bust ? 'bust' : (info.blackjack && !h.split ? 'bj' : '');
      let label = info.blackjack && !h.split ? 'BLACKJACK' : info.total + (info.soft && !info.bust ? ' (suave)' : '');
      setBadgeInline(wrap, label, cls);

      if (h.bet) {
        const b = document.createElement('div');
        b.className = 'total-badge';
        b.style.marginLeft = '6px';
        b.textContent = '$' + h.bet + (h.doubled ? ' ×2' : '');
        wrap.appendChild(b);
      }

      // Resultado al terminar
      if (game.state === 'settled' && game.results) {
        const res = game.results.find((r) => r.hand === h);
        if (res) {
          const o = document.createElement('div');
          const map = { win: ['win', 'Ganaste'], blackjack: ['win', 'Blackjack ✔'], lose: ['lose', 'Perdiste'], push: ['push', 'Empate'] };
          const [c, t] = map[res.result];
          o.className = 'hand-outcome ' + c;
          o.textContent = t;
          wrap.appendChild(o);
        }
      }
      container.appendChild(wrap);
    });
  }

  function setBadgeInline(wrap, text, cls) {
    const badge = document.createElement('div');
    badge.className = 'total-badge ' + (cls || '');
    badge.textContent = text;
    wrap.appendChild(badge);
  }

  // ---------- Coach ----------
  function currentAdvice() {
    const h = game.currentHand();
    const a = game.availableActions();
    return Strategy.getAdvice(h.cards, game.dealerUpValue(), {
      canDouble: a.canDouble, canSplit: a.canSplit, canSurrender: false,
    });
  }

  function showCoachHint() {
    if (!coachOn || game.state !== 'playerTurn') { coachEl.className = 'coach'; return; }
    if (game.canOfferInsurance) {
      coachEl.className = 'coach show';
      coachEl.innerHTML = `<span class="rec">Consejo:</span> Rechaza el seguro. A largo plazo el seguro hace perder dinero, incluso con buena mano.`;
      return;
    }
    const adv = currentAdvice();
    coachEl.className = 'coach show';
    coachEl.innerHTML = `<span class="rec">Jugada óptima: ${adv.label}</span><br>${adv.reason}`;
  }

  function flashFeedback(chosenLetter) {
    if (game.canOfferInsurance) return;
    const adv = currentAdviceBeforeAction;
    if (!adv) return;
    const correct = game.recordDecision(chosenLetter, letterOf(adv.action));
    if (!coachOn) return;
    coachEl.className = 'coach show ' + (correct ? 'feedback-good' : 'feedback-bad');
    if (correct) {
      coachEl.innerHTML = `<span class="verdict-good">✔ Correcto.</span> ${adv.reason}`;
    } else {
      coachEl.innerHTML = `<span class="verdict-bad">✘ La jugada óptima era ${adv.label}.</span> ${adv.reason}`;
    }
  }

  function letterOf(action) { return A2L[action] || action; }

  let currentAdviceBeforeAction = null;
  function captureAdvice() {
    currentAdviceBeforeAction = (game.state === 'playerTurn' && !game.canOfferInsurance) ? currentAdvice() : null;
  }

  // ---------- Controles ----------
  function renderControls() {
    controls.innerHTML = '';
    if (game.state === 'betting') return renderBetting();
    if (game.state === 'playerTurn') return renderPlayerControls();
    if (game.state === 'settled') return renderSettled();
    // dealerTurn es instantáneo en esta versión
  }

  function renderBetting() {
    const area = document.createElement('div');
    area.className = 'bet-area';
    area.innerHTML = `
      <div class="bet-display">Apuesta: <b id="betValue">$${pendingBet}</b></div>
      <div class="chips">
        <div class="chip c5" data-v="5">$5</div>
        <div class="chip c25" data-v="25">$25</div>
        <div class="chip c100" data-v="100">$100</div>
        <div class="chip c500" data-v="500">$500</div>
      </div>
    `;
    controls.appendChild(area);

    const row = document.createElement('div');
    row.className = 'btn-row';
    row.innerHTML = `
      <button class="btn secondary" id="clearBet">Limpiar</button>
      <button class="btn secondary" id="repeatBet">Repetir $${lastBet}</button>
      <button class="btn primary" id="dealBtn">Repartir</button>
    `;
    controls.appendChild(row);

    const sw = document.createElement('label');
    sw.className = 'switch';
    sw.innerHTML = `<input type="checkbox" id="coachToggle" ${coachOn ? 'checked' : ''}/> Modo entrenador (consejos de estrategia)`;
    controls.appendChild(sw);

    area.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
      const v = parseInt(c.dataset.v, 10);
      if (pendingBet + v <= game.bankroll) { pendingBet += v; $('betValue').textContent = '$' + pendingBet; updateDeal(); }
    }));
    $('clearBet').addEventListener('click', () => { pendingBet = 0; $('betValue').textContent = '$0'; updateDeal(); });
    $('repeatBet').addEventListener('click', () => {
      if (lastBet <= game.bankroll) { pendingBet = lastBet; $('betValue').textContent = '$' + pendingBet; updateDeal(); }
    });
    $('dealBtn').addEventListener('click', () => {
      if (pendingBet < game.minBet) { flashMsg('Apuesta mínima $' + game.minBet); return; }
      lastBet = pendingBet;
      game.placeBet(pendingBet);
      pendingBet = 0;
      captureAdvice();
      render();
      if (game.state === 'settled') showSettleMessage();
    });
    $('coachToggle').addEventListener('change', (e) => {
      coachOn = e.target.checked;
      try { localStorage.setItem('coach', coachOn ? 'on' : 'off'); } catch (err) {}
    });
    updateDeal();
    function updateDeal() { $('dealBtn').disabled = pendingBet < game.minBet; }
  }

  function renderPlayerControls() {
    // Seguro primero
    if (game.canOfferInsurance) {
      const row = document.createElement('div');
      row.className = 'btn-row';
      row.innerHTML = `
        <button class="btn secondary" id="noIns">Sin seguro</button>
        <button class="btn" id="yesIns">Tomar seguro ($${Math.floor(game.bet / 2)})</button>`;
      controls.appendChild(row);
      $('yesIns').addEventListener('click', () => { game.takeInsurance(); render(); });
      $('noIns').addEventListener('click', () => { game.declineInsurance(); render(); });
      return;
    }

    const a = game.availableActions();
    const row1 = document.createElement('div');
    row1.className = 'btn-row';
    row1.innerHTML = `
      <button class="btn" id="hitBtn">Pedir</button>
      <button class="btn" id="standBtn">Plantarse</button>`;
    controls.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'btn-row';
    row2.innerHTML = `
      <button class="btn secondary" id="doubleBtn" ${a.canDouble ? '' : 'disabled'}>Doblar</button>
      <button class="btn secondary" id="splitBtn" ${a.canSplit ? '' : 'disabled'}>Dividir</button>`;
    controls.appendChild(row2);

    $('hitBtn').addEventListener('click', () => act('H', () => game.hit()));
    $('standBtn').addEventListener('click', () => act('S', () => game.stand()));
    if (a.canDouble) $('doubleBtn').addEventListener('click', () => act('D', () => game.double()));
    if (a.canSplit) $('splitBtn').addEventListener('click', () => act('P', () => game.split()));
  }

  function act(letter, fn) {
    captureAdvice();          // consejo ANTES de ejecutar
    flashFeedback(letter);    // evalúa la decisión
    fn();
    // Si seguimos jugando la misma o nueva mano, mantener feedback un momento
    const keepFeedback = coachEl.classList.contains('feedback-bad') || coachEl.classList.contains('feedback-good');
    renderTableOnly();
    renderControls();
    if (game.state === 'settled') { showSettleMessage(); showCoachHint(); }
    else if (game.state === 'playerTurn') {
      if (!keepFeedback) showCoachHint();
      else setTimeout(() => { if (game.state === 'playerTurn') showCoachHint(); }, 1400);
    }
    updateBankroll();
  }

  function renderSettled() {
    const row = document.createElement('div');
    row.className = 'btn-row';
    row.innerHTML = `<button class="btn primary" id="nextBtn">Siguiente mano</button>`;
    controls.appendChild(row);
    $('nextBtn').addEventListener('click', () => { game.nextRound(); coachEl.className = 'coach'; render(); });
  }

  // ---------- Mensajes ----------
  function showSettleMessage() {
    if (!game.results) return;
    const net = game.results.reduce((s, r) => {
      const h = r.hand;
      if (r.result === 'win') return s + h.bet;
      if (r.result === 'blackjack') return s + h.bet * 1.5;
      if (r.result === 'lose') return s - h.bet;
      return s;
    }, 0);
    let txt;
    if (net > 0) txt = `🎉 Ganaste $${net.toFixed(0)}`;
    else if (net < 0) txt = `Perdiste $${Math.abs(net).toFixed(0)}`;
    else txt = 'Empate';
    if (game.dealerBust) txt += ' — la casa se pasó';
    centerMsg.textContent = txt;
    if (game.message) flashMsg(game.message);
  }

  function flashMsg(t) {
    centerMsg.textContent = t;
  }

  function updateBankroll() { $('bankrollValue').textContent = Math.floor(game.bankroll); }

  function renderTableOnly() { renderDealer(); renderPlayer(); }

  function render() {
    renderTableOnly();
    renderControls();
    updateBankroll();
    if (game.state === 'playerTurn') { centerMsg.textContent = ''; showCoachHint(); }
    else if (game.state === 'betting') { centerMsg.textContent = 'Haz tu apuesta para comenzar'; coachEl.className = 'coach'; }
  }

  // ---------- Modales ----------
  const backdrop = $('modalBackdrop');
  const modal = $('modal');
  function openModal(html) { modal.innerHTML = html + `<button class="btn secondary" id="modalClose" style="margin-top:14px">Cerrar</button>`; backdrop.classList.add('show'); $('modalClose').addEventListener('click', closeModal); }
  function closeModal() { backdrop.classList.remove('show'); }
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });

  $('btnHelp').addEventListener('click', () => openModal(HELP_HTML));
  $('btnStats').addEventListener('click', () => openModal(statsHTML()));
  $('btnChart').addEventListener('click', () => openModal(CHART_HTML));

  function statsHTML() {
    const s = game.stats;
    const acc = s.decisions ? Math.round((s.correct / s.decisions) * 100) : 0;
    const total = s.won + s.lost + s.push;
    const winRate = total ? Math.round((s.won / total) * 100) : 0;
    return `
      <h2>📊 Tu progreso</h2>
      <div class="stat-grid">
        <div class="stat-card"><b>${acc}%</b><span>Precisión de estrategia</span></div>
        <div class="stat-card"><b>${s.correct}/${s.decisions}</b><span>Decisiones correctas</span></div>
        <div class="stat-card"><b>${s.hands}</b><span>Manos jugadas</span></div>
        <div class="stat-card"><b>${winRate}%</b><span>Manos ganadas</span></div>
        <div class="stat-card"><b>${s.won}</b><span>Ganadas</span></div>
        <div class="stat-card"><b>${s.lost}</b><span>Perdidas</span></div>
      </div>
      <p style="opacity:.85">La <b>precisión de estrategia</b> mide cuántas veces jugaste como indica la estrategia básica óptima. Apunta a 100%: es la forma de reducir al mínimo la ventaja de la casa (a ~0.5%).</p>
      <button class="btn secondary" id="resetStats" style="margin-top:6px">Reiniciar estadísticas</button>
    `;
  }
  backdrop.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'resetStats') {
      game.stats = { hands: 0, correct: 0, decisions: 0, won: 0, lost: 0, push: 0 };
      modal.querySelector('h2').insertAdjacentHTML('afterend', '');
      openModal(statsHTML());
    }
  });

  // ---------- Contenido estático ----------
  const HELP_HTML = `
    <h2>❓ Cómo jugar Blackjack 21</h2>
    <p><b>Objetivo:</b> acercarte a 21 más que el crupier (la casa) sin pasarte.</p>
    <h3>Valores</h3>
    <p>Cartas 2–10 valen su número. J, Q, K valen 10. El As vale 11 o 1 (lo que más te convenga).</p>
    <h3>Desarrollo de la mano</h3>
    <ul>
      <li><b>Pedir (Hit):</b> pides otra carta.</li>
      <li><b>Plantarse (Stand):</b> te quedas con tu mano.</li>
      <li><b>Doblar (Double):</b> duplicas la apuesta y recibes exactamente una carta más.</li>
      <li><b>Dividir (Split):</b> si tus dos cartas son iguales, las separas en dos manos.</li>
    </ul>
    <h3>Reglas de la casa (como en el casino)</h3>
    <ul>
      <li>El crupier <b>pide hasta llegar a 17</b> y ahí se planta.</li>
      <li><b>Blackjack</b> (As + carta de 10 en las dos primeras cartas) paga <b>3:2</b>.</li>
      <li>El <b>seguro</b> se ofrece cuando el crupier muestra un As. Consejo: casi nunca conviene.</li>
      <li>Se juega con un <b>zapato de 6 barajas</b>, como en la mayoría de mesas reales.</li>
    </ul>
    <h3>Modo entrenador</h3>
    <p>Con el entrenador activado, antes de cada jugada verás la <b>jugada óptima</b> según la estrategia básica y una explicación. Si te equivocas, te lo indica. Revisa 📋 para ver la tabla completa y 📊 para tu precisión.</p>
    <p style="opacity:.8">Consejo pro: instala la app tocando <b>Compartir → Añadir a pantalla de inicio</b> para jugarla como app nativa y sin conexión.</p>
  `;

  const CHART_HTML = buildChartHTML();
  function buildChartHTML() {
    const dealerCols = ['2','3','4','5','6','7','8','9','10','A'];
    function row(label, cells) {
      return `<tr><th>${label}</th>${cells.map((c) => `<td class="${c}">${c}</td>`).join('')}</tr>`;
    }
    // Duros
    const hard = {
      '17+': ['S','S','S','S','S','S','S','S','S','S'],
      '16': ['S','S','S','S','S','H','H','H','H','H'],
      '15': ['S','S','S','S','S','H','H','H','H','H'],
      '13-14': ['S','S','S','S','S','H','H','H','H','H'],
      '12': ['H','H','S','S','S','H','H','H','H','H'],
      '11': ['D','D','D','D','D','D','D','D','D','H'],
      '10': ['D','D','D','D','D','D','D','D','H','H'],
      '9': ['H','D','D','D','D','H','H','H','H','H'],
      '5-8': ['H','H','H','H','H','H','H','H','H','H'],
    };
    const soft = {
      'A,9 (20)': ['S','S','S','S','S','S','S','S','S','S'],
      'A,8 (19)': ['S','S','S','S','S','S','S','S','S','S'],
      'A,7 (18)': ['D','D','D','D','D','S','S','H','H','H'],
      'A,6 (17)': ['H','D','D','D','D','H','H','H','H','H'],
      'A,4-5': ['H','H','D','D','D','H','H','H','H','H'],
      'A,2-3': ['H','H','H','D','D','H','H','H','H','H'],
    };
    const pairs = {
      'A,A': ['P','P','P','P','P','P','P','P','P','P'],
      '10,10': ['S','S','S','S','S','S','S','S','S','S'],
      '9,9': ['P','P','P','P','P','S','P','P','S','S'],
      '8,8': ['P','P','P','P','P','P','P','P','P','P'],
      '7,7': ['P','P','P','P','P','P','H','H','H','H'],
      '6,6': ['P','P','P','P','P','H','H','H','H','H'],
      '4,4': ['H','H','H','P','P','H','H','H','H','H'],
      '2,2 / 3,3': ['P','P','P','P','P','P','H','H','H','H'],
    };
    const head = `<tr><th>Tu mano \\ Crupier</th>${dealerCols.map((c) => `<th>${c}</th>`).join('')}</tr>`;
    const section = (title, obj) => `<h3>${title}</h3><table class="chart"><thead>${head}</thead><tbody>${Object.entries(obj).map(([k, v]) => row(k, v)).join('')}</tbody></table>`;
    return `
      <h2>📋 Estrategia básica</h2>
      <p style="opacity:.85">6 barajas · la casa se planta en 17 · se permite doblar tras dividir. Seguir esta tabla reduce la ventaja de la casa a ~0.5%.</p>
      <div class="legend">
        <span><i style="background:#2e86c1"></i>H Pedir</span>
        <span><i style="background:#7f8c8d"></i>S Plantarse</span>
        <span><i style="background:#27ae60"></i>D Doblar</span>
        <span><i style="background:#d4af37"></i>P Dividir</span>
      </div>
      ${section('Totales duros', hard)}
      ${section('Totales suaves (con As)', soft)}
      ${section('Pares (dividir)', pairs)}
      <p style="opacity:.75;font-size:12px">Si no puedes doblar (más de 2 cartas), pide en su lugar. Si no puedes dividir, juega el total normal.</p>
    `;
  }

  // ---------- Arranque ----------
  render();
})();
