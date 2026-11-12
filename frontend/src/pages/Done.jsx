import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

const METHOD_NOTE = {
  cash: 'Silakan bayar tunai di kasir.',
  debit: 'Silakan bayar dengan kartu debit di kasir.',
};

export default function Done() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useCart();
  const order = state?.order;

  const again = () => {
    dispatch({ type: 'RESET' });
    navigate('/menu', { replace: true });
  };

  if (!order) {
    return (
      <main className="page narrow center-screen">
        <div className="card center">
          <p>Tidak ada pesanan untuk ditampilkan.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={again}>Ke Menu</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow center-screen">
      <div className="card center">
        <div className="big-icon ok" aria-hidden="true">✓</div>
        <h1>Pesanan Diterima</h1>
        <p>Nomor pesanan <strong>{order.order_number || `#${order.id}`}</strong></p>
        <p>{METHOD_NOTE[order.payment_method] || 'Pembayaran berhasil. Pesanan Anda segera kami siapkan.'}</p>
        <button type="button" className="btn btn--primary btn--block" onClick={again}>Pesan Lagi</button>
      </div>
    </main>
  );
}
