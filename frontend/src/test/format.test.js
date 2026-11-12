import { describe, it, expect } from 'vitest';
import {
  formatRupiah, unitPrice, lineTotal, groupMenusByCategory, formatCountdown, validateCheckout, hasOptionType,
} from '../lib/format.js';

/* ===== WHITE BOX: menguji cabang & logika internal fungsi ===== */
describe('formatRupiah', () => {
  it('memformat ribuan dengan titik', () => expect(formatRupiah(25000)).toBe('Rp 25.000'));
  it('nol, null, dan string tidak valid -> Rp 0', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatRupiah(null)).toBe('Rp 0');
    expect(formatRupiah('abc')).toBe('Rp 0');
  });
  it('membulatkan pecahan', () => expect(formatRupiah(1999.6)).toBe('Rp 2.000'));
});

describe('unitPrice / lineTotal', () => {
  const toppings = [
    { id: 1, price: 10000, qty: 1 }, // oat milk
    { id: 2, price: 8000, qty: 2 }, // shot espresso x2
  ];
  it('menjumlah harga topping x qty', () => expect(unitPrice(28000, toppings)).toBe(28000 + 10000 + 16000));
  it('tanpa topping = harga menu', () => expect(unitPrice(28000)).toBe(28000));
  it('lineTotal mengalikan qty', () => expect(lineTotal(28000, toppings, 2)).toBe(108000));
  it('qty negatif/nol tidak menghasilkan total negatif', () => {
    expect(lineTotal(28000, [], 0)).toBe(0);
    expect(lineTotal(28000, [], -3)).toBe(0);
  });
});

describe('groupMenusByCategory', () => {
  const cats = [{ id: 1, name: 'Coffee Base' }, { id: 2, name: 'Pizza' }, { id: 3, name: 'Kosong' }];
  const menus = [
    { id: 10, category_id: 2 }, { id: 11, category_id: 1 }, { id: 12, category_id: 1 },
  ];
  it('mengelompokkan dan mempertahankan urutan kategori', () => {
    const g = groupMenusByCategory(cats, menus);
    expect(g.map((x) => x.id)).toEqual([1, 2]);
    expect(g[0].items).toHaveLength(2);
  });
  it('membuang kategori tanpa menu', () => {
    expect(groupMenusByCategory(cats, menus).find((x) => x.id === 3)).toBeUndefined();
  });
  it('input kosong aman', () => expect(groupMenusByCategory()).toEqual([]));
});

describe('formatCountdown', () => {
  it('05:00', () => expect(formatCountdown(300)).toBe('05:00'));
  it('00:09', () => expect(formatCountdown(9)).toBe('00:09'));
  it('tidak pernah negatif', () => expect(formatCountdown(-5)).toBe('00:00'));
});

describe('hasOptionType', () => {
  it('true jika ada opsi bertipe tsb', () => expect(hasOptionType({ options: [{ type: 'sugar' }] }, 'sugar')).toBe(true));
  it('false jika tidak ada options', () => expect(hasOptionType({}, 'ice')).toBe(false));
});

/* ===== BLACK BOX: input -> output yang diharapkan pengguna ===== */
describe('validateCheckout', () => {
  it('keranjang kosong ditolak', () => expect(validateCheckout({ name: 'A', table: '1', itemCount: 0 }).cart).toBeTruthy());
  it('nama kosong / spasi ditolak', () => {
    expect(validateCheckout({ name: '   ', table: '1', itemCount: 1 }).name).toBeTruthy();
  });
  it('meja kosong ditolak', () => expect(validateCheckout({ name: 'A', table: '', itemCount: 1 }).table).toBeTruthy());
  it('data lengkap lolos', () => expect(validateCheckout({ name: 'Ani', table: '7', itemCount: 2 })).toEqual({}));
});
