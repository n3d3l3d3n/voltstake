import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../lib/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.username, form.email, form.password);
      router.push('/games/dice');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card auth-card">
      <h1>Créer un compte</h1>
      <p className="subtitle">Recevez 1 000 jetons VLT fictifs pour commencer.</p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label>Nom d'utilisateur</label>
          <input name="username" value={form.username} onChange={onChange} required minLength={3} maxLength={20} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={onChange} required />
        </div>
        <div className="form-group">
          <label>Mot de passe</label>
          <input type="password" name="password" value={form.password} onChange={onChange} required minLength={8} />
        </div>
        <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
          {loading ? 'Création…' : 'Créer mon compte'}
        </button>
      </form>

      <div className="auth-switch">
        Déjà un compte ? <Link href="/login">Se connecter</Link>
      </div>
    </div>
  );
}
