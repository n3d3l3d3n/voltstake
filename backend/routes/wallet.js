const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/balance', requireAuth, (req, res) => {
  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.userId);
  res.json({ balance: user.balance });
});

router.get('/transactions', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.userId);
  res.json({ transactions: rows });
});

// Faucet fictif : recharge de jetons de démo, plafonnée, uniquement pour usage démo/portfolio.
router.post('/faucet', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (user.balance > 200) {
    return res.status(400).json({ error: 'Le faucet est disponible seulement sous 200 jetons.' });
  }
  const amount = 500;
  const newBalance = user.balance + amount;
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, user.id);
  db.prepare(
    'INSERT INTO wallet_transactions (id, user_id, amount, type, balance_after) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), user.id, amount, 'faucet', newBalance);
  res.json({ balance: newBalance });
});

router.get('/history', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM bets WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.userId);
  res.json({ bets: rows });
});

module.exports = router;
