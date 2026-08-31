// game.js — Motor de Blackjack realista (zapato de 6 barajas).
// Reglas: la casa se planta en 17 (incluido 17 suave), Blackjack paga 3:2,
// seguro paga 2:1, se puede doblar en las dos primeras cartas, dividir pares
// (una re-división permitida, total hasta 4 manos), doblar tras dividir (DAS).
// Los ases divididos reciben solo una carta cada uno.

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = [
  ['A', 11], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6],
  ['7', 7], ['8', 8], ['9', 9], ['10', 10], ['J', 10], ['Q', 10], ['K', 10],
];

class Blackjack {
  constructor(opts = {}) {
    this.numDecks = opts.numDecks || 6;
    this.penetration = opts.penetration || 0.75; // se rebaraja al consumir 75%
    this.startingBankroll = opts.bankroll || 1000;
    this.minBet = opts.minBet || 5;
    this.blackjackPays = 1.5; // 3:2
    this.reset();
  }

  reset() {
    this.bankroll = this.startingBankroll;
    this.shoe = [];
    this.discardCount = 0;
    this.buildShoe();
    this.state = 'betting'; // betting -> playerTurn -> dealerTurn -> settled
    this.bet = 0;
    this.dealer = { cards: [], hidden: true };
    this.hands = [];       // manos del jugador (soporta divisiones)
    this.activeHand = 0;
    this.insurance = 0;
    this.message = '';
    // estadísticas de aprendizaje
    this.stats = this.stats || { hands: 0, correct: 0, decisions: 0, won: 0, lost: 0, push: 0 };
  }

