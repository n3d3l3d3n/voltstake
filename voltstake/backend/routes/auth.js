const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(u) {
  return { id: u.id, username: u.username, email: u.email, balance: u.balance, created_at: u.created_at };
}

router.post('/register', (req, res) => {
  const { username, email, password } = req.body || {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: "Nom d'utilisateur invalide (3-20 caractères, lettres/chiffres/_)." });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Email invalide.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Nom d\'utilisateur ou email déjà utilisé.' });
  }

  const id = uuidv4();
  const passwordHash = bcrypt.hashSync(password, 10);
  const startingBalance = parseInt(process.env.STARTING_BALANCE || '1000', 10);

  db.prepare(
    'INSERT INTO users (id, username, email, password_hash, balance) VALUES (?, ?, ?, ?, ?)'
  ).run(id, username, email, passwordHash, startingBalance);

  db.prepare(
    'INSERT INTO wallet_transactions (id, user_id, amount, type, balance_after) VALUES (?, ?, ?, ?, ?)'
  ).run(uuidv4(), id, startingBalance, 'bonus_signup', startingBalance);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Identifiants requis.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Identifiants incorrects.' });
  }

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ user: publicUser(user) });
});

module.exports = router;
