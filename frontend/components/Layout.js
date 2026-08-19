import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/AuthContext';

export default function Layout({ children }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  return (
    <div className="app-shell">
      <header className="navbar">
        <Link href="/" className="brand">
          <span className="brand-mark">⚡</span>
          <span className="brand-name">VOLT<span className="brand-accent">STAKE</span></span>
        </Link>

        <nav className="nav-links">
          <Link href="/games/dice" className={router.pathname === '/games/dice' ? 'active' : ''}>Dice</Link>
          <Link href="/games/crash" className={router.pathname === '/games/crash' ? 'active' : ''}>Crash</Link>
          <Link href="/games/mines" className={router.pathname === '/games/mines' ? 'active' : ''}>Mines</Link>
          <Link href="/history" className={router.pathname === '/history' ? 'active' : ''}>Historique</Link>
          <Link href="/wallet" className={router.pathname === '/wallet' ? 'active' : ''}>Wallet XRPL</Link>
        </nav>

        <div className="nav-auth">
          {!loading && user && (
            <>
              <div className="balance-badge">
                <span className="chip-icon">◆</span>
                {user.balance.toLocaleString('fr-FR')} <span className="chip-label">VLT</span>
              </div>
              <span className="username">{user.username}</span>
              <button className="btn btn-ghost" onClick={logout}>Déconnexion</button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="btn btn-ghost">Connexion</Link>
              <Link href="/register" className="btn btn-primary">Créer un compte</Link>
            </>
          )}
        </div>
      </header>

      <main className="main-content">{children}</main>

      <footer className="footer">
        <p>
          VoltStake est une plateforme de démonstration à but éducatif. Le jeton <strong>VLT</strong> est
          entièrement fictif, sans valeur réelle et non échangeable. Aucun argent réel n'est utilisé.
        </p>
      </footer>
    </div>
  );
}
