/** Format angka ke Rupiah: 25000 -> "Rp 25.000" */
export function formatRupiah(value) {
  const n = Number(value) || 0;
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

/** Harga satuan = harga menu + total topping (harga x qty topping) */
export function unitPrice(menuPrice, toppings = []) {
  const extra = toppings.reduce((s, t) => s + (Number(t.price) || 0) * (Number(t.qty) || 0), 0);
  return (Number(menuPrice) || 0) + extra;
}

export function lineTotal(menuPrice, toppings, qty) {
  return unitPrice(menuPrice, toppings) * Math.max(0, Number(qty) || 0);
}

/** Menu minuman jika punya opsi sugar/ice */
export function hasOptionType(menu, type) {
  return Array.isArray(menu?.options) && menu.options.some((o) => o.type === type);
}

/** Kelompokkan menu per kategori, urut sesuai urutan kategori */
export function groupMenusByCategory(categories = [], menus = []) {
  return categories
    .map((c) => ({ ...c, items: menus.filter((m) => m.category_id === c.id) }))
    .filter((c) => c.items.length > 0);
}

export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function validateCheckout({ name, table, itemCount }) {
  const errors = {};
  if (!itemCount) errors.cart = 'Keranjang masih kosong.';
  if (!String(name || '').trim()) errors.name = 'Nama wajib diisi.';
  if (!String(table || '').trim()) errors.table = 'Nomor meja wajib diisi.';
  return errors;
}
