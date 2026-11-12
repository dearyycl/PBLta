import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';

export default function Launch() {
  const navigate = useNavigate();
  const { table } = useParams(); // dari QR: /meja/12
  const { state, dispatch } = useCart();

  useEffect(() => {
    if (table) dispatch({ type: 'LOCK_TABLE', table });
  }, [table, dispatch]);

  const start = () => {
    dispatch({ type: 'RESET' }); // sesi baru setiap mulai pesan
    navigate('/menu');
  };

  return (
    <main className="launch">
      <div className="launch__bg" aria-hidden="true" />
      <div className="launch__shade" aria-hidden="true" />

      <div className="launch__inner">
        <div className="launch__logo">
          <img src="/logo.jpeg" alt="Kaika Space - Coffee, Eatery & Co-working" />
        </div>

        <div className="launch__content">
          <h1 className="launch__title">Kaika Space x The Midday</h1>
          <p className="launch__tagline">Teman untuk jeda Anda</p>
          <p className="launch__tag">#CraftTheTaste</p>

          <p className="launch__meta">
            <span aria-hidden="true">📍</span> 4.7 <span aria-hidden="true">⭐</span> (60+ ulasan) • Rp 25k-50k • BTP Blok G No.14, Makassar
          </p>

          {state.tableLocked && <p className="launch__meta">Meja <strong>{state.tableNumber}</strong></p>}

          <button type="button" className="btn btn--cream btn--xl" onClick={start}>
            Mulai Pesan Dari Meja Anda
          </button>
        </div>
      </div>
    </main>
  );
}