  buildShoe() {
    const cards = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (const suit of SUITS) {
        for (const [rank, value] of RANKS) {
          cards.push({ rank, suit, value, red: suit === '♥' || suit === '♦' });
        }
      }
    }
    this.shoe = cards;
    this.shuffle();
    this.cutCard = Math.floor(this.shoe.length * this.penetration);
    this.dealtSinceShuffle = 0;
    this.needsShuffle = false;
  }

  shuffle() {
    for (let i = this.shoe.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shoe[i], this.shoe[j]] = [this.shoe[j], this.shoe[i]];
    }
  }

  draw() {
    if (this.shoe.length === 0) this.buildShoe();
    this.dealtSinceShuffle++;
    if (this.dealtSinceShuffle >= this.cutCard) this.needsShuffle = true;
    return this.shoe.pop();
  }

  // ---- Flujo del juego ----

  placeBet(amount) {
    if (this.state !== 'betting') return false;
    if (amount < this.minBet || amount > this.bankroll) return false;
    if (this.needsShuffle) this.buildShoe();
    this.bet = amount;
    this.bankroll -= amount;
    this.deal();
    return true;
  }

  deal() {
    this.dealer = { cards: [this.draw()], hiddenCard: this.draw(), hidden: true };
    this.hands = [{ cards: [this.draw(), this.draw()], bet: this.bet, done: false, doubled: false, split: false, fromSplitAces: false }];
    this.activeHand = 0;
    this.insurance = 0;
    this.state = 'playerTurn';
    this.message = '';

    const dealerUp = this.dealer.cards[0];
    this.canOfferInsurance = dealerUp.rank === 'A';

    // Blackjack natural del jugador
    const info = Strategy.evaluateHand(this.hands[0].cards);
    if (info.blackjack) {
      this.hands[0].done = true;
      this.revealAndSettle();
    }
  }

  currentHand() { return this.hands[this.activeHand]; }

  handInfo(hand) { return Strategy.evaluateHand(hand.cards); }

  availableActions() {
    if (this.state !== 'playerTurn') return {};
    const h = this.currentHand();
    const info = this.handInfo(h);
    const twoCards = h.cards.length === 2;
    const canDouble = twoCards && this.bankroll >= h.bet && !h.fromSplitAces;
    const canSplit = twoCards && h.cards[0].value === h.cards[1].value &&
      this.hands.length < 4 && this.bankroll >= h.bet;
    return {
      canHit: !h.fromSplitAces && !info.bust,
      canStand: true,
      canDouble,
      canSplit,
      canInsurance: this.canOfferInsurance && this.insurance === 0,
    };
  }

  dealerUpValue() { return this.dealer.cards[0].value; }

  hit() {
    if (this.state !== 'playerTurn') return;
    const h = this.currentHand();
    h.cards.push(this.draw());
    const info = this.handInfo(h);
    if (info.bust || info.total === 21) {
      h.done = true;
      this.advanceHand();
    }
  }

  stand() {
    if (this.state !== 'playerTurn') return;
    this.currentHand().done = true;
    this.advanceHand();
  }

  double() {
    const a = this.availableActions();
    if (!a.canDouble) return;
    const h = this.currentHand();
    this.bankroll -= h.bet;
    h.bet *= 2;
    h.doubled = true;
    h.cards.push(this.draw());
    h.done = true;
    this.advanceHand();
  }

  split() {
    const a = this.availableActions();
    if (!a.canSplit) return;
    const h = this.currentHand();
    const isAces = h.cards[0].rank === 'A';
    this.bankroll -= h.bet;
    const card2 = h.cards.pop();
    const newHand = { cards: [card2, this.draw()], bet: h.bet, done: false, doubled: false, split: true, fromSplitAces: isAces };
    h.cards.push(this.draw());
    h.split = true;
    h.fromSplitAces = isAces;
    this.hands.splice(this.activeHand + 1, 0, newHand);
    if (isAces) {
      // Ases divididos: una carta cada uno y listo.
      h.done = true;
      newHand.done = true;
      // Ambas manos ya tienen 2 cartas; marcar y avanzar.
      this.advanceHand();
    }
  }

  takeInsurance() {
    if (!this.availableActions().canInsurance) return;
    const cost = Math.floor(this.bet / 2);
    if (this.bankroll < cost) return;
    this.insurance = cost;
    this.bankroll -= cost;
    this.canOfferInsurance = false;
  }

  declineInsurance() { this.canOfferInsurance = false; }

  advanceHand() {
    // avanza a la siguiente mano no terminada
    let next = this.activeHand;
    while (next < this.hands.length && this.hands[next].done) next++;
    if (next < this.hands.length) {
      this.activeHand = next;
      // si una mano dividida quedó con 2 cartas y es 21, autoterminar
      const info = this.handInfo(this.hands[next]);
      if (info.total === 21) { this.hands[next].done = true; this.advanceHand(); }
      return;
    }
    // todas terminadas -> turno del crupier
    this.revealAndSettle();
  }

  revealAndSettle() {
    this.dealer.cards.push(this.dealer.hiddenCard);
    this.dealer.hidden = false;
    this.state = 'dealerTurn';

    const anyLive = this.hands.some(h => !this.handInfo(h).bust);
    // El crupier solo juega si hay manos vivas
    if (anyLive) {
      while (true) {
        const info = this.handInfo(this.dealer);
        // La casa se planta en 17 (incluido suave)
        if (info.total >= 17) break;
        this.dealer.cards.push(this.draw());
      }
    }
    this.settle();
  }

  settle() {
    const dInfo = this.handInfo(this.dealer);
    const dealerBJ = this.dealer.cards.length === 2 && dInfo.total === 21;
    let results = [];

    // Resolver seguro
    if (this.insurance > 0) {
      if (dealerBJ) this.bankroll += this.insurance * 3; // recupera + 2:1
      // si no, se pierde (ya descontado)
    }

    for (const h of this.hands) {
      const info = this.handInfo(h);
      const playerBJ = h.cards.length === 2 && info.total === 21 && !h.split;
      let r;
      if (info.bust) {
        r = 'lose';
      } else if (playerBJ && !dealerBJ) {
        this.bankroll += h.bet + h.bet * this.blackjackPays;
        r = 'blackjack';
      } else if (dealerBJ && !playerBJ) {
        r = 'lose';
      } else if (dInfo.bust) {
        this.bankroll += h.bet * 2;
        r = 'win';
      } else if (info.total > dInfo.total) {
        this.bankroll += h.bet * 2;
        r = 'win';
      } else if (info.total < dInfo.total) {
        r = 'lose';
      } else {
        this.bankroll += h.bet; // empate: devuelve apuesta
        r = 'push';
      }
      results.push({ hand: h, result: r, playerTotal: info.total });
      if (r === 'win' || r === 'blackjack') this.stats.won++;
      else if (r === 'lose') this.stats.lost++;
      else this.stats.push++;
    }

    this.stats.hands++;
    this.results = results;
    this.dealerTotal = dInfo.total;
    this.dealerBust = dInfo.bust;
    this.state = 'settled';
  }

  // Registra si una decisión coincidió con la estrategia básica.
  recordDecision(chosen, ideal) {
    this.stats.decisions++;
    if (chosen === ideal) this.stats.correct++;
    return chosen === ideal;
  }

  nextRound() {
    if (this.bankroll < this.minBet) {
      // recarga simbólica para seguir practicando
      this.bankroll = this.startingBankroll;
      this.message = 'Te quedaste sin fichas: recargamos tu saldo para seguir practicando.';
    }
    this.state = 'betting';
    this.bet = 0;
    this.dealer = { cards: [], hidden: true };
    this.hands = [];
    this.results = null;
  }
}

window.Blackjack = Blackjack;
