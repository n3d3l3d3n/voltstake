const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { fetchVaultIncomingPayments } = require('../lib/xrplClient');

const POLL_INTERVAL_MS = Number(process.env.XRPL_POLL_INTERVAL_MS || 8000);
const XRP_TO_VLT_RATE = Number(process.env.XRP_TO_VLT_RATE || 1000); // demo conversion rate, fictional

let polling = false;

async function pollOnce() {
  if (polling) return;
  polling = true;
  try {
    const payments = await fetchVaultIncomingPayments(50);

    for (const payment of payments) {
      if (payment.destinationTag == null) continue; // can't attribute to a user without a tag

      const already = db.prepare('SELECT id FROM xrpl_deposits WHERE tx_hash = ?').get(payment.hash);
      if (already) continue;

      const user = db.prepare('SELECT * FROM users WHERE xrpl_destination_tag = ?').get(payment.destinationTag);
      if (!user) continue; // unknown tag, ignore (funds remain in vault, visible to an admin)

      const creditedVlt = Math.floor(payment.amountXrp * XRP_TO_VLT_RATE);
      const newBalance = user.balance + creditedVlt;

      const insertDeposit = db.prepare(
        `INSERT INTO xrpl_deposits (id, user_id, tx_hash, amount_drops, amount_xrp, credited_vlt, status)
         VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`
      );
      const updateBalance = db.prepare('UPDATE users SET balance = ? WHERE id = ?');
      const insertTxLog = db.prepare(
        `INSERT INTO wallet_transactions (id, user_id, amount, type, balance_after)
         VALUES (?, ?, ?, 'xrpl_deposit', ?)`
      );

      const runAll = db.transaction(() => {
        insertDeposit.run(uuidv4(), user.id, payment.hash, payment.amountDrops, payment.amountXrp, creditedVlt);
        updateBalance.run(newBalance, user.id);
        insertTxLog.run(uuidv4(), user.id, creditedVlt, newBalance);
      });
      runAll();

      console.log(
        `[xrpl-watcher] Dépôt crédité: ${payment.amountXrp} XRP (tag ${payment.destinationTag}) → +${creditedVlt} VLT pour ${user.username}`
      );
    }
  } catch (err) {
    console.error('[xrpl-watcher] Erreur de polling:', err.message);
  } finally {
    polling = false;
  }
}

function startDepositWatcher() {
  if (!process.env.VAULT_SEED) {
    console.warn('[xrpl-watcher] VAULT_SEED absent — le suivi des dépôts XRPL est désactivé.');
    return;
  }
  console.log(`[xrpl-watcher] Démarrage (intervalle ${POLL_INTERVAL_MS}ms, taux ${XRP_TO_VLT_RATE} VLT/XRP).`);
  pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
}

module.exports = { startDepositWatcher };
