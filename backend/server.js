require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const gamesRoutes = require('./routes/games');
const xrplRoutes = require('./routes/xrpl');
const { startDepositWatcher } = require('./services/depositWatcher');

const app = express();

// Indispensable sur Render / Vercel pour gérer correctement les IPs et le rate limiter
app.set('trust proxy', 1);

// Gestion dynamique des origines CORS (autorise localhost et vos domaines distants)
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Autorise les requêtes sans origine (comme Postman ou curl) et les domaines configurés
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Non autorisé par CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/xrpl', xrplRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Erreur serveur.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`VoltStake API démarrée sur le port ${PORT}`);
  startDepositWatcher();
});
