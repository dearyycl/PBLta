import { useEffect, useRef, useState } from 'react';

export default function CategoryBar({ groups, activeId, onSelect }) {
  const [open, setOpen] = useState(false);
  const tabsRef = useRef(null);

  // Geser tab aktif agar terlihat
  useEffect(() => {
    const el = tabsRef.current?.querySelector('[aria-selected="true"]');
    el?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  return (
    <nav className="cat-bar" aria-label="Kategori menu">
      <div className="cat-bar__row">
        <div className="cat-bar__tabs" ref={tabsRef} role="tablist">
          {groups.map((g) => (
            <button
              key={g.id}
              role="tab"
              type="button"
              aria-selected={g.id === activeId}
              className={`pill ${g.id === activeId ? 'is-active' : ''}`}
              onClick={() => onSelect(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="cat-bar__more"
          aria-expanded={open}
          aria-label="Lihat semua kategori"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '▲' : '▼'}
        </button>
      </div>

      {open && (
        <div className="cat-bar__dropdown">
          {['Kaika Space', 'The Midday'].map((brand) => (
            <div key={brand}>
              <p className="cat-bar__brand">{brand}</p>
              <div className="cat-bar__list">
                {groups
                  .filter((g) => g.brand === brand)
                  .map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      className={`pill ${g.id === activeId ? 'is-active' : ''}`}
                      onClick={() => {
                        setOpen(false);
                        onSelect(g.id);
                      }}
                    >
                      {g.name}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
