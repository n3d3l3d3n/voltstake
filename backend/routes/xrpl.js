const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const { getVaultAddress, getXrpBalance, sendFromVault } = require('../lib/xrplClient');

const router = express.Router();

const XRP_TO_VLT_RATE = Number(process.env.XRP_TO_VLT_RATE || 1000); // demo conversion, fictional
const MIN_WITHDRAW_VLT = Number(process.env.MIN_WITHDRAW_VLT || 100);
const WITHDRAW_FEE_VLT = Number(process.env.WITHDRAW_FEE_VLT || 10); // covers XRPL network fee (~demo)

function assignDestinationTag(userId) {
  // Destination tags are 32-bit unsigned ints; keep retrying on collision (extremely rare).
  for (let attempt = 0; attempt < 5; attempt++) {
    const tag = crypto.randomInt(100000, 999999999);
    const existing = db.prepare('SELECT id FROM users WHERE xrpl_destination_tag = ?').get(tag);
    if (!existing) {
      db.prepare('UPDATE users SET xrpl_destination_tag = ? WHERE id = ?').run(tag, userId);
      return tag;
    }
  }
  throw new Error('Impossible d\'attribuer un destination tag unique.');
}

// Returns (and lazily creates) the user's unique deposit identifier on the shared vault address.
router.get('/deposit-info', requireAuth, async (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  let tag = user.xrpl_destination_tag;
  if (!tag) tag = assignDestinationTag(user.id);

  res.json({
    network: 'XRPL Testnet',
    vaultAddress: getVaultAddress(),
    destinationTag: tag,
    conversionRate: `1 XRP (testnet) = ${XRP_TO_VLT_RATE} VLT`,
    note: "Envoyez uniquement du XRP Testnet (sans valeur réelle) à cette adresse, avec le Destination Tag ci-dessus obligatoire, sinon le dépôt ne pourra pas être attribué à votre compte.",
  });
});

router.get('/deposits', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM xrpl_deposits WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.userId);
  res.json({ deposits: rows });
});

router.get('/withdrawals', requireAuth, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM xrpl_withdrawals WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.userId);
  res.json({ withdrawals: rows });
});

router.get('/vault-status', requireAuth, async (req, res) => {
  try {
    const balance = await getXrpBalance(getVaultAddress());
    res.json({ vaultAddress: getVaultAddress(), balanceXrp: balance, network: 'XRPL Testnet' });
  } catch (err) {
    res.status(503).json({ error: 'Impossible de contacter le XRP Ledger Testnet pour le moment.' });
  }
});

router.post('/withdraw', requireAuth, async (req, res) => {
  const { amountVlt, destinationAddress, destinationTag } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

  const amountNum = Number(amountVlt);
  if (!Number.isInteger(amountNum) || amountNum < MIN_WITHDRAW_VLT) {
    return res.status(400).json({ error: `Montant invalide (minimum ${MIN_WITHDRAW_VLT} VLT).` });
  }
  const totalDebit = amountNum + WITHDRAW_FEE_VLT;
  if (totalDebit > user.balance) {
    return res.status(400).json({ error: 'Solde insuffisant (frais réseau inclus).' });
  }
  if (typeof destinationAddress !== 'string' || !destinationAddress.startsWith('r') || destinationAddress.length < 25) {
    return res.status(400).json({ error: 'Adresse XRPL de destination invalide.' });
  }

  const amountXrp = +(amountNum / XRP_TO_VLT_RATE).toFixed(6);
  if (amountXrp <= 0) {
    return res.status(400).json({ error: 'Montant XRP calculé trop faible.' });
  }

  // Debit immediately to prevent double-spend/race conditions, refund on failure.
  const newBalance = user.balance - totalDebit;
  db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(newBalance, user.id);
  db.prepare(
    `INSERT INTO wallet_transactions (id, user_id, amount, type, balance_after) VALUES (?, ?, ?, 'xrpl_withdraw_debit', ?)`
  ).run(uuidv4(), user.id, -totalDebit, newBalance);

  const withdrawalId = uuidv4();
  db.prepare(
    `INSERT INTO xrpl_withdrawals (id, user_id, amount_vlt, amount_xrp, destination_address, destination_tag, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`
  ).run(withdrawalId, user.id, amountNum, amountXrp, destinationAddress, destinationTag ? Number(destinationTag) : null);

  try {
    const txHash = await sendFromVault({
      destinationAddress,
      destinationTag: destinationTag ? Number(destinationTag) : undefined,
      amountXrp,
    });

    db.prepare("UPDATE xrpl_withdrawals SET status = 'sent', tx_hash = ? WHERE id = ?").run(txHash, withdrawalId);

    res.json({ status: 'sent', txHash, amountXrp, balance: newBalance });
  } catch (err) {
    // Refund the user since the on-chain send failed.
    const refunded = db.prepare('SELECT balance FROM users WHERE id = ?').get(user.id).balance + totalDebit;
    db.prepare('UPDATE users SET balance = ? WHERE id = ?').run(refunded, user.id);
    db.prepare(
      `INSERT INTO wallet_transactions (id, user_id, amount, type, balance_after) VALUES (?, ?, ?, 'xrpl_withdraw_refund', ?)`
    ).run(uuidv4(), user.id, totalDebit, refunded);
    db.prepare("UPDATE xrpl_withdrawals SET status = 'failed', error = ? WHERE id = ?").run(err.message, withdrawalId);

    res.status(502).json({ error: 'Échec de l\'envoi XRPL. Le montant a été remboursé.', balance: refunded });
  }
});

module.exports = router;
