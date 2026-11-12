import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { toOrderPayload } from '../context/cartReducer.js';
import { api } from '../lib/api.js';
import { formatRupiah, lineTotal, validateCheckout } from '../lib/format.js';

const METHODS = [
  { id: 'qris', label: 'QRIS', hint: 'Bayar dengan scan QR (batas waktu berlaku)' },
  { id: 'cash', label: 'Cash di Kasir', hint: 'Bayar tunai setelah memesan' },
  { id: 'debit', label: 'Debit di Kasir', hint: 'Bayar dengan kartu debit di kasir' },
];

export default function Checkout() {
  const navigate = useNavigate();
  const { state, dispatch, total, count } = useCart();
  const [method, setMethod] = useState('qris');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const v = validateCheckout({ name: state.customerName, table: state.tableNumber, itemCount: count });
    setErrors(v);
    if (Object.keys(v).length) return;

    setSubmitting(true);
    setServerError('');
    try {
      const payload = toOrderPayload(state, method);
      if (method === 'qris') {
        const session = await api.createQris(payload);
        const s = session.data ?? session;
        navigate(`/payment/${s.id}`, { state: { session: s } });
      } else {
        const res = await api.createOrder(payload);
        const order = res.data ?? res;
        navigate('/selesai', { state: { order } });
      }
    } catch (err) {
      setServerError(err.message || 'Gagal mengirim pesanan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page narrow">
      <header className="topbar">
        <button type="button" className="icon-btn" aria-label="Kembali ke menu" onClick={() => navigate('/menu')}>←</button>
        <div className="topbar__title"><strong>Keranjang & Pembayaran</strong></div>
      </header>

      <form className="checkout" onSubmit={submit} noValidate>
        {count === 0 ? (
          <div className="notice">
            <p>Keranjang masih kosong.</p>
            <button type="button" className="btn btn--primary" onClick={() => navigate('/menu')}>Lihat Menu</button>
          </div>
        ) : (
          <ul className="cart-list" aria-label="Daftar pesanan">
            {state.items.map((i) => (
              <li key={i.key} className="cart-item">
                <div className="cart-item__info">
                  <p className="cart-item__name">{i.menu.name}</p>
                  <p className="cart-item__opts">
                    {[i.sugar?.name, i.ice?.name, ...i.toppings.map((t) => `${t.name} x${t.qty}`)].filter(Boolean).join(' • ')}
                  </p>
                  {i.notes && <p className="cart-item__opts">Catatan: {i.notes}</p>}
                  <p className="cart-item__price">{formatRupiah(lineTotal(i.menu.price, i.toppings, i.qty))}</p>
                </div>
                <div className="stepper">
                  <button type="button" aria-label={`Kurangi ${i.menu.name}`} onClick={() => dispatch({ type: 'DEC', key: i.key })}>−</button>
                  <span>{i.qty}</span>
                  <button type="button" aria-label={`Tambah ${i.menu.name}`} onClick={() => dispatch({ type: 'INC', key: i.key })}>+</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {errors.cart && <p className="error" role="alert">{errors.cart}</p>}

        <section className="card">
          <h2>Data Pemesan</h2>
          <label className="field">
            <span>Nama pemesan</span>
            <input
              type="text"
              value={state.customerName}
              maxLength={60}
              onChange={(e) => dispatch({ type: 'SET_CUSTOMER', name: e.target.value })}
              aria-invalid={!!errors.name}
              placeholder="Nama Anda"
            />
            {errors.name && <small className="error">{errors.name}</small>}
          </label>
          <label className="field">
            <span>Nomor meja</span>
            <input
              type="text"
              inputMode="numeric"
              value={state.tableNumber}
              maxLength={10}
              readOnly={state.tableLocked}
              aria-readonly={state.tableLocked}
              onChange={(e) => dispatch({ type: 'SET_CUSTOMER', table: e.target.value })}
              aria-invalid={!!errors.table}
              placeholder="Contoh: 12"
            />
            {state.tableLocked && <small className="hint">Terkunci sesuai QR di meja Anda.</small>}
            {errors.table && <small className="error">{errors.table}</small>}
          </label>
        </section>

        <section className="card">
          <h2>Metode Pembayaran</h2>
          <div className="method-list" role="radiogroup" aria-label="Metode pembayaran">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={method === m.id}
                className={`method ${method === m.id ? 'is-on' : ''}`}
                onClick={() => setMethod(m.id)}
              >
                <span><strong>{m.label}</strong><small>{m.hint}</small></span>
                <i className="radio-dot" />
              </button>
            ))}
          </div>
        </section>

        {serverError && <p className="error" role="alert">{serverError}</p>}

        <div className="checkout__bar">
          <div>
            <small>Total</small>
            <strong>{formatRupiah(total)}</strong>
          </div>
          <button type="submit" className="btn btn--primary btn--grow" disabled={submitting}>
            {submitting ? 'Memproses…' : method === 'qris' ? 'Bayar dengan QRIS' : 'Kirim Pesanan'}
          </button>
        </div>
      </form>
    </div>
  );
}
