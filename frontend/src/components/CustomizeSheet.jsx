import { useEffect, useMemo, useState } from 'react';
import { formatRupiah, lineTotal } from '../lib/format.js';
import { imageSrc } from '../lib/api.js';

const byType = (menu, type) => (menu.options || []).filter((o) => o.type === type);

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#1f9d55" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RadioGroup({ title, name, options, value, onChange }) {
  return (
    <section className="sheet__section">
      <div className="sheet__head">
        <h4>{title}</h4>
        <span className="hint">Pilih 1 (maks. 1)</span>
      </div>
      <ul className="radio-list" role="radiogroup" aria-label={title}>
        {options.map((o) => {
          const selected = value?.id === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                className={`radio-row ${selected ? 'is-on' : ''}`}
                onClick={() => onChange(o)}
              >
                <span>{o.name}</span>
                <span className="radio-row__mark">{selected ? <CheckIcon /> : <i className="radio-empty" />}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function CustomizeSheet({ menu, onClose, onAdd }) {
  const sugars = byType(menu, 'sugar');
  const ices = byType(menu, 'ice');
  const toppingOpts = byType(menu, 'topping');

  const defaultOf = (list) => list.find((o) => /^normal/i.test(o.name)) || null;

  const [sugar, setSugar] = useState(defaultOf(sugars));
  const [ice, setIce] = useState(defaultOf(ices));
  const [toppingQty, setToppingQty] = useState({});
  const [notes, setNotes] = useState('');
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const toppings = useMemo(
    () => toppingOpts.map((t) => ({ id: t.id, name: t.name, price: Number(t.price), qty: toppingQty[t.id] || 0 })),
    [toppingOpts, toppingQty]
  );

  const total = lineTotal(menu.price, toppings, qty);
  const setTop = (id, d) =>
    setToppingQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  const submit = () => {
    onAdd({ menu, qty, sugar, ice, toppings, notes });
    onClose();
  };

  const src = imageSrc(menu.image_url);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Kustomisasi ${menu.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="sheet__close" aria-label="Tutup" onClick={onClose}>×</button>

        <div className="sheet__scroll">
          {src && <img className="sheet__img" src={src} alt={menu.name} />}
          <h3 className="sheet__title">{menu.name}</h3>
          {menu.description && <p className="sheet__desc">{menu.description}</p>}
          <p className="sheet__price">{formatRupiah(menu.price)}</p>

          {sugars.length > 0 && <RadioGroup title="Sugar Level" name="sugar" options={sugars} value={sugar} onChange={setSugar} />}
          {ices.length > 0 && <RadioGroup title="Ice Level" name="ice" options={ices} value={ice} onChange={setIce} />}

          {toppingOpts.length > 0 && (
            <section className="sheet__section">
              <div className="sheet__head">
                <h4>Toppings / Add-ons</h4>
                <span className="hint">Opsional</span>
              </div>
              <ul className="topping-list">
                {toppingOpts.map((t) => {
                  const q = toppingQty[t.id] || 0;
                  return (
                    <li key={t.id} className="topping-row">
                      <div>
                        <p className="topping-row__name">{t.name}</p>
                        <p className="topping-row__price">+{formatRupiah(t.price)}</p>
                      </div>
                      <div className="stepper" aria-label={`Jumlah ${t.name}`}>
                        <button type="button" onClick={() => setTop(t.id, -1)} disabled={q === 0} aria-label={`Kurangi ${t.name}`}>−</button>
                        <span data-testid={`topping-qty-${t.id}`}>{q}</span>
                        <button type="button" onClick={() => setTop(t.id, 1)} aria-label={`Tambah ${t.name}`}>+</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="sheet__section">
            <h4>Catatan</h4>
            <textarea
              className="textarea"
              rows={3}
              maxLength={200}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Example: Make my dish delicious!"
            />
          </section>
        </div>

        <div className="sheet__bar">
          <div className="stepper stepper--lg" aria-label="Jumlah pesanan">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Kurangi jumlah">−</button>
            <span data-testid="qty">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Tambah jumlah">+</button>
          </div>
          <button type="button" className="btn btn--primary btn--grow" onClick={submit}>
            Add Orders - {formatRupiah(total)}
          </button>
        </div>
      </div>
    </div>
  );
}
