import { useEffect, useState } from 'react';
import RequireAuth from '../components/RequireAuth';
import { useAuth } from '../lib/AuthContext';
import { api } from '../lib/api';

function GAME_LABEL(game) {
  return { dice: '🎲 Dice', crash: '🚀 Crash', mines: '💎 Mines' }[game] || game;
}

function HistoryPage() {
  const { user } = useAuth();
  const [bets, setBets] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const { setBalance } = useAuth();

  useEffect(() => {
    api
      .history()
      .then((res) => setBets(res.bets))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const useFaucet = async () => {
    setFaucetLoading(true);
    setError('');
    try {
      const res = await api.faucet();
      setBalance(res.balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <div>
      <div className="game-title">
        <span style={{ fontSize: 28 }}>📜</span>
        <h1>Historique des mises</h1>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {user && user.balance <= 200 && (
        <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Solde bas ? Rechargez 500 VLT fictifs gratuitement.</span>
          <button className="btn btn-primary" disabled={faucetLoading} onClick={useFaucet}>
            {faucetLoading ? 'Rechargement…' : 'Recharger 500 VLT'}
          </button>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="empty-state">Chargement…</div>
        ) : bets.length === 0 ? (
          <div className="empty-state">Aucune mise pour le moment. Allez tenter votre chance !</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Jeu</th>
                <th>Mise</th>
                <th>Multiplicateur</th>
                <th>Gain</th>
                <th>Résultat</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {bets.map((b) => (
                <tr key={b.id}>
                  <td>{GAME_LABEL(b.game)}</td>
                  <td>{b.stake.toLocaleString('fr-FR')} VLT</td>
                  <td>{b.multiplier ? `${Number(b.multiplier).toFixed(2)}x` : '—'}</td>
                  <td>{b.payout.toLocaleString('fr-FR')} VLT</td>
                  <td>
                    <span className={`tag ${b.result === 'win' ? 'tag-win' : 'tag-lose'}`}>
                      {b.result === 'win' ? 'Gagné' : 'Perdu'}
                    </span>
                  </td>
                  <td>{new Date(b.created_at + 'Z').toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <HistoryPage />
    </RequireAuth>
  );
}
