import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
      router.push('/games/dice');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <h1>Connexion</h1>
      <p className="subtitle">Accédez à votre wallet de jetons fictifs VLT.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Nom d'utilisateur ou email</label>
          <input name="username" value={form.username} onChange={onChange} required />
        </div>
        <div className="form-group">
          <label>Mot de passe</label>
          <input type="password" name="password" value={form.password} onChange={onChange} required />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      <div className="auth-switch">
        Pas encore de compte ? <Link href="/register">Créer un compte</Link>
      </div>
    </div>
  );
}
