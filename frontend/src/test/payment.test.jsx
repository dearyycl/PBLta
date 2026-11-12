import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Payment from '../pages/Payment.jsx';
import { CartProvider } from '../context/CartContext.jsx';
import { api } from '../lib/api.js';

vi.mock('qrcode.react', () => ({ QRCodeSVG: () => <svg data-testid="qr" /> }));

const mount = (session) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/payment/9', state: { session } }]}>
      <CartProvider>
        <Routes>
          <Route path="/payment/:id" element={<Payment />} />
          <Route path="/menu" element={<p>HALAMAN MENU</p>} />
          <Route path="/selesai" element={<p>SELESAI</p>} />
        </Routes>
      </CartProvider>
    </MemoryRouter>
  );

describe('Payment QRIS — aturan timeout/gagal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('menampilkan QR dan countdown saat menunggu', () => {
    vi.spyOn(api, 'getPayment').mockResolvedValue({ status: 'waiting' });
    mount({ id: 9, qr_payload: 'KAIKA-9', amount: 40000, expires_at: new Date(Date.now() + 300000).toISOString() });
    expect(screen.getByTestId('qr')).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('05:00');
  });

  it('timer habis -> "Waktu Pembayaran Habis", tanpa tombol coba lagi, satu tombol saja', () => {
    vi.spyOn(api, 'getPayment').mockResolvedValue({ status: 'waiting' });
    mount({ id: 9, qr_payload: 'KAIKA-9', amount: 40000, expires_at: new Date(Date.now() + 2000).toISOString() });
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText('Waktu Pembayaran Habis')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(/coba lagi|retry/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Kembali ke Menu Utama / Pesan Ulang' })).toBeInTheDocument();
  });

  it('status failed dari server -> layar kedaluwarsa yang sama', async () => {
    vi.spyOn(api, 'getPayment').mockResolvedValue({ status: 'failed' });
    mount({ id: 9, qr_payload: 'KAIKA-9', amount: 40000, expires_at: new Date(Date.now() + 300000).toISOString() });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(screen.getByText('Waktu Pembayaran Habis')).toBeInTheDocument();
  });

  it('tombol pesan ulang membawa ke /menu', async () => {
    vi.spyOn(api, 'getPayment').mockResolvedValue({ status: 'waiting' });
    mount({ id: 9, qr_payload: 'KAIKA-9', amount: 40000, expires_at: new Date(Date.now() + 1000).toISOString() });
    act(() => { vi.advanceTimersByTime(2000); });
    vi.useRealTimers();
    await userEvent.click(screen.getByRole('button', { name: /Pesan Ulang/ }));
    expect(screen.getByText('HALAMAN MENU')).toBeInTheDocument();
  });

  it('status paid -> pindah ke halaman selesai', async () => {
    vi.spyOn(api, 'getPayment').mockResolvedValue({ status: 'paid', order_id: 3, order_number: 'KM-0003' });
    mount({ id: 9, qr_payload: 'KAIKA-9', amount: 40000, expires_at: new Date(Date.now() + 300000).toISOString() });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    expect(screen.getByText('SELESAI')).toBeInTheDocument();
  });
});
