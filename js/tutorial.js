// tutorial.js — Tutorial interactivo para aprender a contar cartas (Hi-Lo).
// Guía paso a paso con ejercicios: valor de cada carta, conteo corrido,
// conteo verdadero y decisión de apuesta. Corrección inmediata.
(function () {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];

  function hilo(rank) {
    if (rank === 'A' || rank === '10' || rank === 'J' || rank === 'Q' || rank === 'K') return -1;
    if (rank === '7' || rank === '8' || rank === '9') return 0;
    return 1;
  }
  function randCard() {
    const rank = RANKS[(Math.random() * RANKS.length) | 0];
    const suit = SUITS[(Math.random() * 4) | 0];
    return { rank, suit, red: suit === '♥' || suit === '♦' };
  }
  function seq(n) { const a = []; for (let i = 0; i < n; i++) a.push(randCard()); return a; }
  function signed(n) { return (n > 0 ? '+' : '') + n; }

  function cardNode(c, faceDown) {
    const el = document.createElement('div');
    el.className = 'tcard ' + (faceDown ? 'back' : (c.red ? 'red' : 'black'));
    if (!faceDown) {
      el.innerHTML = `<div class="r">${c.rank}</div><div class="c">${c.suit}</div><div class="s">${c.suit}</div>`;
    }
    return el;
  }

  // ---------- Construcción de pasos ----------
  function buildSteps() {
    const steps = [];

    steps.push({ type: 'info', title: '🔢 Aprende a contar cartas', html: `
      <p>Contar cartas <b>no</b> es memorizar qué salió. Es llevar <b>un solo número</b> que te dice si en el zapato quedan más cartas <b>altas</b> (te favorecen) o <b>bajas</b> (favorecen a la casa).</p>
      <p>En este tutorial vas a <b>practicarlo tú mismo</b>, paso a paso. ¡Empecemos!</p>
      <p style="opacity:.7;font-size:13px">Son unos 5 minutos. Puedes salir cuando quieras con la ✕.</p>` });

    steps.push({ type: 'info', title: 'Los valores Hi-Lo', html: `
      <p>A cada carta que ves le das un valor:</p>
      <div class="hilo">
        <div class="grp low"><div class="cards2">2 3 4 5 6</div><div class="val">+1</div><div class="lbl">bajas</div></div>
        <div class="grp mid"><div class="cards2">7 8 9</div><div class="val">0</div><div class="lbl">neutras</div></div>
        <div class="grp high"><div class="cards2">10 J Q K A</div><div class="val">−1</div><div class="lbl">altas</div></div>
      </div>
      <p><b>La idea:</b> cuando salen cartas bajas el conteo sube (queda bueno para ti); cuando salen altas, baja.</p>
      <p>Ahora te toca a ti. Verás cartas y dirás cuánto valen. 👇</p>` });

    // 5 preguntas de valor
    const valueCards = seq(5);
    valueCards.forEach((c, i) => steps.push({ type: 'valueQuiz', card: c, idx: i + 1, total: 5 }));

    steps.push({ type: 'info', title: 'El conteo corrido', html: `
      <p>Empiezas en <b>0</b> cada vez que barajan. Con cada carta que salga, <b>sumas</b> su valor Hi-Lo al total.</p>
      <p style="background:rgba(0,0,0,.3);padding:10px;border-radius:10px;text-align:center">
        0 → sale un <b>5</b> (+1) → <b>+1</b> → sale una <b>K</b> (−1) → <b>0</b> → sale un <b>3</b> (+1) → <b>+1</b></p>
      <p>Vamos a hacerlo juntos: irán apareciendo cartas y en cada una eliges cuánto sumar. El total se irá actualizando.</p>` });

    steps.push({ type: 'runningDrill', cards: seq(6) });

    steps.push({ type: 'info', title: 'Reto de velocidad', html: `
      <p>En una mesa real las cartas salen rápido y tú llevas el conteo <b>en la cabeza</b>.</p>
      <p>Voltea las cartas una a una, ve sumando en tu mente, y al final escribe el <b>conteo corrido</b>. ¡Sin escribir nada hasta el final!</p>` });

    steps.push({ type: 'finalCount', cards: seq(8) });

    steps.push({ type: 'info', title: 'El conteo verdadero', html: `
      <p>El conteo corrido hay que <b>ajustarlo</b> por las barajas que faltan. Un +6 con muchas barajas por salir vale poco; con pocas, vale mucho.</p>
      <p style="background:rgba(0,0,0,.3);padding:10px;border-radius:10px;text-align:center;font-size:16px">
        <b>Conteo verdadero = conteo corrido ÷ barajas restantes</b></p>
      <p>Practiquemos la división. 👇</p>` });

    // 2 ejercicios de conteo verdadero (con divisiones exactas)
    for (let i = 0; i < 2; i++) {
      const decks = [1, 2, 3][(Math.random() * 3) | 0];
      const target = [2, 3, 4][(Math.random() * 3) | 0];
      steps.push({ type: 'trueCount', running: target * decks, decks, answer: target });
    }

    steps.push({ type: 'info', title: 'Cómo apostar con el conteo', html: `
      <p>Lo que te da ventaja es <b>apostar más cuando el conteo verdadero está alto</b> y menos cuando está bajo:</p>
      <ul>
        <li><b>+2 o más:</b> la baraja te favorece → <b>sube la apuesta</b>.</li>
        <li><b>Entre −1 y +1:</b> apuesta tu cantidad <b>base</b>.</li>
        <li><b>−2 o menos:</b> desfavorable → <b>apuesta el mínimo</b>.</li>
      </ul>
      <p>Decide tú en estos casos. 👇</p>` });

    const betCases = [ -2, 0, 3 ].sort(() => Math.random() - 0.5).slice(0, 2);
    betCases.forEach((tc) => steps.push({ type: 'betDecision', tc }));

    steps.push({ type: 'done', title: '🎉 ¡Lo lograste!', html: `
      <p>Ya sabes lo esencial para contar cartas:</p>
      <ul>
        <li>Valores Hi-Lo: bajas <b>+1</b>, neutras <b>0</b>, altas <b>−1</b>.</li>
        <li>Conteo <b>corrido</b>: súmalos desde 0.</li>
        <li>Conteo <b>verdadero</b>: corrido ÷ barajas restantes.</li>
        <li>Apuesta <b>más</b> con conteo alto, <b>menos</b> con conteo bajo.</li>
      </ul>
      <p>Ahora practícalo en una mesa real: activaré el <b>panel de conteo en vivo</b> para que juegues contando.</p>` });

    return steps;
  }

  // ---------- Motor / render ----------
  let steps = [];
  let idx = 0;
  let overlay;

  function ensureOverlay() {
    overlay = document.getElementById('tutorialOverlay');
    overlay.innerHTML = `
      <div class="tut">
        <div class="tut-head">
          <div class="tut-prog"><div class="tut-prog-fill" id="tutFill"></div></div>
          <button class="tut-close" id="tutClose" aria-label="Cerrar">✕</button>
        </div>
        <div class="tut-body" id="tutBody"></div>
        <div class="tut-foot">
          <button class="tut-btn ghost" id="tutBack">Atrás</button>
          <button class="tut-btn primary" id="tutNext">Siguiente</button>
        </div>
      </div>`;
    document.getElementById('tutClose').addEventListener('click', close);
    document.getElementById('tutBack').addEventListener('click', () => { if (idx > 0) { idx--; renderStep(); } });
    document.getElementById('tutNext').addEventListener('click', () => {
      if (idx < steps.length - 1) { idx++; renderStep(); }
      else close(true);
    });
  }

  function setNext(enabled, label) {
    const n = document.getElementById('tutNext');
    n.disabled = !enabled;
    if (label) n.textContent = label;
  }

  function renderStep() {
    const step = steps[idx];
    const body = document.getElementById('tutBody');
    document.getElementById('tutFill').style.width = ((idx) / (steps.length - 1) * 100) + '%';
    document.getElementById('tutBack').style.visibility = idx === 0 ? 'hidden' : 'visible';
    body.scrollTop = 0;
    body.innerHTML = '';

    const R = {
      info: renderInfo, done: renderDone, valueQuiz: renderValueQuiz,
      runningDrill: renderRunningDrill, finalCount: renderFinalCount,
      trueCount: renderTrueCount, betDecision: renderBetDecision,
    };
    (R[step.type] || renderInfo)(step, body);
  }

  function heading(body, title) {
    const h = document.createElement('h2');
    h.className = 'tut-title';
    h.textContent = title;
    body.appendChild(h);
  }

  function renderInfo(step, body) {
    heading(body, step.title);
    const d = document.createElement('div');
    d.innerHTML = step.html;
    body.appendChild(d);
    setNext(true, 'Siguiente');
  }

  function renderDone(step, body) {
    heading(body, step.title);
    const d = document.createElement('div');
    d.innerHTML = step.html;
    body.appendChild(d);
    setNext(true, 'Practicar en el juego');
  }

  function feedbackBox(body) {
    const fb = document.createElement('div');
    fb.className = 'tut-fb';
    body.appendChild(fb);
    return fb;
  }
  function showFb(fb, ok, msg) {
    fb.className = 'tut-fb show ' + (ok ? 'ok' : 'no');
    fb.innerHTML = (ok ? '✅ ' : '❌ ') + msg;
  }

  // Pregunta: valor de una carta
  function renderValueQuiz(step, body) {
    heading(body, `¿Cuánto vale esta carta?  (${step.idx}/${step.total})`);
    const stage = document.createElement('div');
    stage.className = 'tut-stage';
    stage.appendChild(cardNode(step.card, false));
    body.appendChild(stage);

    const opts = document.createElement('div');
    opts.className = 'tut-opts';
    [['+1', 1, 'low'], ['0', 0, 'mid'], ['−1', -1, 'high']].forEach(([lbl, val, cls]) => {
      const b = document.createElement('button');
      b.className = 'tut-opt ' + cls;
      b.textContent = lbl;
      b.addEventListener('click', () => answer(val, b));
      opts.appendChild(b);
    });
    body.appendChild(opts);
    const fb = feedbackBox(body);
    setNext(false, 'Siguiente');

    let answered = false;
    function answer(val, btn) {
      const correct = hilo(step.card.rank);
      opts.querySelectorAll('.tut-opt').forEach((b) => (b.disabled = true));
      btn.classList.add('picked');
      if (val === correct) {
        showFb(fb, true, `Sí, el <b>${step.card.rank}</b> vale <b>${signed(correct)}</b>.`);
      } else {
        const why = correct === 1 ? 'es una carta baja (2–6)' : correct === -1 ? 'es una carta alta (10, figura o As)' : 'es neutra (7, 8 o 9)';
        showFb(fb, false, `El <b>${step.card.rank}</b> vale <b>${signed(correct)}</b> porque ${why}.`);
      }
      answered = true;
      setNext(true, 'Siguiente');
    }
  }

  // Ejercicio: construir el conteo corrido carta por carta
  function renderRunningDrill(step, body) {
    heading(body, 'Construye el conteo corrido');
    const totalBox = document.createElement('div');
    totalBox.className = 'tut-total';
    totalBox.innerHTML = `Conteo actual: <b id="tutRun">0</b>`;
    body.appendChild(totalBox);

    const stage = document.createElement('div');
    stage.className = 'tut-stage';
    body.appendChild(stage);

    const opts = document.createElement('div');
    opts.className = 'tut-opts';
    body.appendChild(opts);
    const fb = feedbackBox(body);

    let pos = 0, running = 0;
    setNext(false, 'Siguiente');
    showCard();

    function showCard() {
      stage.innerHTML = '';
      opts.innerHTML = '';
      fb.className = 'tut-fb';
      if (pos >= step.cards.length) {
        const done = document.createElement('div');
        done.className = 'tut-fb show ok';
        done.innerHTML = `🎉 Terminaste. El conteo corrido final es <b>${signed(running)}</b>.`;
        body.insertBefore(done, opts);
        setNext(true, 'Siguiente');
        return;
      }
      const c = step.cards[pos];
      const label = document.createElement('div');
      label.className = 'tut-mini';
      label.textContent = `Carta ${pos + 1} de ${step.cards.length} — ¿cuánto sumas?`;
      stage.appendChild(label);
      stage.appendChild(cardNode(c, false));

      [['+1', 1, 'low'], ['0', 0, 'mid'], ['−1', -1, 'high']].forEach(([lbl, val, cls]) => {
        const b = document.createElement('button');
        b.className = 'tut-opt ' + cls;
        b.textContent = lbl;
        b.addEventListener('click', () => pick(val, b, c));
        opts.appendChild(b);
      });
    }

    function pick(val, btn, c) {
      const correct = hilo(c.rank);
      opts.querySelectorAll('.tut-opt').forEach((b) => (b.disabled = true));
      btn.classList.add('picked');
      running += correct; // sumamos el valor correcto para no arrastrar errores
      document.getElementById('tutRun').textContent = signed(running);
      if (val === correct) showFb(fb, true, `${c.rank} vale ${signed(correct)} → conteo <b>${signed(running)}</b>.`);
      else showFb(fb, false, `El ${c.rank} vale ${signed(correct)} (no ${signed(val)}). Conteo <b>${signed(running)}</b>.`);
      const next = document.createElement('button');
      next.className = 'tut-btn primary tut-inline';
      next.textContent = pos + 1 >= step.cards.length ? 'Ver total' : 'Siguiente carta';
      next.addEventListener('click', () => { pos++; showCard(); });
      opts.appendChild(next);
    }
  }

  // Reto: contar en la mente y escribir el total
  function renderFinalCount(step, body) {
    heading(body, 'Reto de velocidad');
    const info = document.createElement('div');
    info.className = 'tut-mini';
    info.textContent = 'Voltea cada carta y ve sumando en tu mente.';
    body.appendChild(info);

    const row = document.createElement('div');
    row.className = 'tut-row';
    body.appendChild(row);
    const backs = step.cards.map((c) => { const n = cardNode(c, true); row.appendChild(n); return n; });

    const flipBtn = document.createElement('button');
    flipBtn.className = 'tut-btn primary tut-inline';
    flipBtn.textContent = 'Voltear carta 1';
    body.appendChild(flipBtn);

    const answerArea = document.createElement('div');
    body.appendChild(answerArea);
    const fb = feedbackBox(body);
    setNext(false, 'Siguiente');

    let revealed = 0;
    const target = step.cards.reduce((s, c) => s + hilo(c.rank), 0);

    flipBtn.addEventListener('click', () => {
      const c = step.cards[revealed];
      const face = cardNode(c, false);
      face.classList.add('flip');
      row.replaceChild(face, backs[revealed]);
      revealed++;
      if (revealed < step.cards.length) flipBtn.textContent = 'Voltear carta ' + (revealed + 1);
      else { flipBtn.remove(); askTotal(); }
    });

    function askTotal() {
      answerArea.innerHTML = '<div class="tut-mini">¿Cuál es el conteo corrido final?</div>';
      const sp = stepper(0, -12, 12);
      answerArea.appendChild(sp.node);
      const check = document.createElement('button');
      check.className = 'tut-btn primary tut-inline';
      check.textContent = 'Comprobar';
      answerArea.appendChild(check);
      check.addEventListener('click', () => {
        const val = sp.getValue();
        if (val === target) showFb(fb, true, `¡Exacto! El conteo corrido es <b>${signed(target)}</b>.`);
        else showFb(fb, false, `El conteo correcto es <b>${signed(target)}</b>. Tú pusiste ${signed(val)}. Repasa sumando: bajas +1, altas −1.`);
        setNext(true, 'Siguiente');
      });
    }
  }

  // Ejercicio: conteo verdadero
  function renderTrueCount(step, body) {
    heading(body, 'Calcula el conteo verdadero');
    const d = document.createElement('div');
    d.innerHTML = `<p style="text-align:center;font-size:16px">Conteo corrido = <b>${signed(step.running)}</b><br>Barajas restantes = <b>${step.decks}</b></p>
      <p style="text-align:center">Verdadero = ${signed(step.running)} ÷ ${step.decks} = ?</p>`;
    body.appendChild(d);
    const sp = stepper(0, -10, 10);
    body.appendChild(sp.node);
    const check = document.createElement('button');
    check.className = 'tut-btn primary tut-inline';
    check.textContent = 'Comprobar';
    body.appendChild(check);
    const fb = feedbackBox(body);
    setNext(false, 'Siguiente');
    check.addEventListener('click', () => {
      const val = sp.getValue();
      if (val === step.answer) showFb(fb, true, `Correcto: ${signed(step.running)} ÷ ${step.decks} = <b>${signed(step.answer)}</b>.`);
      else showFb(fb, false, `La respuesta es <b>${signed(step.answer)}</b>: ${signed(step.running)} ÷ ${step.decks}.`);
      setNext(true, 'Siguiente');
    });
  }

  // Ejercicio: decisión de apuesta
  function renderBetDecision(step, body) {
    heading(body, 'Decisión de apuesta');
    const d = document.createElement('div');
    d.innerHTML = `<p style="text-align:center;font-size:18px">El conteo verdadero es <b>${signed(step.tc)}</b>.<br>¿Qué haces con tu apuesta?</p>`;
    body.appendChild(d);
    const opts = document.createElement('div');
    opts.className = 'tut-opts col';
    body.appendChild(opts);
    const fb = feedbackBox(body);
    setNext(false, 'Siguiente');

    const correct = step.tc >= 2 ? 'up' : step.tc <= -2 ? 'min' : 'base';
    const labels = { up: '⬆️ Subir la apuesta', base: '➡️ Apuesta base', min: '⬇️ Apuesta mínima' };
    ['up', 'base', 'min'].forEach((k) => {
      const b = document.createElement('button');
      b.className = 'tut-opt wide';
      b.textContent = labels[k];
      b.addEventListener('click', () => {
        opts.querySelectorAll('.tut-opt').forEach((x) => (x.disabled = true));
        b.classList.add('picked');
        const why = correct === 'up' ? 'con conteo +2 o más, la baraja te favorece: sube la apuesta.'
          : correct === 'min' ? 'con conteo −2 o menos, es desfavorable: apuesta el mínimo.'
          : 'con conteo entre −1 y +1, apuesta tu cantidad base.';
        if (k === correct) showFb(fb, true, `Bien hecho: ${why}`);
        else showFb(fb, false, `Lo correcto es «${labels[correct]}»: ${why}`);
        setNext(true, 'Siguiente');
      });
      opts.appendChild(b);
    });
  }

  // Componente: selector numérico
  function stepper(initial, min, max) {
    let v = initial;
    const node = document.createElement('div');
    node.className = 'tut-stepper';
    node.innerHTML = `<button class="st-btn" data-d="-1">−</button><div class="st-val">${signed(v)}</div><button class="st-btn" data-d="1">+</button>`;
    const val = node.querySelector('.st-val');
    node.querySelectorAll('.st-btn').forEach((b) => b.addEventListener('click', () => {
      v = Math.max(min, Math.min(max, v + parseInt(b.dataset.d, 10)));
      val.textContent = signed(v);
    }));
    return { node, getValue: () => v };
  }

  // ---------- API ----------
  function open() {
    // cierra el modal de referencia si está abierto
    const mb = document.getElementById('modalBackdrop');
    if (mb) mb.classList.remove('show');
    ensureOverlay();
    steps = buildSteps();
    idx = 0;
    overlay.classList.add('show');
    renderStep();
    try { localStorage.setItem('tutorialSeen', '1'); } catch (e) {}
  }

  function close(completed) {
    if (overlay) overlay.classList.remove('show');
    if (completed && typeof window.enableCountPractice === 'function') window.enableCountPractice();
  }

  window.Tutorial = { open };
})();
