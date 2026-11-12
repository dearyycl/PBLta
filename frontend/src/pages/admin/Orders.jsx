import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { formatRupiah } from '../../lib/format.js';

const COLUMNS = [
  { id: 'pending', label: 'Pending', next: 'cooking', nextLabel: 'Mulai Masak' },
  { id: 'cooking', label: 'Cooking', next: 'completed', nextLabel: 'Selesai' },
  { id: 'completed', label: 'Completed', next: null },
];

const PAY_LABEL = { qris: 'QRIS', cash: 'Cash', debit: 'Debit' };

export default function Orders({ onUnauthorized }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await api.adminOrders();
      setOrders(r.data ?? r);
      setError('');
    } catch (e) {
      if (e.status === 401) onUnauthorized();
      else setError('Gagal memuat pesanan.');
    }
  }, [onUnauthorized]);

  // "Real-time" lewat polling 5 detik
  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const move = async (id, status) => {
    await api.setOrderStatus(id, status);
    load();
  };

  return (
    <section>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="kanban">
        {COLUMNS.map((col) => {
          const list = orders.filter((o) => o.kitchen_status === col.id);
          return (
            <div key={col.id} className="kanban__col" data-testid={`col-${col.id}`}>
              <h3>{col.label} <span className="count">{list.length}</span></h3>
              {list.length === 0 && <p className="hint">Tidak ada pesanan.</p>}
              {list.map((o) => (
                <article key={o.id} className="order-card">
                  <header>
                    <strong>{o.order_number}</strong>
                    <span className={`tag tag--${o.status}`}>{o.status === 'paid' ? 'Lunas' : 'Belum bayar'}</span>
                  </header>
                  <p>{o.customer_name} • Meja {o.table_number}</p>
                  <p className="hint">{PAY_LABEL[o.payment_method] || o.payment_method} • {formatRupiah(o.total_amount)}</p>
                  <ul>
                    {o.items.map((it) => (
                      <li key={it.id}>
                        {it.quantity}× {it.menu_name}
                        {it.options_text && <small> ({it.options_text})</small>}
                        {it.notes && <small> — {it.notes}</small>}
                      </li>
                    ))}
                  </ul>
                  {o.status !== 'paid' && (
                    <button type="button" className="btn btn--ghost btn--block" onClick={async () => { await api.markOrderPaid(o.id); load(); }}>
                      Tandai Lunas ({PAY_LABEL[o.payment_method] || o.payment_method})
                    </button>
                  )}
                  {col.next && (
                    <button type="button" className="btn btn--primary btn--block" onClick={() => move(o.id, col.next)}>
                      {col.nextLabel}
                    </button>
                  )}
                </article>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
