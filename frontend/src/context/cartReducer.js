import { lineTotal } from '../lib/format.js';

export const initialCart = { items: [], customerName: '', tableNumber: '', tableLocked: false };

/** Nomor meja dari QR: huruf/angka/strip, 1-10 karakter */
export const isValidTable = (t) => /^[A-Za-z0-9-]{1,10}$/.test(String(t ?? ''));

/** Kunci unik per konfigurasi item supaya item identik digabung */
export function lineKey(line) {
  const tops = [...(line.toppings || [])]
    .filter((t) => t.qty > 0)
    .sort((a, b) => a.id - b.id)
    .map((t) => `${t.id}x${t.qty}`)
    .join(',');
  return [line.menu.id, line.sugar?.id ?? '-', line.ice?.id ?? '-', tops, (line.notes || '').trim()].join('|');
}

export function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const line = { ...action.line, toppings: (action.line.toppings || []).filter((t) => t.qty > 0) };
      const key = lineKey(line);
      const exists = state.items.find((i) => i.key === key);
      if (exists) {
        return {
          ...state,
          items: state.items.map((i) => (i.key === key ? { ...i, qty: i.qty + line.qty } : i)),
        };
      }
      return { ...state, items: [...state.items, { ...line, key }] };
    }
    case 'INC':
      return { ...state, items: state.items.map((i) => (i.key === action.key ? { ...i, qty: i.qty + 1 } : i)) };
    case 'DEC':
      return {
        ...state,
        items: state.items
          .map((i) => (i.key === action.key ? { ...i, qty: i.qty - 1 } : i))
          .filter((i) => i.qty > 0),
      };
    case 'REMOVE':
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case 'SET_CUSTOMER':
      return {
        ...state,
        customerName: action.name ?? state.customerName,
        // meja hasil scan QR tidak bisa diubah
        tableNumber: state.tableLocked ? state.tableNumber : action.table ?? state.tableNumber,
      };
    case 'LOCK_TABLE':
      return isValidTable(action.table)
        ? { ...state, tableNumber: String(action.table), tableLocked: true }
        : state;
    case 'RESET':
      // sesi dihapus total, kecuali meja dari QR (meja fisik tidak berubah)
      return state.tableLocked
        ? { ...initialCart, tableNumber: state.tableNumber, tableLocked: true }
        : { ...initialCart };
    default:
      return state;
  }
}

export const cartCount = (state) => state.items.reduce((s, i) => s + i.qty, 0);
export const cartTotal = (state) =>
  state.items.reduce((s, i) => s + lineTotal(i.menu.price, i.toppings, i.qty), 0);

/** Payload sesuai API Laravel */
export function toOrderPayload(state, paymentMethod) {
  return {
    customer_name: state.customerName.trim(),
    table_number: String(state.tableNumber).trim(),
    payment_method: paymentMethod,
    items: state.items.map((i) => ({
      menu_id: i.menu.id,
      quantity: i.qty,
      notes: (i.notes || '').trim() || null,
      selected_options: [
        ...(i.sugar ? [{ id: i.sugar.id, qty: 1 }] : []),
        ...(i.ice ? [{ id: i.ice.id, qty: 1 }] : []),
        ...i.toppings.filter((t) => t.qty > 0).map((t) => ({ id: t.id, qty: t.qty })),
      ],
    })),
  };
}
