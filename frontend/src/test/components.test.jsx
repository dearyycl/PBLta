import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MenuCard from '../components/MenuCard.jsx';
import CustomizeSheet from '../components/CustomizeSheet.jsx';

const drink = {
  id: 1, category_id: 1, name: 'Flat White', description: 'espresso blended with silky steamed milk',
  price: 30000, image_url: null, is_available: true,
  options: [
    { id: 1, type: 'sugar', name: 'Normal Sugar', price: 0 },
    { id: 2, type: 'sugar', name: 'Less Sugar', price: 0 },
    { id: 3, type: 'ice', name: 'Normal Ice', price: 0 },
    { id: 4, type: 'ice', name: 'Less Ice', price: 0 },
    { id: 5, type: 'topping', name: 'Oat Milk', price: 10000 },
    { id: 6, type: 'topping', name: 'Shot Espresso', price: 8000 },
  ],
};

describe('MenuCard', () => {
  it('tersedia: tombol + aktif dan membuka kustomisasi', async () => {
    const onOpen = vi.fn();
    render(<MenuCard menu={drink} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: /tambah flat white/i }));
    expect(onOpen).toHaveBeenCalledWith(drink);
  });

  it('habis: tampil badge Sold out dan tidak bisa dibuka', async () => {
    const onOpen = vi.fn();
    render(<MenuCard menu={{ ...drink, is_available: false }} onOpen={onOpen} />);
    expect(screen.getByText('Sold out')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /tambah/i })).toBeNull();
    await userEvent.click(screen.getByTestId('menu-card-1'));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('menampilkan harga dalam Rupiah', () => {
    render(<MenuCard menu={drink} onOpen={() => {}} />);
    expect(screen.getByText('Rp 30.000')).toBeInTheDocument();
  });
});

describe('CustomizeSheet', () => {
  const setup = () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<CustomizeSheet menu={drink} onAdd={onAdd} onClose={onClose} />);
    return { onAdd, onClose };
  };

  it('default Normal Sugar & Normal Ice terpilih', () => {
    setup();
    expect(screen.getByRole('radio', { name: 'Normal Sugar' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Normal Ice' })).toHaveAttribute('aria-checked', 'true');
  });

  it('sugar single-select (maks 1)', async () => {
    setup();
    await userEvent.click(screen.getByRole('radio', { name: 'Less Sugar' }));
    expect(screen.getByRole('radio', { name: 'Less Sugar' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Normal Sugar' })).toHaveAttribute('aria-checked', 'false');
  });

  it('total dinamis: topping + qty', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tambah Oat Milk' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tambah Shot Espresso' }));
    expect(screen.getByRole('button', { name: /Add Orders - Rp 48\.000/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tambah jumlah' }));
    expect(screen.getByRole('button', { name: /Add Orders - Rp 96\.000/ })).toBeInTheDocument();
  });

  it('stepper topping tidak bisa di bawah 0 dan qty minimal 1', async () => {
    setup();
    expect(screen.getByRole('button', { name: 'Kurangi Oat Milk' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Kurangi jumlah' }));
    expect(screen.getByTestId('qty')).toHaveTextContent('1');
  });

  it('mengirim pilihan lengkap ke onAdd lalu menutup', async () => {
    const { onAdd, onClose } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Tambah Oat Milk' }));
    await userEvent.type(screen.getByPlaceholderText('Example: Make my dish delicious!'), 'panas');
    await userEvent.click(screen.getByRole('button', { name: /Add Orders/ }));
    const arg = onAdd.mock.calls[0][0];
    expect(arg.qty).toBe(1);
    expect(arg.notes).toBe('panas');
    expect(arg.sugar.name).toBe('Normal Sugar');
    expect(arg.toppings.find((t) => t.name === 'Oat Milk').qty).toBe(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('menu makanan tanpa opsi minuman tidak menampilkan Sugar/Ice', () => {
    render(<CustomizeSheet menu={{ ...drink, options: [] }} onAdd={() => {}} onClose={() => {}} />);
    expect(screen.queryByText('Sugar Level')).toBeNull();
    expect(screen.queryByText('Ice Level')).toBeNull();
  });
});
