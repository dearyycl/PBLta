import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../lib/api.js';
import { formatCountdown, formatRupiah } from '../lib/format.js';
import { useCart } from '../context/CartContext.jsx';

const POLL_MS = 3000;

/**
 * Aturan ketat: jika timer habis / pembayaran gagal, pesanan dibuang (server tidak pernah
 * membuat order untuk sesi yang tidak dibayar), TIDAK ada tombol coba lagi, dan satu-satunya
 * aksi adalah kembali ke menu dengan sesi yang dihapus total.
 */
export default function Payment() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { dispatch } = useCart();

  const [session, setSession] = useState(location.state?.session || null);
  const [phase, setPhase] = useState('waiting'); // waiting | paid | expired
  const [left, setLeft] = useState(null);
  const doneRef = useRef(false);

  // Ambil sesi jika halaman di-refresh
  useEffect(() => {
    if (session) return;
    api.getPayment(id).then((r) => setSession(r.data ?? r)).catch(() => setPhase('expired'));
  }, [id, session]);

  const finishExpired = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('expired');
  };

  // Hitung mundur
  useEffect(() => {
    if (!session?.expires_at || phase !== 'waiting') return;
    const end = new Date(session.expires_at).getTime();
    const tick = () => {
      const s = Math.ceil((end - Date.now()) / 1000);
      setLeft(s);
      if (s <= 0) finishExpired();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [session, phase]);

  // Polling status
  useEffect(() => {
    if (!session || phase !== 'waiting') return;
    const t = setInterval(async () => {
      try {
        const r = await api.getPayment(id);
        const s = r.data ?? r;
        if (s.status === 'paid') {
          doneRef.current = true;
          setPhase('paid');
          dispatch({ type: 'RESET' });
          navigate('/selesai', { replace: true, state: { order: { id: s.order_id, order_number: s.order_number, status: 'paid' } } });
        } else if (s.status === 'expired' || s.status === 'failed') {
          finishExpired();
        }
      } catch {
        /* abaikan gangguan sesaat; timer tetap berjalan */
      }
    }, POLL_MS);
    return () => clearInterval(t);
  }, [session, phase, id, dispatch, navigate]);

  const restart = () => {
    dispatch({ type: 'RESET' }); // hapus keranjang + nama + meja
    navigate('/menu', { replace: true });
  };

  if (phase === 'expired') {
    return (
      <main className="page narrow center-screen">
        <div className="card center">
          <div className="big-icon" aria-hidden="true">⏰</div>
          <h1>Waktu Pembayaran Habis</h1>
          <p>Pesanan Anda tidak dikirim ke kasir. Silakan pesan ulang dari awal.</p>
          <button type="button" className="btn btn--primary btn--block" onClick={restart}>
            Kembali ke Menu Utama / Pesan Ulang
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page narrow center-screen">
      <div className="card center">
        <h1>Scan QRIS untuk Membayar</h1>
        {session ? (
          <>
            <div className="qr-box">
              <QRCodeSVG value={session.qr_payload} size={220} level="M" includeMargin />
            </div>
            <p className="amount">{formatRupiah(session.amount)}</p>
            <p className="countdown" role="timer" aria-live="off">
              Selesaikan dalam <strong>{formatCountdown(left ?? 0)}</strong>
            </p>
            <p className="hint">Halaman ini akan otomatis berpindah setelah pembayaran berhasil.</p>
            {import.meta.env.VITE_ENABLE_SIM === 'true' && (
              <button type="button" className="btn btn--ghost" onClick={() => api.simulatePaid(id)}>
                Simulasikan Pembayaran (uji lokal)
              </button>
            )}
          </>
        ) : (
          <p>Menyiapkan kode QR…</p>
        )}
      </div>
    </main>
  );
}
