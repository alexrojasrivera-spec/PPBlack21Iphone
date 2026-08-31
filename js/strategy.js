// strategy.js
// Estrategia básica de Blackjack para 6 barajas, la casa se planta en 17 (S17),
// se permite doblar después de dividir (DAS). Rendición no incluida.
// Devuelve la jugada matemáticamente óptima contra la casa.
//
// Acciones posibles: 'H' (pedir/hit), 'S' (plantarse/stand),
// 'D' (doblar/double), 'P' (dividir/split).
// Cuando la acción ideal no está disponible (p. ej. doblar sin ser las dos
// primeras cartas) se aplica una alternativa sensata en getAdvice().

const StrategyLabels = {
  H: 'Pedir',
  S: 'Plantarse',
  D: 'Doblar',
  P: 'Dividir',
};

// value de la carta del crupier: 2..10, 11 = As
function dealerIndex(upcard) {
  // Devuelve 0..9 para crupier 2,3,4,5,6,7,8,9,10,A
  return upcard === 11 ? 9 : upcard - 2;
}

// Estrategia para pares. hand es [carta, carta] con mismo valor base.
// pairVal: 2..10 u 11 (As). Devuelve 'P' o null (usar totales duros/suaves).
function pairAction(pairVal, dealerUp) {
  const d = dealerIndex(dealerUp);
  const T = {
    // índice 0..9 = crupier 2..A
    2:  ['P','P','P','P','P','P','H','H','H','H'],
    3:  ['P','P','P','P','P','P','H','H','H','H'],
    4:  ['H','H','H','P','P','H','H','H','H','H'],
    6:  ['P','P','P','P','P','H','H','H','H','H'],
    7:  ['P','P','P','P','P','P','H','H','H','H'],
    8:  ['P','P','P','P','P','P','P','P','P','P'],
    9:  ['P','P','P','P','P','S','P','P','S','S'],
    11: ['P','P','P','P','P','P','P','P','P','P'], // ases
  };
  if (pairVal === 5 || pairVal === 10) return null; // 5s y 10s nunca se dividen
  const row = T[pairVal];
  if (!row) return null;
  return row[d] === 'P' ? 'P' : null;
}

// Totales suaves (una mano con un As contando como 11). soft total 13..20.
function softAction(total, dealerUp) {
  const d = dealerIndex(dealerUp);
  const T = {
    13: ['H','H','H','D','D','H','H','H','H','H'], // A,2
    14: ['H','H','H','D','D','H','H','H','H','H'], // A,3
    15: ['H','H','D','D','D','H','H','H','H','H'], // A,4
    16: ['H','H','D','D','D','H','H','H','H','H'], // A,5
    17: ['H','D','D','D','D','H','H','H','H','H'], // A,6
    18: ['D','D','D','D','D','S','S','H','H','H'], // A,7
    19: ['S','S','S','S','S','S','S','S','S','S'], // A,8
    20: ['S','S','S','S','S','S','S','S','S','S'], // A,9
  };
  const row = T[total];
  if (!row) return total >= 19 ? 'S' : 'H';
  return row[d];
}

// Totales duros (sin As, o As contando como 1). hard total 5..21.
function hardAction(total, dealerUp) {
  const d = dealerIndex(dealerUp);
  if (total >= 17) return 'S';
  if (total <= 8) return 'H';
  const T = {
    9:  ['H','D','D','D','D','H','H','H','H','H'],
    10: ['D','D','D','D','D','D','D','D','H','H'],
    11: ['D','D','D','D','D','D','D','D','D','H'],
    12: ['H','H','S','S','S','H','H','H','H','H'],
    13: ['S','S','S','S','S','H','H','H','H','H'],
    14: ['S','S','S','S','S','H','H','H','H','H'],
    15: ['S','S','S','S','S','H','H','H','H','H'],
    16: ['S','S','S','S','S','H','H','H','H','H'],
  };
  return T[total][d];
}

