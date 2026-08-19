const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function secureRandom() {
  // Returns a float in [0, 1) using a cryptographically secure source.
  return crypto.randomInt(0, 1_000_000_000) / 1_000_000_000;
}

function getUser(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

function applyBalanceDelta(userId, delta, type) {
  const user = getUser(userId);
  const newBalance = user.balance + delta;
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, userId);
  db.prepare(
    'INSERT INTO wallet_transactions (id, user_id, amount, type, balance_after) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), userId, delta, type, newBalance);
  return newBalance;
}

function recordBet({ userId, game, stake, payout, result, multiplier, meta }) {
  db.prepare(
    `INSERT INTO bets (id, user_id, game, stake, payout, result, multiplier, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(uuidv4(), userId, game, stake, payout, result, multiplier, JSON.stringify(meta || {}));
}

// ---------- DICE ----------
// Player picks a target (1-98) and a direction (over/under). House edge ~1%.
router.post('/dice/play', requireAuth, (req, res) => {
  const { stake, target, direction } = req.body || {};
  const user = getUser(req.userId);

  const stakeNum = Number(stake);
  const targetNum = Number(target);

  if (!Number.isFinite(stakeNum) || stakeNum <= 0 || !Number.isInteger(stakeNum)) {
    return res.status(400).json({ error: 'Mise invalide.' });
  }
  if (stakeNum > user.balance) {
    return res.status(400).json({ error: 'Solde insuffisant.' });
  }
  if (!Number.isFinite(targetNum) || targetNum < 2 || targetNum > 98) {
    return res.status(400).json({ error: 'Cible invalide (2-98).' });
  }
  if (direction !== 'over' && direction !== 'under') {
    return res.status(400).json({ error: 'Direction invalide.' });
  }

  const roll = Math.floor(secureRandom() * 10000) / 100; // 0.00 - 99.99
  const winChance = direction === 'over' ? (100 - targetNum) : targetNum;
  const houseEdge = 0.01;
  const multiplier = +((100 / winChance) * (1 - houseEdge)).toFixed(4);

  const win = direction === 'over' ? roll > targetNum : roll < targetNum;
  const payout = win ? Math.floor(stakeNum * multiplier) : 0;
  const netDelta = payout - stakeNum;

  const newBalance = applyBalanceDelta(user.id, netDelta, 'bet_dice');
  recordBet({
    userId: user.id,
    game: 'dice',
    stake: stakeNum,
    payout,
    result: win ? 'win' : 'lose',
    multiplier,
    meta: { roll, target: targetNum, direction },
  });

  res.json({ roll, win, multiplier, payout, balance: newBalance });
});

// ---------- CRASH ----------
// Simplified single-request crash: player sets stake + cashout multiplier target.
// Server generates a crash point; if crash point >= target, player wins at target.
router.post('/crash/play', requireAuth, (req, res) => {
  const { stake, cashoutAt } = req.body || {};
  const user = getUser(req.userId);

  const stakeNum = Number(stake);
  const cashoutNum = Number(cashoutAt);

  if (!Number.isFinite(stakeNum) || stakeNum <= 0 || !Number.isInteger(stakeNum)) {
    return res.status(400).json({ error: 'Mise invalide.' });
  }
  if (stakeNum > user.balance) {
    return res.status(400).json({ error: 'Solde insuffisant.' });
  }
  if (!Number.isFinite(cashoutNum) || cashoutNum < 1.01 || cashoutNum > 1000) {
    return res.status(400).json({ error: 'Multiplicateur de retrait invalide.' });
  }

  // Exponential-ish distribution with house edge ~3%.
  const houseEdge = 0.03;
  const r = secureRandom();
  const crashPoint = Math.max(1, +((1 - houseEdge) / (1 - r)).toFixed(2));

  const win = crashPoint >= cashoutNum;
  const payout = win ? Math.floor(stakeNum * cashoutNum) : 0;
  const netDelta = payout - stakeNum;

  const newBalance = applyBalanceDelta(user.id, netDelta, 'bet_crash');
  recordBet({
    userId: user.id,
    game: 'crash',
    stake: stakeNum,
    payout,
    result: win ? 'win' : 'lose',
    multiplier: win ? cashoutNum : crashPoint,
    meta: { crashPoint, cashoutAt: cashoutNum },
  });

  res.json({ crashPoint, win, payout, balance: newBalance });
});

// ---------- MINES ----------
function minesMultiplier(gridSize, mineCount, safePicks) {
  const totalTiles = gridSize * gridSize;
  const houseEdge = 0.02;
  let probability = 1;
  for (let i = 0; i < safePicks; i++) {
    probability *= (totalTiles - mineCount - i) / (totalTiles - i);
  }
  return +((1 / probability) * (1 - houseEdge)).toFixed(4);
}

router.post('/mines/start', requireAuth, (req, res) => {
  const { stake, gridSize = 5, mineCount = 3 } = req.body || {};
  const user = getUser(req.userId);

  const stakeNum = Number(stake);
  const grid = Number(gridSize);
  const mines = Number(mineCount);

  if (!Number.isFinite(stakeNum) || stakeNum <= 0 || !Number.isInteger(stakeNum)) {
    return res.status(400).json({ error: 'Mise invalide.' });
  }
  if (stakeNum > user.balance) {
    return res.status(400).json({ error: 'Solde insuffisant.' });
  }
  if (![5].includes(grid)) {
    return res.status(400).json({ error: 'Taille de grille invalide.' });
  }
  if (!Number.isInteger(mines) || mines < 1 || mines > grid * grid - 1) {
    return res.status(400).json({ error: 'Nombre de mines invalide.' });
  }

  const activeSession = db
    .prepare("SELECT id FROM mines_sessions WHERE user_id = ? AND status = 'active'")
    .get(user.id);
  if (activeSession) {
    return res.status(400).json({ error: 'Une partie Mines est déjà en cours.' });
  }

  const totalTiles = grid * grid;
  const positions = new Set();
  while (positions.size < mines) {
    positions.add(Math.floor(secureRandom() * totalTiles));
  }

  applyBalanceDelta(user.id, -stakeNum, 'bet_mines_stake');

  const sessionId = uuidv4();
  db.prepare(
    `INSERT INTO mines_sessions (id, user_id, stake, grid_size, mine_count, mine_positions, revealed, status)
     VALUES (?, ?, ?, ?, ?, ?, '[]', 'active')`
  ).run(sessionId, user.id, stakeNum, grid, mines, JSON.stringify([...positions]));

  const newBalance = getUser(user.id).balance;
  res.json({ sessionId, gridSize: grid, mineCount: mines, balance: newBalance });
});

router.post('/mines/reveal', requireAuth, (req, res) => {
  const { sessionId, tile } = req.body || {};
  const session = db
    .prepare("SELECT * FROM mines_sessions WHERE id = ? AND user_id = ? AND status = 'active'")
    .get(sessionId, req.userId);

  if (!session) return res.status(404).json({ error: 'Partie introuvable ou terminée.' });

  const tileNum = Number(tile);
  const totalTiles = session.grid_size * session.grid_size;
  if (!Number.isInteger(tileNum) || tileNum < 0 || tileNum >= totalTiles) {
    return res.status(400).json({ error: 'Case invalide.' });
  }

  const revealed = JSON.parse(session.revealed);
  const minePositions = JSON.parse(session.mine_positions);

  if (revealed.includes(tileNum)) {
    return res.status(400).json({ error: 'Case déjà révélée.' });
  }

  if (minePositions.includes(tileNum)) {
    db.prepare("UPDATE mines_sessions SET status = 'busted', revealed = ? WHERE id = ?")
      .run(JSON.stringify([...revealed, tileNum]), session.id);

    recordBet({
      userId: req.userId,
      game: 'mines',
      stake: session.stake,
      payout: 0,
      result: 'lose',
      multiplier: 0,
      meta: { gridSize: session.grid_size, mineCount: session.mine_count, revealed, hitMine: tileNum },
    });

    return res.json({ busted: true, minePositions, balance: getUser(req.userId).balance });
  }

  const newRevealed = [...revealed, tileNum];
  db.prepare('UPDATE mines_sessions SET revealed = ? WHERE id = ?')
    .run(JSON.stringify(newRevealed), session.id);

  const multiplier = minesMultiplier(session.grid_size, session.mine_count, newRevealed.length);
  const potentialPayout = Math.floor(session.stake * multiplier);

  res.json({ busted: false, revealed: newRevealed, multiplier, potentialPayout });
});

router.post('/mines/cashout', requireAuth, (req, res) => {
  const { sessionId } = req.body || {};
  const session = db
    .prepare("SELECT * FROM mines_sessions WHERE id = ? AND user_id = ? AND status = 'active'")
    .get(sessionId, req.userId);

  if (!session) return res.status(404).json({ error: 'Partie introuvable ou terminée.' });

  const revealed = JSON.parse(session.revealed);
  if (revealed.length === 0) {
    return res.status(400).json({ error: 'Révélez au moins une case avant de retirer vos gains.' });
  }

  const multiplier = minesMultiplier(session.grid_size, session.mine_count, revealed.length);
  const payout = Math.floor(session.stake * multiplier);

  db.prepare("UPDATE mines_sessions SET status = 'cashed_out' WHERE id = ?").run(session.id);
  const newBalance = applyBalanceDelta(req.userId, payout, 'bet_mines_payout');

  recordBet({
    userId: req.userId,
    game: 'mines',
    stake: session.stake,
    payout,
    result: 'win',
    multiplier,
    meta: { gridSize: session.grid_size, mineCount: session.mine_count, revealed },
  });

  res.json({ payout, multiplier, balance: newBalance });
});

module.exports = router;
