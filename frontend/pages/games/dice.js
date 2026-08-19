import { useState } from 'react';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

function DiceGame() {
  const { user, setBalance } = useAuth();
  const [stake, setStake] = useState(50);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState('over');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const winChance = direction === 'over' ? 100 - target : target;
  const multiplier = +((100 / winChance) * 0.99).toFixed(4);

  const play = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.playDice({ stake: Number(stake), target: Number(target), direction });
      setResult(res);
      setBalance(res.balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const markerPos = result ? Math.min(99.5, Math.max(0, result.roll)) : null;

  return (
    <div>
      <div className="game-title">
        <span style={{ fontSize: 28 }}>🎲</span>
        <h1>Dice</h1>
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
            <label>Direction</label>
            <div className="toggle-group">
              <button
                type="button"
                className={`toggle-btn ${direction === 'under' ? 'active' : ''}`}
                onClick={() => setDirection('under')}
              >
                Under
              </button>
              <button
                type="button"
                className={`toggle-btn ${direction === 'over' ? 'active' : ''}`}
                onClick={() => setDirection('over')}
              >
                Over
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Cible : {target}</label>
            <input
              type="range"
              min={2}
              max={98}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
            />
          </div>

          <div className="stat-row">
            <span>Chance de gain</span>
            <span>{winChance.toFixed(2)}%</span>
          </div>
          <div className="stat-row">
            <span>Multiplicateur</span>
            <span>{multiplier}x</span>
          </div>
          <div className="stat-row">
            <span>Gain potentiel</span>
            <span>{Math.floor(stake * multiplier).toLocaleString('fr-FR')} VLT</span>
          </div>

          <button
            className="btn btn-primary btn-block btn-lg"
            style={{ marginTop: 18 }}
            disabled={loading || !stake || stake <= 0 || stake > (user?.balance || 0)}
            onClick={play}
          >
            {loading ? 'Lancement…' : 'Lancer les dés'}
          </button>
        </div>

        <div className="card card-glow">
          {result && (
            <div className={`result-banner ${result.win ? 'result-win' : 'result-lose'}`}>
              {result.win ? `Gagné ! +${result.payout.toLocaleString('fr-FR')} VLT` : 'Perdu'}
            </div>
          )}

          <div className="dice-track">
            <div className="dice-target-marker" style={{ left: `${target}%` }} />
            {markerPos !== null && <div className="dice-marker" style={{ left: `${markerPos}%` }} />}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-1)', fontSize: 13 }}>
            <span>0</span>
            <span>Résultat : {result ? result.roll.toFixed(2) : '—'}</span>
            <span>100</span>
          </div>

          <div style={{ marginTop: 30 }}>
            <div className="stat-row"><span>Direction</span><span>{direction === 'over' ? 'Over' : 'Under'} {target}</span></div>
            <div className="stat-row"><span>Multiplicateur appliqué</span><span>{result ? `${result.multiplier}x` : '—'}</span></div>
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
      <DiceGame />
    </RequireAuth>
  );
}
