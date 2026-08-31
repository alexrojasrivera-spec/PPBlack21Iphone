// ui.js — Controla la interfaz, el modo entrenador y los modales.
(function () {
  const game = new Blackjack({ bankroll: 1000, minBet: 5, numDecks: 6 });

  const $ = (id) => document.getElementById(id);
  const controls = $('controls');
  const coachEl = $('coach');
  const centerMsg = $('centerMsg');

  let coachOn = true;          // modo entrenador activado
  let countOn = false;         // panel de conteo en vivo
  let pendingBet = 0;          // apuesta en construcción
  let lastBet = 25;            // repetir apuesta

  try { coachOn = localStorage.getItem('coach') !== 'off'; } catch (e) {}
  try { countOn = localStorage.getItem('count') === 'on'; } catch (e) {}

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

    d.cards.forEach((c, i) => {
      const el = cardEl(c, false);
      if (!c._shown) {
        c._shown = true;
        // La carta oculta recién revelada (índice 1) se voltea; el resto entra desde el zapato
        if (i === 1 && !d.hidden) el.classList.add('flip-in');
        else { el.classList.add('deal-in'); el.style.setProperty('--i', Math.max(0, i - 1)); }
      }
      cardsDiv.appendChild(el);
    });
    if (d.hidden) {
      const back = cardEl(null, true);
      if (!d._backShown) { d._backShown = true; back.classList.add('deal-in'); back.style.setProperty('--i', 1); }
      cardsDiv.appendChild(back);
    }

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
      h.cards.forEach((c, ci) => {
        const el = cardEl(c, false);
        if (!c._shown) { c._shown = true; el.classList.add('deal-in'); el.style.setProperty('--i', ci); }
        cardsDiv.appendChild(el);
      });
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
          if (res.result === 'win' || res.result === 'blackjack') wrap.classList.add('result-win');
          else if (res.result === 'lose') wrap.classList.add('result-lose');
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

  // ---------- Panel de conteo en vivo ----------
  const hud = $('countHud');
  function renderCountHud() {
    if (!countOn || game.state === 'betting') { hud.className = 'count-hud'; return; }
    const c = game.getCount();
    const units = game.betUnitsFor(c.trueRounded);
    const favorable = c.trueRounded >= 2;
    let sug;
    if (c.trueRounded >= 2) sug = `Conteo a tu favor: sube la apuesta (~${units} unidades).`;
    else if (c.trueRounded <= -1) sug = 'Conteo en contra: apuesta el mínimo.';
    else sug = 'Conteo neutro: apuesta base.';
    hud.className = 'count-hud show';
    hud.innerHTML = `
      <div class="cvals">
        <div class="cv rc"><b>${c.running > 0 ? '+' : ''}${c.running}</b><span>Corrido</span></div>
        <div class="cv tc ${c.trueRounded < 0 ? 'neg' : ''}"><b>${c.trueRounded > 0 ? '+' : ''}${c.trueRounded}</b><span>Verdadero</span></div>
        <div class="cv"><b>${c.decksLeft.toFixed(1)}</b><span>Barajas</span></div>
      </div>
      <div class="csug">${sug}</div>
      <button class="quizbtn" id="countQuiz">¿Cuánto va?</button>`;
    const q = $('countQuiz');
    if (q) q.addEventListener('click', () => {
      const ans = prompt('¿Cuál es el CONTEO CORRIDO ahora mismo?\n(Suma +1 por cada 2-6, -1 por cada 10/figura/As, 0 por 7-9.)');
      if (ans === null) return;
      const n = parseInt(ans, 10);
      const real = game.getCount().running;
      if (n === real) alert('✅ ¡Correcto! El conteo corrido es ' + (real > 0 ? '+' : '') + real + '.');
      else alert('❌ Casi. El conteo corrido real es ' + (real > 0 ? '+' : '') + real + '. Tú dijiste ' + n + '.\nRecuerda: bajas +1, altas -1, medias 0.');
    });
  }

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

    const sw2 = document.createElement('label');
    sw2.className = 'switch';
    sw2.innerHTML = `<input type="checkbox" id="countToggle" ${countOn ? 'checked' : ''}/> Practicar conteo de cartas (Hi-Lo)`;
    controls.appendChild(sw2);

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
    $('countToggle').addEventListener('change', (e) => {
      countOn = e.target.checked;
      try { localStorage.setItem('count', countOn ? 'on' : 'off'); } catch (err) {}
      renderCountHud();
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

  function renderShoe() {
    const info = game.getShoe();
    $('shoeFill').style.height = (info.remainFrac * 100).toFixed(1) + '%';
    $('shoeCut').style.bottom = (info.cutFrac * 100).toFixed(1) + '%';
    $('shoeDecks').textContent = info.decksLeft.toFixed(1);
  }

  function renderTableOnly() { renderShoe(); renderDealer(); renderPlayer(); renderCountHud(); }

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
  $('btnCount').addEventListener('click', () => openModal(COUNT_HTML));

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

  const COUNT_HTML = `
    <h2>🔢 Cómo se cuentan las cartas</h2>
    <button class="tut-launch" onclick="Tutorial.open()">▶ Empezar tutorial interactivo</button>
    <p style="opacity:.8;font-size:13px;margin-top:-6px">Aprende practicando: cartas reales, tú respondes y te corrige al instante. Abajo tienes la guía de referencia.</p>
    <p>Contar cartas <b>no es memorizar</b> las cartas que salieron. Es llevar <b>un solo número</b> que te dice si en el zapato quedan más cartas <b>altas</b> (buenas para ti) o <b>bajas</b> (buenas para la casa). Es legal; solo que a los casinos no les gusta.</p>

    <h3>1) El sistema Hi-Lo</h3>
    <p>A cada carta que ves salir le sumas o le restas un punto:</p>
    <div class="hilo">
      <div class="grp low"><div class="cards2">2 3 4 5 6</div><div class="val">+1</div><div style="font-size:11px;opacity:.8">cartas bajas</div></div>
      <div class="grp mid"><div class="cards2">7 8 9</div><div class="val">0</div><div style="font-size:11px;opacity:.8">neutras</div></div>
      <div class="grp high"><div class="cards2">10 J Q K A</div><div class="val">−1</div><div style="font-size:11px;opacity:.8">cartas altas</div></div>
    </div>
    <p><b>¿Por qué?</b> Cuando quedan muchas cartas altas (dieces y ases), tú sacas más blackjacks (que pagan 3:2) y la casa se pasa más seguido. Cuando salen las altas, el conteo baja; cuando salen las bajas, sube.</p>

    <h3>2) Conteo corrido</h3>
    <p>Empiezas en <b>0</b> al barajar y vas sumando cada carta. Ejemplo con estas cartas en la mesa:</p>
    <p style="background:rgba(0,0,0,.3);padding:8px;border-radius:8px">
      Rey (−1) · 5 (+1) · 3 (+1) · 10 (−1) · 6 (+1) &nbsp;→&nbsp; <b>conteo corrido = +1</b>
    </p>

    <h3>3) Conteo verdadero (el importante)</h3>
    <p>El conteo corrido hay que ajustarlo por las barajas que faltan, porque un +5 con 6 barajas por salir vale poco, pero un +5 con 1 baraja por salir es enorme:</p>
    <p style="text-align:center;font-size:16px;background:rgba(0,0,0,.3);padding:8px;border-radius:8px">
      <b>Conteo verdadero = conteo corrido ÷ barajas restantes</b>
    </p>
    <p>Ejemplo: conteo corrido +6 y quedan 3 barajas → 6 ÷ 3 = <b>conteo verdadero +2</b>.</p>

    <h3>4) Qué hacer con el conteo</h3>
    <ul>
      <li><b>Verdadero +2 o más:</b> la baraja te favorece → <b>apuesta más</b>.</li>
      <li><b>Cercano a 0:</b> apuesta tu cantidad base.</li>
      <li><b>Negativo:</b> desfavorable → <b>apuesta el mínimo</b>.</li>
    </ul>
    <p>La estrategia básica (📋) casi no cambia; lo que más te da ventaja es <b>subir la apuesta cuando el conteo está alto</b> y bajarla cuando está bajo.</p>

    <h3>5) El zapato y la carta de corte</h3>
    <p>Arriba a la derecha de la mesa verás el <b>zapato</b>: una barra que <b>baja</b> a medida que se reparten cartas, con el número de <b>barajas que faltan</b>. Esas barajas son las que usas para el conteo verdadero.</p>
    <p>La <b>línea roja</b> es la <b>carta de corte</b>: cuando el reparto llega ahí, se <b>rebaraja</b> y el conteo vuelve a 0. Por eso, mientras más cerca del corte y más alto el conteo, más te conviene apostar fuerte.</p>

    <h3>6) Practícalo aquí</h3>
    <p>Activa <b>«Practicar conteo de cartas»</b> en la pantalla de apuestas. Aparecerá un panel en vivo con el conteo corrido, el verdadero y las barajas restantes, y un botón <b>«¿Cuánto va?»</b> para que adivines el conteo y te autocorrija. Empieza siguiendo el panel; luego intenta contar tú y compara.</p>
    <p style="opacity:.75;font-size:12px">Nota: contar es una habilidad de práctica. En casinos con máquinas de barajado continuo no funciona, y contar mentalmente bajo presión es difícil. Aquí es 100% para aprender.</p>
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

  // Activa la práctica de conteo (la llama el tutorial al terminar)
  window.enableCountPractice = function () {
    countOn = true;
    try { localStorage.setItem('count', 'on'); } catch (e) {}
    const t = $('countToggle');
    if (t) t.checked = true;
    renderCountHud();
    centerMsg.textContent = '¡Panel de conteo activado! Juega una mano y practica.';
  };

  // ---------- Arranque ----------
  render();
})();
