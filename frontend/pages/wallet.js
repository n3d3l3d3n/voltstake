import { useEffect, useState } from 'react';
import RequireAuth from '../components/RequireAuth';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

function WalletPage() {
  const { user, setBalance } = useAuth();
  const [depositInfo, setDepositInfo] = useState(null);
  const [deposits, setDeposits] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [wAmount, setWAmount] = useState(200);
  const [wAddress, setWAddress] = useState('');
  const [wTag, setWTag] = useState('');
  const [wLoading, setWLoading] = useState(false);
  const [wSuccess, setWSuccess] = useState(null);

  const loadAll = async () => {
    setError('');
    try {
      const [info, dep, wit] = await Promise.all([
        api.xrplDepositInfo(),
        api.xrplDeposits(),
        api.xrplWithdrawals(),
      ]);
      setDepositInfo(info);
      setDeposits(dep.deposits);
      setWithdrawals(wit.withdrawals);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const submitWithdraw = async (e) => {
    e.preventDefault();
    setError('');
    setWSuccess(null);
    setWLoading(true);
    try {
      const res = await api.xrplWithdraw({
        amountVlt: Number(wAmount),
        destinationAddress: wAddress.trim(),
        destinationTag: wTag ? Number(wTag) : undefined,
      });
      setBalance(res.balance);
      setWSuccess(res);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setWLoading(false);
    }
  };

  return (
    <div>
      <div className="game-title">
        <span style={{ fontSize: 28 }}>🧾</span>
        <h1>Wallet XRPL (Testnet)</h1>
      </div>

      <div className="alert alert-success" style={{ marginBottom: 20 }}>
        Réseau <strong>XRP Ledger Testnet</strong> — XRP entièrement factice, sans valeur réelle. N'envoyez
        jamais de XRP réel à ces adresses.
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2">
        {/* DEPOSIT */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dépôt</h3>
          {loading ? (
            <p style={{ color: 'var(--text-1)' }}>Chargement…</p>
          ) : depositInfo ? (
            <>
              <div className="form-group">
                <label>Adresse du vault (destination)</label>
                <input readOnly value={depositInfo.vaultAddress} onFocus={(e) => e.target.select()} />
              </div>
              <div className="form-group">
                <label>Destination Tag (obligatoire)</label>
                <input readOnly value={depositInfo.destinationTag} onFocus={(e) => e.target.select()} />
              </div>
              <p style={{ color: 'var(--text-1)', fontSize: 13.5 }}>{depositInfo.note}</p>
              <p style={{ color: 'var(--text-1)', fontSize: 13.5 }}>
                Taux : <strong>{depositInfo.conversionRate}</strong>
              </p>
              <p style={{ fontSize: 13 }}>
                Besoin de XRP testnet ? Utilisez le{' '}
                <a href="https://xrpl.org/xrp-testnet-faucet.html" target="_blank" rel="noreferrer" style={{ color: 'var(--cyan)' }}>
                  faucet officiel XRPL
                </a>{' '}
                puis envoyez les fonds à l'adresse ci-dessus avec votre tag.
              </p>
            </>
          ) : null}
        </div>

        {/* WITHDRAW */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Retrait</h3>
          {wSuccess && (
            <div className="alert alert-success">
              Envoyé ! Hash : {wSuccess.txHash?.slice(0, 16)}… ({wSuccess.amountXrp} XRP testnet)
            </div>
          )}
          <form onSubmit={submitWithdraw}>
            <div className="form-group">
              <label>Montant (VLT)</label>
              <input type="number" min={100} value={wAmount} onChange={(e) => setWAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Adresse XRPL de destination</label>
              <input value={wAddress} onChange={(e) => setWAddress(e.target.value)} placeholder="r..." required />
            </div>
            <div className="form-group">
              <label>Destination Tag (optionnel)</label>
              <input value={wTag} onChange={(e) => setWTag(e.target.value)} placeholder="Laisser vide si non requis" />
            </div>
            <button className="btn btn-primary btn-block" disabled={wLoading || !user || wAmount > user.balance}>
              {wLoading ? 'Envoi…' : 'Retirer vers XRPL Testnet'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dépôts récents</h3>
          {deposits.length === 0 ? (
            <p style={{ color: 'var(--text-1)' }}>Aucun dépôt pour le moment.</p>
          ) : (
            <table className="table">
              <thead><tr><th>XRP</th><th>VLT crédités</th><th>Date</th></tr></thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id}>
                    <td>{d.amount_xrp}</td>
                    <td>{d.credited_vlt.toLocaleString('fr-FR')}</td>
                    <td>{new Date(d.created_at + 'Z').toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Retraits récents</h3>
          {withdrawals.length === 0 ? (
            <p style={{ color: 'var(--text-1)' }}>Aucun retrait pour le moment.</p>
          ) : (
            <table className="table">
              <thead><tr><th>XRP</th><th>Statut</th><th>Date</th></tr></thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{w.amount_xrp}</td>
                    <td>
                      <span className={`tag ${w.status === 'sent' ? 'tag-win' : 'tag-lose'}`}>{w.status}</span>
                    </td>
                    <td>{new Date(w.created_at + 'Z').toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <WalletPage />
    </RequireAuth>
  );
}
