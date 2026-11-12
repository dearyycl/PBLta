import { formatRupiah } from '../lib/format.js';
import { imageSrc } from '../lib/api.js';

export default function MenuCard({ menu, onOpen }) {
  const available = Boolean(menu.is_available);
  const src = imageSrc(menu.image_url);

  const handleOpen = () => {
    if (available) onOpen(menu);
  };

  return (
    <article
      className={`menu-card ${available ? '' : 'is-soldout'}`}
      data-testid={`menu-card-${menu.id}`}
      role="button"
      tabIndex={available ? 0 : -1}
      aria-disabled={!available}
      onClick={handleOpen}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpen()}
    >
      <div className="menu-card__body">
        <h3 className="menu-card__name">{menu.name}</h3>
        {menu.description && <p className="menu-card__desc">{menu.description}</p>}
        <p className="menu-card__price">{formatRupiah(menu.price)}</p>
      </div>
      <div className="menu-card__media">
        {src ? (
          <img src={src} alt={menu.name} loading="lazy" />
        ) : (
          <div className="menu-card__placeholder" aria-hidden="true">☕</div>
        )}
        {available ? (
          <button
            type="button"
            className="btn-add"
            aria-label={`Tambah ${menu.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onOpen(menu);
            }}
          >
            +
          </button>
        ) : (
          <span className="badge-soldout">Sold out</span>
        )}
      </div>
    </article>
  );
}
