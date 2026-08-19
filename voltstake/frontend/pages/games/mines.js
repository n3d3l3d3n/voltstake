import { useState } from 'react';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../lib/AuthContext';
import { api } from '../../lib/api';

const GRID_SIZE = 5;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

function MinesGame() {
  const { user, setBalance } = useAuth();
  const [stake, setStake] = useState(50);
  const [mineCount, setMineCount] = useState(3);
  const [session, setSession] = useState(null); // { sessionId, revealed: [], multiplier, potentialPayout }
  const [minePositions, setMinePositions] = useState(null);
  const [busted, setBusted] = useState(false);
  const [cashedOut, setCashedOut] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setError('');
    setLoading(true);
    setBusted(false);
    setCashedOut(null);
    setMinePositions(null);
    try {
      const res = await api.startMines({ stake: Number(stake), gridSize: GRID_SIZE, mineCount: Number(mineCount) });
      setSession({ sessionId: res.sessionId, revealed: [], multiplier: 1, potentialPayout: Number(stake) });
      setBalance(res.balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reveal = async (tile) => {
    if (!session || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.revealMines({ sessionId: session.sessionId, tile });
      if (res.busted) {
        setBusted(true);
        setMinePositions(res.minePositions);
        setBalance(res.balance);
      } else {
        setSession({
          ...session,
          revealed: res.revealed,
          multiplier: res.multiplier,
          potentialPayout: res.potentialPayout,
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cashout = async () => {
    if (!session || loading) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.cashoutMines({ sessionId: session.sessionId });
      setCashedOut(res);
      setBalance(res.balance);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setSession(null);
    setBusted(false);
    setCashedOut(null);
    setMinePositions(null);
  };

  const gameOver = busted || cashedOut;

  return (
    <div>
      <div className="game-title">
        <span style={{ fontSize: 28 }}>💎</span>
        <h1>Mines</h1>
      </div>

      <div className="game-layout">
        <div className="card">
          {error && <div className="alert alert-error">{error}</div>}

          {!session && (
            <>
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
                <label>Nombre de mines</label>
                <select value={mineCount} onChange={(e) => setMineCount(e.target.value)}>
                  {[1, 3, 5, 8, 12, 16, 20].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary btn-block btn-lg"
                disabled={loading || !stake || stake <= 0 || stake > (user?.balance || 0)}
                onClick={start}
              >
                {loading ? 'Démarrage…' : 'Démarrer la partie'}
              </button>
            </>
          )}

          {session && !gameOver && (
            <>
              <div className="stat-row"><span>Mise</span><span>{stake} VLT</span></div>
              <div className="stat-row"><span>Cases révélées</span><span>{session.revealed.length}</span></div>
              <div className="stat-row"><span>Multiplicateur</span><span>{session.multiplier}x</span></div>
              <div className="stat-row"><span>Gain potentiel</span><span>{session.potentialPayout.toLocaleString('fr-FR')} VLT</span></div>
              <button
                className="btn btn-primary btn-block btn-lg"
                style={{ marginTop: 18 }}
                disabled={loading || session.revealed.length === 0}
                onClick={cashout}
              >
                {loading ? 'Retrait…' : `Encaisser ${session.potentialPayout.toLocaleString('fr-FR')} VLT`}
              </button>
            </>
          )}

          {gameOver && (
            <>
              <div className={`result-banner ${cashedOut ? 'result-win' : 'result-lose'}`}>
                {cashedOut
                  ? `Retiré ! +${cashedOut.payout.toLocaleString('fr-FR')} VLT`
                  : 'Boom ! Vous avez touché une mine.'}
              </div>
              <button className="btn btn-primary btn-block btn-lg" onClick={reset}>
                Nouvelle partie
              </button>
            </>
          )}
        </div>

        <div className="card card-glow">
          <div className="mines-grid">
            {Array.from({ length: TOTAL_TILES }).map((_, i) => {
              const isRevealed = session?.revealed.includes(i);
              const isMine = minePositions?.includes(i);
              const disabled = !session || gameOver || loading || isRevealed;
              return (
                <button
                  key={i}
                  className={`mine-tile ${isRevealed ? 'revealed' : ''} ${isMine ? 'bomb' : ''}`}
                  disabled={disabled}
                  onClick={() => reveal(i)}
                >
                  {isMine ? '💥' : isRevealed ? '💎' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <MinesGame />
    </RequireAuth>
  );
}
