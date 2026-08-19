const xrpl = require('xrpl');

const NETWORK_URL = process.env.XRPL_NETWORK_URL || 'wss://s.altnet.rippletest.net:51233';

let clientPromise = null;

/**
 * Returns a connected xrpl.js Client, reusing a single connection.
 * Reconnects automatically if the socket drops.
 */
async function getClient() {
  if (clientPromise) {
    const client = await clientPromise;
    if (client.isConnected()) return client;
  }
  clientPromise = (async () => {
    const client = new xrpl.Client(NETWORK_URL);
    await client.connect();
    client.on('disconnected', () => {
      console.warn('[xrpl] Connexion perdue, reconnexion au prochain appel.');
      clientPromise = null;
    });
    return client;
  })();
  return clientPromise;
}

/**
 * Loads the vault (hot wallet) from the seed configured in the environment.
 * This wallet holds pooled testnet XRP and signs all outgoing withdrawals.
 */
function getVaultWallet() {
  const seed = process.env.VAULT_SEED;
  if (!seed) {
    throw new Error('VAULT_SEED manquant dans .env — exécutez scripts/generate-vault-wallet.js');
  }
  return xrpl.Wallet.fromSeed(seed);
}

function getVaultAddress() {
  return process.env.VAULT_ADDRESS || getVaultWallet().address;
}

async function getXrpBalance(address) {
  const client = await getClient();
  try {
    const balance = await client.getXrpBalance(address);
    return Number(balance);
  } catch (err) {
    if (err?.data?.error === 'actNotFound') return 0;
    throw err;
  }
}

/**
 * Sends testnet XRP from the vault wallet to a destination address.
 * Returns the validated transaction hash.
 */
async function sendFromVault({ destinationAddress, destinationTag, amountXrp }) {
  const client = await getClient();
  const vaultWallet = getVaultWallet();

  const tx = {
    TransactionType: 'Payment',
    Account: vaultWallet.address,
    Amount: xrpl.xrpToDrops(amountXrp.toString()),
    Destination: destinationAddress,
  };
  if (destinationTag) tx.DestinationTag = Number(destinationTag);

  const prepared = await client.autofill(tx);
  const signed = vaultWallet.sign(prepared);
  const result = await client.submitAndWait(signed.tx_blob);

  const engineResult = result.result.meta?.TransactionResult;
  if (engineResult !== 'tesSUCCESS') {
    throw new Error(`Échec de la transaction XRPL: ${engineResult}`);
  }

  return result.result.hash;
}

/**
 * Fetches recent incoming Payment transactions to the vault address, most recent first.
 * Used by the deposit watcher to detect and credit new deposits.
 */
async function fetchVaultIncomingPayments(limit = 40) {
  const client = await getClient();
  const vaultAddress = getVaultAddress();

  const response = await client.request({
    command: 'account_tx',
    account: vaultAddress,
    limit,
    ledger_index_min: -1,
    ledger_index_max: -1,
  });

  const txs = response.result.transactions || [];

  return txs
    .filter((entry) => {
      const tx = entry.tx || entry.tx_json;
      const validated = entry.validated;
      const meta = entry.meta;
      return (
        validated &&
        tx?.TransactionType === 'Payment' &&
        tx?.Destination === vaultAddress &&
        meta?.TransactionResult === 'tesSUCCESS' &&
        typeof (meta?.delivered_amount ?? tx?.Amount) === 'string' // XRP-only payments (drops as string)
      );
    })
    .map((entry) => {
      const tx = entry.tx || entry.tx_json;
      const meta = entry.meta;
      const drops = meta?.delivered_amount ?? tx.Amount;
      return {
        hash: tx.hash || entry.hash,
        from: tx.Account,
        destinationTag: tx.DestinationTag ?? null,
        amountDrops: drops,
        amountXrp: Number(xrpl.dropsToXrp(drops)),
        ledgerIndex: entry.ledger_index,
      };
    });
}

module.exports = {
  getClient,
  getVaultWallet,
  getVaultAddress,
  getXrpBalance,
  sendFromVault,
  fetchVaultIncomingPayments,
};
