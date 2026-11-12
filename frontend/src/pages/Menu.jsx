import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatRupiah, groupMenusByCategory } from '../lib/format.js';
import { useCart } from '../context/CartContext.jsx';
import CategoryBar from '../components/CategoryBar.jsx';
import MenuCard from '../components/MenuCard.jsx';
import CustomizeSheet from '../components/CustomizeSheet.jsx';

const HEADER_OFFSET = 120; // tinggi header + category bar

export default function Menu() {
  const navigate = useNavigate();
  const { dispatch, count, total } = useCart();
  const [groups, setGroups] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [activeId, setActiveId] = useState(null);
  const [selected, setSelected] = useState(null);
  const sectionRefs = useRef({});
  const lockRef = useRef(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [cats, menus] = await Promise.all([api.categories(), api.menus()]);
      const g = groupMenusByCategory(cats.data ?? cats, menus.data ?? menus);
      setGroups(g);
      setActiveId(g[0]?.id ?? null);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-highlight tab berdasarkan posisi scroll
  useEffect(() => {
    if (status !== 'ready') return;
    const onScroll = () => {
      if (lockRef.current) return;
      let current = groups[0]?.id;
      for (const g of groups) {
        const el = sectionRefs.current[g.id];
        if (el && el.getBoundingClientRect().top - HEADER_OFFSET <= 8) current = g.id;
      }
      setActiveId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [groups, status]);

  const scrollTo = (id) => {
    const el = sectionRefs.current[id];
    if (!el) return;
    lockRef.current = true;
    setActiveId(id);
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET + 4;
    window.scrollTo({ top, behavior: 'smooth' });
    setTimeout(() => (lockRef.current = false), 700);
  };

  let lastBrand = null;

  return (
    <div className="page menu-page">
      <header className="topbar">
        <img src="/logo.jpeg" alt="Kaika Space" className="topbar__logo" />
        <div className="topbar__title">
          <strong>Kaika Space x The Midday</strong>
          <span>Pesan dari meja Anda</span>
        </div>
      </header>

      {status === 'ready' && <CategoryBar groups={groups} activeId={activeId} onSelect={scrollTo} />}

      <main className="menu-feed">
        {status === 'loading' && (
          <div className="skeleton-list" aria-busy="true" aria-label="Memuat menu">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" />
            ))}
          </div>
        )}

        {status === 'error' && (
          <div className="notice" role="alert">
            <p>Menu belum bisa dimuat. Periksa koneksi lalu coba lagi.</p>
            <button type="button" className="btn btn--primary" onClick={load}>Muat ulang</button>
          </div>
        )}

        {status === 'ready' &&
          groups.map((g) => {
            const showBrand = g.brand !== lastBrand;
            lastBrand = g.brand;
            return (
              <section key={g.id} ref={(el) => (sectionRefs.current[g.id] = el)} className="menu-section" aria-labelledby={`cat-${g.id}`}>
                {showBrand && <p className="brand-label">{g.brand}</p>}
                <h2 id={`cat-${g.id}`}>{g.name}</h2>
                <div className="menu-grid">
                  {g.items.map((m) => (
                    <MenuCard key={m.id} menu={m} onOpen={setSelected} />
                  ))}
                </div>
              </section>
            );
          })}
      </main>

      {count > 0 && (
        <div className="cart-bar">
          <button type="button" className="btn btn--primary btn--block" onClick={() => navigate('/checkout')}>
            <span>Lihat Keranjang ({count})</span>
            <span>{formatRupiah(total)}</span>
          </button>
        </div>
      )}

      {selected && (
        <CustomizeSheet
          menu={selected}
          onClose={() => setSelected(null)}
          onAdd={(line) => dispatch({ type: 'ADD', line })}
        />
      )}
    </div>
  );
}
