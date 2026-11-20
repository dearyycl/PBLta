import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pos from '../pages/admin/Pos.jsx';
import { api } from '../lib/api.js';

const cats = [
  { id: 1, name: 'Coffee Base', brand: 'Kaika Space' },
  { id: 2, name: 'Snack', brand: 'The Midday' },
];
const menus = [
  {
    id: 1, category_id: 1, name: 'Flat White', description: '', price: 30000, image_url: null, is_available: true,
    options: [
      { id: 1, type: 'sugar', name: 'Normal Sugar', price: 0 },
      { id: 2, type: 'sugar', name: 'Less Sugar', price: 0 },
      { id: 5, type: 'topping', name: 'Oat Milk', price: 10000 },
    ],
  },
  { id: 2, category_id: 2, name: 'French Fries', description: '', price: 25000, image_url: null, is_available: true, options: [] },
  { id: 3, category_id: 2, name: 'Tempe Habis', description: '', price: 10000, image_url: null, is_available: false, options: [] },
];

const open = async () => {
  render(<Pos onUnauthorized={vi.fn()} onGoOrders={vi.fn()} />);
  await screen.findByRole('button', { name: /^Flat White/ });
};

const addFlatWhiteWithOat = async () => {
  await userEvent.click(screen.getByRole('button', { name: /^Flat White/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Tambah Oat Milk' }));
  await userEvent.click(screen.getByRole('button', { name: /Tambah ke Pesanan/ }));
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, 'categories').mockResolvedValue({ data: cats });
  vi.spyOn(api, 'menus').mockResolvedValue({ data: menus });
});

describe('Tab Kasir (POS)', () => {
  it('memuat kategori & menu dari API; menu habis tidak bisa dipilih', async () => {
    await open();
    expect(screen.getByRole('button', { name: 'Semua' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Snack' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Tempe Habis/ })).toBeDisabled();
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });

  it('filter kategori dan pencarian', async () => {
    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Snack' }));
    expect(screen.queryByRole('button', { name: /^Flat White/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^French Fries/ })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Semua' }));
    await userEvent.type(screen.getByLabelText('Cari menu'), 'flat');
    expect(screen.getByRole('button', { name: /^Flat White/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^French Fries/ })).toBeNull();
  });

  it('klik menu -> sheet opsi -> masuk keranjang dengan total otomatis', async () => {
    await open();
    await addFlatWhiteWithOat();
    expect(screen.getByTestId('pos-total')).toHaveTextContent('Rp 40.000');
    expect(screen.getByText(/Oat Milk x1/)).toBeInTheDocument();
  });

  it('ubah qty dan hapus item', async () => {
    await open();
    await addFlatWhiteWithOat();
    await userEvent.click(screen.getByRole('button', { name: 'Tambah Flat White' }));
    expect(screen.getByTestId('pos-total')).toHaveTextContent('Rp 80.000');
    await userEvent.click(screen.getByRole('button', { name: 'Hapus Flat White' }));
    expect(screen.getByTestId('pos-total')).toHaveTextContent('Rp 0');
    expect(screen.getByRole('button', { name: 'Selesaikan Pesanan' })).toBeDisabled();
  });

  it('ubah opsi item di keranjang (sheet terisi sesuai pilihan sebelumnya)', async () => {
    await open();
    await addFlatWhiteWithOat();
    await userEvent.click(screen.getByRole('button', { name: 'Ubah Flat White' }));
    expect(screen.getByTestId('topping-qty-5')).toHaveTextContent('1');
    await userEvent.click(screen.getByRole('button', { name: 'Kurangi Oat Milk' }));
    await userEvent.click(screen.getByRole('button', { name: /Simpan Perubahan/ }));
    expect(screen.getByTestId('pos-total')).toHaveTextContent('Rp 30.000');
    expect(screen.queryByText(/Oat Milk x1/)).toBeNull();
  });

  it('selesaikan pesanan: kirim ke API admin, tampil sukses, keranjang bersih', async () => {
    const post = vi.spyOn(api, 'posOrder').mockResolvedValue({ data: { id: 12, order_number: 'KM-0012', total_amount: 40000 } });
    await open();
    await addFlatWhiteWithOat();
    await userEvent.type(screen.getByLabelText('Nama pelanggan'), 'Ani');
    await userEvent.type(screen.getByLabelText('No. meja'), '5');
    await userEvent.click(screen.getByRole('radio', { name: 'QRIS' }));
    await userEvent.click(screen.getByRole('button', { name: 'Selesaikan Pesanan' }));

    const body = post.mock.calls[0][0];
    expect(body).toMatchObject({ customer_name: 'Ani', table_number: '5', payment_method: 'qris' });
    expect(body.items[0]).toMatchObject({ menu_id: 1, quantity: 1 });
    expect(body.items[0].selected_options).toEqual([{ id: 1, qty: 1 }, { id: 5, qty: 1 }]);

    expect(await screen.findByRole('status')).toHaveTextContent('Pesanan berhasil dibuat!');
    expect(screen.getByTestId('pos-total')).toHaveTextContent('Rp 0');
    expect(screen.getByLabelText('Nama pelanggan')).toHaveValue('');
  });

  it('nama & meja kosong dikirim sebagai null (server mengisi default)', async () => {
    const post = vi.spyOn(api, 'posOrder').mockResolvedValue({ data: { order_number: 'KM-0013', total_amount: 40000 } });
    await open();
    await addFlatWhiteWithOat();
    await userEvent.click(screen.getByRole('button', { name: 'Selesaikan Pesanan' }));
    expect(post.mock.calls[0][0]).toMatchObject({ customer_name: null, table_number: null, payment_method: 'cash' });
  });

  it('gagal dari server: pesan tampil dan keranjang dipertahankan', async () => {
    vi.spyOn(api, 'posOrder').mockRejectedValue(Object.assign(new Error('Flat White sedang habis (sold out).'), { status: 422 }));
    await open();
    await addFlatWhiteWithOat();
    await userEvent.click(screen.getByRole('button', { name: 'Selesaikan Pesanan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('sedang habis');
    expect(screen.getByTestId('pos-total')).toHaveTextContent('Rp 40.000');
  });

  it('401 -> onUnauthorized dipanggil', async () => {
    vi.spyOn(api, 'posOrder').mockRejectedValue(Object.assign(new Error('x'), { status: 401 }));
    const onUnauthorized = vi.fn();
    render(<Pos onUnauthorized={onUnauthorized} />);
    await screen.findByRole('button', { name: /^Flat White/ });
    await addFlatWhiteWithOat();
    await userEvent.click(screen.getByRole('button', { name: 'Selesaikan Pesanan' }));
    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
  });
});