// Calcula el valor de una mano: {total, soft (bool), pair (valor o null)}
function evaluateHand(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += c.value;
    if (c.rank === 'A') aces++;
  }
  let soft = false;
  // Ajusta ases de 11 a 1 mientras nos pasemos de 21
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  soft = aces > 0; // queda al menos un as contando como 11
  const pair = cards.length === 2 && cards[0].value === cards[1].value
    ? cards[0].value : null;
  return { total, soft, pair, bust: total > 21, blackjack: cards.length === 2 && total === 21 };
}

// Acción ideal "pura" (sin considerar disponibilidad).
function idealAction(cards, dealerUp) {
  const info = evaluateHand(cards);
  // Pares
  if (info.pair !== null) {
    const p = pairAction(info.pair, dealerUp);
    if (p === 'P') return 'P';
  }
  // Suaves
  if (info.soft && info.total >= 13 && info.total <= 20) {
    return softAction(info.total, dealerUp);
  }
  // Duros
  return hardAction(info.total, dealerUp);
}

// Consejo considerando qué acciones puede hacer el jugador ahora mismo.
// avail: {canDouble, canSplit, canSurrender}
// Devuelve { action, label, reason } donde action es la jugada recomendada
// entre las disponibles.
function getAdvice(cards, dealerUp, avail) {
  const ideal = idealAction(cards, dealerUp);
  const info = evaluateHand(cards);
  let action = ideal;
  let note = '';

  if (ideal === 'P' && !avail.canSplit) {
    // Sin poder dividir: trata como total normal
    action = info.soft ? softAction(info.total, dealerUp) : hardAction(info.total, dealerUp);
    note = ' (no puedes dividir aquí)';
  }
  if (action === 'D' && !avail.canDouble) {
    // Sin poder doblar: doblar suave => plantarse si total>=18, si no pedir.
    // doblar duro => pedir.
    if (info.soft && info.total >= 18) action = 'S';
    else action = 'H';
    note = ' (no puedes doblar aquí, siguiente mejor jugada)';
  }

  const reason = explain(cards, dealerUp, ideal, info);
  return { action, ideal, label: StrategyLabels[action], reason: reason + note };
}

function dealerName(up) {
  return up === 11 ? 'As' : String(up);
}

// Explicación didáctica corta.
function explain(cards, dealerUp, ideal, info) {
  const d = dealerName(dealerUp);
  const weak = dealerUp >= 2 && dealerUp <= 6; // crupier "débil"
  const strong = dealerUp >= 7 || dealerUp === 11;

  if (info.pair === 11) return 'Divide siempre los ases: cada As tiene grandes chances de formar 21.';
  if (info.pair === 8) return 'Divide siempre los 8: un 16 duro es la peor mano; dos manos con 8 son mucho mejores.';

  if (ideal === 'P') {
    return `El crupier muestra ${d} (mano ${weak ? 'débil' : 'fuerte'}); dividir este par aprovecha mejor la situación.`;
  }
  if (ideal === 'D') {
    return `Con ${info.soft ? 'una mano suave de ' : ''}${info.total} y el crupier mostrando ${d}, doblar maximiza tu ganancia esperada.`;
  }
  if (ideal === 'S') {
    if (weak && info.total >= 12 && !info.soft) {
      return `Plántate: el crupier con ${d} tiene alta probabilidad de pasarse. No arriesgues tu mano de ${info.total}.`;
    }
    return `Plántate con ${info.total}: pedir otra carta arriesga demasiado pasarte.`;
  }
  // Hit
  if (strong) {
    return `El crupier con ${d} es fuerte; con ${info.total} necesitas mejorar tu mano pidiendo carta.`;
  }
  return `Con ${info.total} conviene pedir: aún es probable mejorar sin pasarte.`;
}

window.Strategy = { getAdvice, idealAction, evaluateHand, StrategyLabels };
