/**
 * One-time setup script: generates a new XRPL Testnet wallet for the platform vault
 * and funds it using Ripple's official testnet faucet (free, testnet-only XRP).
 *
 * Usage:
 *   node scripts/generate-vault-wallet.js
 *
 * Copy the printed VAULT_SEED / VAULT_ADDRESS into backend/.env
 */
const xrpl = require('xrpl');

const NETWORK_URL = process.env.XRPL_NETWORK_URL || 'wss://s.altnet.rippletest.net:51233';

async function main() {
  const client = new xrpl.Client(NETWORK_URL);
  await client.connect();

  console.log('Connexion au XRP Ledger Testnet établie. Financement via le faucet officiel...');
  const { wallet, balance } = await client.fundWallet();

  console.log('\n✅ Vault wallet créé et financé avec succès.\n');
  console.log('Ajoutez ces lignes à backend/.env :\n');
  console.log(`VAULT_ADDRESS=${wallet.address}`);
  console.log(`VAULT_SEED=${wallet.seed}`);
  console.log(`\nSolde initial du vault : ${balance} XRP (testnet, sans valeur réelle)\n`);
  console.log('⚠️  Ne partagez jamais VAULT_SEED — il permet de dépenser les fonds du vault.');

  await client.disconnect();
}

main().catch((err) => {
  console.error('Erreur lors de la génération du vault wallet:', err);
  process.exit(1);
});
