import { useState } from 'react';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

function CrashGame() {
  const { user, setBalance } = useAuth();
  const [stake, setStake] = useState(50);
  const [cashoutAt, setCashoutAt] = useState(2.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const play = async () => {
    setError('');
    setLoading(true);
    setResult(null);
    try {
      const res = await api.playCrash({ stake: Number(stake), cashoutAt: Number(cashoutAt) });
      // small suspense delay for UX
      await new Promise((r) => setTimeout(r, 600));
      setResult(res);
      setBalance(res.balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="game-title">
        <span style={{ fontSize: 28 }}>🚀</span>
        <h1>Crash</h1>
      </div>

      <div className="game-layout">
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label>Mise (VLT)</label>
            <input
              type="number"
              min={1}
              max={user?.balance || 0}
              value={stake}
              onChange={(e) => setStake(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Encaisser à (x)</label>
            <input
              type="number"
              min={1.01}
              max={1000}
              step={0.01}
              value={cashoutAt}
              onChange={(e) => setCashoutAt(e.target.value)}
            />
          </div>

          <div className="stat-row">
            <span>Gain potentiel</span>
            <span>{Math.floor(stake * cashoutAt).toLocaleString('fr-FR')} VLT</span>
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 18 }}
            disabled={loading || !stake || stake <= 0 || stake > (user?.balance || 0)}
            onClick={play}
          >
            {loading ? 'Envol…' : 'Lancer la fusée'}
          </button>
        </div>

        <div className="card card-glow">
          <div
            className={`crash-display ${
              loading ? 'idle' : result ? (result.win ? 'win' : 'lose') : 'idle'
            }`}
          >
            {loading && '🚀 Décollage…'}
            {!loading && result && `${result.crashPoint.toFixed(2)}x`}
            {!loading && !result && 'Prêt au décollage'}
          </div>

          {result && (
            <div className={`result-banner ${result.win ? 'result-win' : 'result-lose'}`} style={{ marginTop: 18 }}>
              {result.win
                ? `Encaissé à ${cashoutAt}x — +${result.payout.toLocaleString('fr-FR')} VLT`
                : `Crash avant votre cible (${result.crashPoint.toFixed(2)}x)`}
            </div>
          )}

          <div style={{ marginTop: 20 }}>
            <div className="stat-row"><span>Cible d'encaissement</span><span>{cashoutAt}x</span></div>
            <div className="stat-row"><span>Solde</span><span>{user?.balance.toLocaleString('fr-FR')} VLT</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <CrashGame />
    </RequireAuth>
  );
}
