import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { api, imageSrc } from '../../lib/api.js';
import { cartReducer, initialCart, cartCount, cartTotal, toOrderPayload } from '../../context/cartReducer.js';
import { formatRupiah, groupMenusByCategory, lineTotal } from '../../lib/format.js';
import CustomizeSheet from '../../components/CustomizeSheet.jsx';
import './pos.css';

const METHODS = [
  { id: 'cash', label: 'Tunai' },
  { id: 'qris', label: 'QRIS' },
  { id: 'debit', label: 'Debit' },
];

export default function Pos({ onUnauthorized, onGoOrders }) {
  const [menus, setMenus] = useState([]);
  const [cats, setCats] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(null); // { menu, line? } line = item keranjang yang sedang diubah
  const [cart, dispatch] = useReducer(cartReducer, initialCart); // keranjang kasir terpisah dari keranjang pelanggan
  const [method, setMethod] = useState('cash');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const [showCart, setShowCart] = useState(false); // panel pesanan di layar kecil

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [c, m] = await Promise.all([api.categories(), api.menus()]);
      setCats(c.data ?? c);
      setMenus(m.data ?? m);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Banner sukses hilang sendiri
  useEffect(() => {
    if (!done) return undefined;
    const t = setTimeout(() => setDone(null), 7000);
    return () => clearTimeout(t);
  }, [done]);

  const allGroups = useMemo(() => groupMenusByCategory(cats, menus), [cats, menus]);

  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = term ? menus.filter((m) => m.name.toLowerCase().includes(term)) : menus;
    const g = groupMenusByCategory(cats, filtered);
    return cat === 'all' ? g : g.filter((x) => x.id === cat);
  }, [cats, menus, cat, q]);

  const count = cartCount(cart);
  const total = cartTotal(cart);

  const handleAdd = (line) => {
    if (sheet?.line) dispatch({ type: 'REMOVE', key: sheet.line.key }); // mode ubah: ganti baris lama
    dispatch({ type: 'ADD', line });
  };

  const submit = async () => {
    if (!count || busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = toOrderPayload(cart, method);
      payload.customer_name = payload.customer_name || null; // kosong -> server isi "Pelanggan"
      payload.table_number = payload.table_number || null; // kosong -> server isi "Take Away"
      const r = await api.posOrder(payload);
      setDone(r.data ?? r);
      dispatch({ type: 'RESET' });
      setMethod('cash');
      setShowCart(false);
    } catch (e) {
      if (e.status === 401) onUnauthorized?.();
      else setError(e.message || 'Gagal membuat pesanan.');
    } finally {
      setBusy(false);
    }
  };

  const optionsText = (i) =>
    [i.sugar?.name, i.ice?.name, ...i.toppings.map((t) => `${t.name} x${t.qty}`)].filter(Boolean).join(' • ');

  return (
    <section className="pos" aria-label="Kasir">
      {done && (
        <div className="pos__done" role="status">
          <span>
            <strong>Pesanan berhasil dibuat!</strong> {done.order_number} • {formatRupiah(done.total_amount)} • Lunas
          </span>
          {onGoOrders && (
            <button type="button" className="btn btn--ghost" onClick={onGoOrders}>
              Lihat di Pesanan Live
            </button>
          )}
        </div>
      )}

      {/* ---------- KIRI: katalog ---------- */}
      <div className="pos__catalog">
        <input
          className="search"
          type="search"
          placeholder="Cari menu…"
          aria-label="Cari menu"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        {status === 'loading' && <p className="hint" aria-busy="true">Memuat menu…</p>}
        {status === 'error' && (
          <div className="notice" role="alert">
            <p>Menu belum bisa dimuat.</p>
            <button type="button" className="btn btn--primary" onClick={load}>Muat ulang</button>
          </div>
        )}

        {status === 'ready' && (
          <div className="pos__body">
            <nav className="pos__cats" aria-label="Kategori menu">
              <button type="button" className={`pos__cat ${cat === 'all' ? 'is-active' : ''}`} aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
                Semua
              </button>
              {allGroups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`pos__cat ${cat === g.id ? 'is-active' : ''}`}
                  aria-pressed={cat === g.id}
                  onClick={() => setCat(g.id)}
                >
                  {g.name}
                </button>
              ))}
            </nav>

            <div className="pos__scroll">
              {groups.length === 0 && <p className="hint">Menu tidak ditemukan.</p>}
              {groups.map((g) => (
                <div key={g.id} className="pos__group">
                  <h3 className="pos__group-title">
                    {g.name} <small>{g.brand}</small>
                  </h3>
                  <div className="pos__grid">
                    {g.items.map((m) => {
                      const ok = Boolean(m.is_available);
                      const src = imageSrc(m.image_url);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          className={`pos-card ${ok ? '' : 'is-soldout'}`}
                          disabled={!ok}
                          onClick={() => setSheet({ menu: m })}
                        >
                          <span className="pos-card__img">
                            {src ? <img src={src} alt="" loading="lazy" /> : <span aria-hidden="true">☕</span>}
                            {!ok && <span className="badge-soldout">Sold out</span>}
                          </span>
                          <span className="pos-card__name">{m.name}</span>
                          <span className="pos-card__price">{formatRupiah(m.price)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ---------- KANAN: ringkasan pesanan ---------- */}
      <aside className={`pos__cart ${showCart ? 'is-open' : ''}`} aria-label="Ringkasan pesanan">
        <header className="pos__cart-head">
          <h2>Pesanan {count > 0 && <span className="count">{count}</span>}</h2>
          <button type="button" className="icon-btn pos__close" aria-label="Tutup pesanan" onClick={() => setShowCart(false)}>×</button>
        </header>

        <div className="pos__fields">
          <label className="field">
            <span>Nama pelanggan</span>
            <input
              value={cart.customerName}
              maxLength={60}
              placeholder="Kosong = Pelanggan"
              onChange={(e) => dispatch({ type: 'SET_CUSTOMER', name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>No. meja</span>
            <input
              value={cart.tableNumber}
              maxLength={10}
              placeholder="Kosong = Take Away"
              onChange={(e) => dispatch({ type: 'SET_CUSTOMER', table: e.target.value })}
            />
          </label>
        </div>

        <ul className="pos__lines" aria-label="Item pesanan">
          {count === 0 && <li className="hint pos__empty">Belum ada item. Pilih menu di sebelah kiri.</li>}
          {cart.items.map((i) => (
            <li key={i.key} className="pos-line">
              <div className="pos-line__info">
                <p className="pos-line__name">{i.menu.name}</p>
                {optionsText(i) && <p className="hint">{optionsText(i)}</p>}
                {i.notes && <p className="hint">Catatan: {i.notes}</p>}
                <p className="pos-line__price">{formatRupiah(lineTotal(i.menu.price, i.toppings, i.qty))}</p>
                <button type="button" className="pos-line__edit" aria-label={`Ubah ${i.menu.name}`} onClick={() => setSheet({ menu: i.menu, line: i })}>
                  Ubah opsi / catatan
                </button>
              </div>
              <div className="pos-line__side">
                <button type="button" className="pos-line__x" aria-label={`Hapus ${i.menu.name}`} onClick={() => dispatch({ type: 'REMOVE', key: i.key })}>×</button>
                <div className="stepper">
                  <button type="button" aria-label={`Kurangi ${i.menu.name}`} onClick={() => dispatch({ type: 'DEC', key: i.key })}>−</button>
                  <span>{i.qty}</span>
                  <button type="button" aria-label={`Tambah ${i.menu.name}`} onClick={() => dispatch({ type: 'INC', key: i.key })}>+</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <footer className="pos__foot">
          <div className="pos__methods" role="radiogroup" aria-label="Metode pembayaran">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                className={`pos__method ${method === m.id ? 'is-on' : ''}`}
                onClick={() => setMethod(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {method !== 'cash' && (
            <p className="hint">Pastikan pembayaran {method === 'qris' ? 'QRIS' : 'debit'} sudah diterima sebelum menyelesaikan pesanan.</p>
          )}

          <div className="pos__total">
            <span>Total</span>
            <strong data-testid="pos-total">{formatRupiah(total)}</strong>
          </div>

          {error && <p className="error" role="alert">{error}</p>}

          <div className="pos__actions">
            <button type="button" className="btn btn--ghost" disabled={busy || (!count && !cart.customerName && !cart.tableNumber)} onClick={() => { dispatch({ type: 'RESET' }); setError(''); }}>
              Batal
            </button>
            <button type="button" className="btn btn--primary btn--grow" disabled={!count || busy} onClick={submit}>
              {busy ? 'Memproses…' : 'Selesaikan Pesanan'}
            </button>
          </div>
        </footer>
      </aside>

      {/* Tombol pesanan untuk layar kecil */}
      {count > 0 && !showCart && (
        <div className="pos__mobilebar">
          <button type="button" className="btn btn--primary btn--block" onClick={() => setShowCart(true)}>
            <span>Lihat Pesanan ({count})</span>
            <span>{formatRupiah(total)}</span>
          </button>
        </div>
      )}

      {sheet && (
        <CustomizeSheet
          menu={sheet.menu}
          initial={sheet.line || null}
          submitLabel={sheet.line ? 'Simpan Perubahan' : 'Tambah ke Pesanan'}
          onClose={() => setSheet(null)}
          onAdd={handleAdd}
        />
      )}
    </section>
  );
}
