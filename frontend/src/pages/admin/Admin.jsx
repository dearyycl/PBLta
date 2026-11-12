import { useState } from 'react';
import { api, getToken, setToken } from '../../lib/api.js';
import Orders from './Orders.jsx';
import MenuManager from './MenuManager.jsx';
import Reports from './Reports.jsx';

const TABS = [
  { id: 'orders', label: 'Pesanan Live' },
  { id: 'menu', label: 'Kelola Menu' },
  { id: 'report', label: 'Laporan Keuangan' },
];

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api.login(password);
      setToken((r.data ?? r).token);
      onDone();
    } catch (err) {
      setError(err.status === 422 || err.status === 401 ? 'Kata sandi salah.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page narrow center-screen">
      <form className="card" onSubmit={submit}>
        <img src="/logo.jpeg" alt="Kaika Space" className="admin-logo" />
        <h1>Kasir Utama / Admin Kaika Space</h1>
        <label className="field">
          <span>Kata sandi</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn--primary btn--block" disabled={busy || !password}>Masuk</button>
      </form>
    </main>
  );
}

export default function Admin() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [tab, setTab] = useState('orders');

  const logout = async () => {
    try { await api.logout(); } catch { /* token mungkin sudah kedaluwarsa */ }
    setToken(null);
    setAuthed(false);
  };

  // Token kedaluwarsa/ditolak server -> kembali ke login
  const onUnauthorized = () => {
    setToken(null);
    setAuthed(false);
  };

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="admin">
      <header className="admin__top">
        <div className="admin__brand">
          <img src="/logo.jpeg" alt="" />
          <strong>Kasir Utama / Admin Kaika Space</strong>
        </div>
        <button type="button" className="btn btn--ghost" onClick={logout}>Keluar</button>
      </header>
      <nav className="admin__tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`pill ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="admin__body">
        {tab === 'orders' && <Orders onUnauthorized={onUnauthorized} />}
        {tab === 'menu' && <MenuManager onUnauthorized={onUnauthorized} />}
        {tab === 'report' && <Reports onUnauthorized={onUnauthorized} />}
      </main>
    </div>
  );
}
