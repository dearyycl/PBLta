import { describe, it, expect } from 'vitest';
import { cartReducer, initialCart, lineKey, cartCount, cartTotal, toOrderPayload } from '../context/cartReducer.js';

const latte = { id: 1, name: 'Flat White', price: 30000 };
const line = (over = {}) => ({
  menu: latte, qty: 1, sugar: { id: 5, name: 'Normal Sugar' }, ice: null,
  toppings: [{ id: 20, name: 'Oat Milk', price: 10000, qty: 1 }], notes: '', ...over,
});

describe('cartReducer (white box)', () => {
  it('ADD menambah item baru', () => {
    const s = cartReducer(initialCart, { type: 'ADD', line: line() });
    expect(s.items).toHaveLength(1);
  });
  it('ADD konfigurasi identik menggabungkan qty', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line() });
    s = cartReducer(s, { type: 'ADD', line: line({ qty: 2 }) });
    expect(s.items).toHaveLength(1);
    expect(s.items[0].qty).toBe(3);
  });
  it('catatan/topping berbeda = baris berbeda', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line() });
    s = cartReducer(s, { type: 'ADD', line: line({ notes: 'tanpa gula' }) });
    expect(s.items).toHaveLength(2);
  });
  it('topping qty 0 diabaikan pada key', () => {
    const a = lineKey(line({ toppings: [{ id: 20, qty: 0 }] }));
    const b = lineKey(line({ toppings: [] }));
    expect(a).toBe(b);
  });
  it('DEC sampai 0 menghapus baris', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line() });
    s = cartReducer(s, { type: 'DEC', key: s.items[0].key });
    expect(s.items).toHaveLength(0);
  });
  it('INC menambah qty', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line() });
    s = cartReducer(s, { type: 'INC', key: s.items[0].key });
    expect(s.items[0].qty).toBe(2);
  });
  it('REMOVE menghapus baris', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line() });
    s = cartReducer(s, { type: 'REMOVE', key: s.items[0].key });
    expect(s.items).toEqual([]);
  });
  it('RESET menghapus seluruh sesi (item, nama, meja)', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line() });
    s = cartReducer(s, { type: 'SET_CUSTOMER', name: 'Ani', table: '9' });
    s = cartReducer(s, { type: 'RESET' });
    expect(s).toEqual(initialCart);
  });
  it('action tak dikenal tidak mengubah state', () => {
    expect(cartReducer(initialCart, { type: 'X' })).toBe(initialCart);
  });
});

describe('kunci meja dari QR', () => {
  it('LOCK_TABLE mengunci nomor meja', () => {
    const s = cartReducer(initialCart, { type: 'LOCK_TABLE', table: '12' });
    expect(s).toMatchObject({ tableNumber: '12', tableLocked: true });
  });
  it('nomor meja tidak valid ditolak (mis. skrip/spasi)', () => {
    expect(cartReducer(initialCart, { type: 'LOCK_TABLE', table: '<b>1' })).toBe(initialCart);
    expect(cartReducer(initialCart, { type: 'LOCK_TABLE', table: '' })).toBe(initialCart);
  });
  it('meja terkunci tidak bisa diubah lewat SET_CUSTOMER', () => {
    let s = cartReducer(initialCart, { type: 'LOCK_TABLE', table: '12' });
    s = cartReducer(s, { type: 'SET_CUSTOMER', table: '99', name: 'Ani' });
    expect(s.tableNumber).toBe('12');
    expect(s.customerName).toBe('Ani');
  });
  it('RESET menghapus keranjang tetapi tetap mengunci meja QR', () => {
    let s = cartReducer(initialCart, { type: 'LOCK_TABLE', table: '12' });
    s = cartReducer(s, { type: 'SET_CUSTOMER', name: 'Ani' });
    s = cartReducer(s, { type: 'RESET' });
    expect(s).toMatchObject({ items: [], customerName: '', tableNumber: '12', tableLocked: true });
  });
});

describe('cart totals & payload (black box)', () => {
  it('total = (30.000 + 10.000) x 2 = 80.000', () => {
    const s = cartReducer(initialCart, { type: 'ADD', line: line({ qty: 2 }) });
    expect(cartCount(s)).toBe(2);
    expect(cartTotal(s)).toBe(80000);
  });
  it('payload memuat opsi terpilih & metode bayar', () => {
    let s = cartReducer(initialCart, { type: 'ADD', line: line({ notes: ' less ice ' }) });
    s = cartReducer(s, { type: 'SET_CUSTOMER', name: ' Budi ', table: '12' });
    const p = toOrderPayload(s, 'cash');
    expect(p).toMatchObject({ customer_name: 'Budi', table_number: '12', payment_method: 'cash' });
    expect(p.items[0]).toMatchObject({ menu_id: 1, quantity: 1, notes: 'less ice' });
    expect(p.items[0].selected_options).toEqual([{ id: 5, qty: 1 }, { id: 20, qty: 1 }]);
  });
});
