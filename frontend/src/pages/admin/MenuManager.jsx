import { useCallback, useEffect, useState } from 'react';
import { api, imageSrc } from '../../lib/api.js';
import { formatRupiah } from '../../lib/format.js';

const EMPTY = { name: '', description: '', price: '', category_id: '', is_available: true, image: null };

function MenuForm({ categories, initial, onCancel, onSaved, onUnauthorized }) {
  const [f, setF] = useState(initial ? { ...EMPTY, ...initial, image: null } : EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!f.name.trim()) v.name = 'Nama wajib diisi.';
    if (!f.category_id) v.category_id = 'Pilih kategori.';
    if (f.price === '' || Number(f.price) < 0) v.price = 'Harga tidak valid.';
    setErrors(v);
    if (Object.keys(v).length) return;

    const fd = new FormData();
    fd.append('name', f.name.trim());
    fd.append('description', f.description || '');
    fd.append('price', String(f.price));
    fd.append('category_id', String(f.category_id));
    fd.append('is_available', f.is_available ? '1' : '0');
    if (f.image) fd.append('image', f.image);

    setBusy(true);
    try {
      await api.saveMenu(initial?.id, fd);
      onSaved();
    } catch (err) {
      if (err.status === 401) onUnauthorized();
      else setErrors({ form: err.message });
    } finally {
      setBusy(false);
    }
  };

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <form className="modal" onSubmit={submit} onClick={(e) => e.stopPropagation()} noValidate>
        <h3>{initial ? 'Edit Menu' : 'Tambah Menu'}</h3>
        <label className="field"><span>Nama</span>
          <input value={f.name} onChange={set('name')} />{errors.name && <small className="error">{errors.name}</small>}
        </label>
        <label className="field"><span>Kategori</span>
          <select value={f.category_id} onChange={set('category_id')}>
            <option value="">— pilih —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.brand} · {c.name}</option>)}
          </select>
          {errors.category_id && <small className="error">{errors.category_id}</small>}
        </label>
        <label className="field"><span>Harga (Rp)</span>
          <input type="number" min="0" step="500" value={f.price} onChange={set('price')} />{errors.price && <small className="error">{errors.price}</small>}
        </label>
        <label className="field"><span>Deskripsi</span>
          <textarea rows={3} value={f.description} onChange={set('description')} />
        </label>
        <label className="field"><span>Gambar</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setF({ ...f, image: e.target.files?.[0] || null })} />
        </label>
        <label className="check"><input type="checkbox" checked={f.is_available} onChange={set('is_available')} /> Tersedia</label>
        {errors.form && <p className="error" role="alert">{errors.form}</p>}
        <div className="row-end">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Batal</button>
          <button className="btn btn--primary" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    </div>
  );
}

export default function MenuManager({ onUnauthorized }) {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | menu
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([api.adminMenus(), api.categories()]);
      setMenus(m.data ?? m);
      setCategories(c.data ?? c);
    } catch (e) {
      if (e.status === 401) onUnauthorized();
    }
  }, [onUnauthorized]);

  useEffect(() => { load(); }, [load]);

  const toggle = async (id) => { await api.toggleMenu(id); load(); };
  const remove = async (m) => {
    if (!window.confirm(`Hapus "${m.name}"?`)) return;
    await api.deleteMenu(m.id);
    load();
  };

  const catName = (id) => categories.find((c) => c.id === id)?.name || '-';
  const filtered = menus.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <section>
      <div className="toolbar">
        <input className="search" placeholder="Cari menu…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari menu" />
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>+ Tambah Menu</button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Gambar</th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Status</th><th>Aksi</th></tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id}>
                <td data-label="Gambar">{m.image_url ? <img className="thumb" src={imageSrc(m.image_url)} alt="" /> : <span className="thumb thumb--empty">—</span>}</td>
                <td data-label="Nama"><strong>{m.name}</strong><br /><small>{m.description}</small></td>
                <td data-label="Kategori">{catName(m.category_id)}</td>
                <td data-label="Harga">{formatRupiah(m.price)}</td>
                <td data-label="Status">
                  <button type="button" className={`switch ${m.is_available ? 'on' : ''}`} role="switch" aria-checked={Boolean(m.is_available)} aria-label={`Ketersediaan ${m.name}`} onClick={() => toggle(m.id)}>
                    {m.is_available ? 'Available' : 'Sold Out'}
                  </button>
                </td>
                <td data-label="Aksi" className="actions">
                  <button type="button" className="btn btn--ghost" onClick={() => setEditing(m)}>Edit</button>
                  <button type="button" className="btn btn--danger" onClick={() => remove(m)}>Hapus</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <MenuForm
          categories={categories}
          initial={editing === 'new' ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          onUnauthorized={onUnauthorized}
        />
      )}
    </section>
  );
}
