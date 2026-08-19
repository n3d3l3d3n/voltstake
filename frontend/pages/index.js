import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

const GAMES = [
  { href: '/games/dice', icon: '🎲', title: 'Dice', desc: 'Choisissez une cible et un sens, tentez de battre le seuil.' },
  { href: '/games/crash', icon: '🚀', title: 'Crash', desc: 'Encaissez avant que la fusée n’explose. Plus vous attendez, plus le gain grandit.' },
  { href: '/games/mines', icon: '💎', title: 'Mines', desc: 'Révélez des cases sûres et retirez vos gains avant de tomber sur une mine.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      <section className="hero">
        <h1>Jouez avec des jetons <span className="highlight">100% fictifs</span></h1>
        <p>
          VoltStake est une plateforme de démonstration inspirée des casinos crypto. Aucun argent réel,
          aucun risque : uniquement des jetons VLT virtuels pour tester des mécaniques de jeu.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link href="/games/dice" className="btn btn-primary btn-lg">Commencer à jouer</Link>
          ) : (
            <>
              <Link href="/register" className="btn btn-primary btn-lg">Créer un compte gratuit</Link>
              <Link href="/login" className="btn btn-ghost btn-lg">J'ai déjà un compte</Link>
            </>
          )}
        </div>
      </section>

      <section className="game-cards">
        {GAMES.map((g) => (
          <Link key={g.href} href={g.href} className="card game-card">
            <div className="icon">{g.icon}</div>
            <h3>{g.title}</h3>
            <p>{g.desc}</p>
            <span className="btn btn-ghost">Jouer →</span>
          </Link>
        ))}
      </section>
    </div>
  );
}
