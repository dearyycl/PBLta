import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { cartReducer, initialCart, cartCount, cartTotal, isValidTable } from './cartReducer.js';

const CartContext = createContext(null);
const TABLE_KEY = 'kaika_table';

// Pulihkan meja hasil scan QR agar tetap terkunci saat halaman di-refresh
function init() {
  try {
    const t = sessionStorage.getItem(TABLE_KEY);
    if (isValidTable(t)) return { ...initialCart, tableNumber: t, tableLocked: true };
  } catch {
    /* storage diblokir */
  }
  return initialCart;
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, init);

  useEffect(() => {
    try {
      if (state.tableLocked) sessionStorage.setItem(TABLE_KEY, state.tableNumber);
    } catch {
      /* abaikan */
    }
  }, [state.tableLocked, state.tableNumber]);

  const value = useMemo(
    () => ({ state, dispatch, count: cartCount(state), total: cartTotal(state) }),
    [state]
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart harus dipakai di dalam CartProvider');
  return ctx;
}
