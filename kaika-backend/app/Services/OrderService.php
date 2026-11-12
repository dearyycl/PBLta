<?php

namespace App\Services;

use App\Models\Menu;
use App\Models\Order;
use App\Models\PaymentSession;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OrderService
{
    /**
     * Validasi item + hitung harga di SERVER (harga dari client tidak pernah dipercaya).
     *
     * @param  array<int, array{menu_id:int, quantity:int, notes?:?string, selected_options?:array}>  $items
     * @return array{lines: array<int, array>, total: int}
     */
    public function buildLines(array $items): array
    {
        if (count($items) === 0) {
            throw ValidationException::withMessages(['items' => 'Keranjang kosong.']);
        }

        $menus = Menu::with('options')->whereIn('id', collect($items)->pluck('menu_id'))->get()->keyBy('id');
        $lines = [];
        $total = 0;

        foreach ($items as $idx => $item) {
            /** @var Menu|null $menu */
            $menu = $menus->get($item['menu_id'] ?? 0);
            if (! $menu) {
                throw ValidationException::withMessages(["items.$idx.menu_id" => 'Menu tidak ditemukan.']);
            }
            if (! $menu->is_available) {
                throw ValidationException::withMessages(["items.$idx.menu_id" => "{$menu->name} sedang habis (sold out)."]);
            }

            $qty = (int) ($item['quantity'] ?? 0);
            if ($qty < 1 || $qty > 50) {
                throw ValidationException::withMessages(["items.$idx.quantity" => 'Jumlah harus 1-50.']);
            }

            $picked = [];
            $perType = ['sugar' => 0, 'ice' => 0];
            $extra = 0;

            foreach ($item['selected_options'] ?? [] as $sel) {
                $option = $menu->options->firstWhere('id', $sel['id'] ?? 0);
                if (! $option) {
                    throw ValidationException::withMessages(["items.$idx.selected_options" => 'Opsi tidak tersedia untuk menu ini.']);
                }
                $oq = (int) ($sel['qty'] ?? 1);

                if (isset($perType[$option->type])) {
                    $perType[$option->type]++;
                    if ($perType[$option->type] > 1) {
                        throw ValidationException::withMessages(["items.$idx.selected_options" => "Hanya boleh memilih 1 {$option->type}."]);
                    }
                    $oq = 1;
                } elseif ($oq < 1 || $oq > 10) {
                    throw ValidationException::withMessages(["items.$idx.selected_options" => 'Jumlah topping harus 1-10.']);
                }

                $extra += $option->price * $oq;
                $picked[] = ['id' => $option->id, 'type' => $option->type, 'name' => $option->name, 'price' => $option->price, 'qty' => $oq];
            }

            $unit = $menu->price + $extra;
            $total += $unit * $qty;

            $lines[] = [
                'menu_id' => $menu->id,
                'menu_name' => $menu->name,
                'unit_price' => $unit,
                'quantity' => $qty,
                'notes' => isset($item['notes']) ? mb_substr(trim((string) $item['notes']), 0, 200) ?: null : null,
                'selected_options' => $picked,
            ];
        }

        return ['lines' => $lines, 'total' => $total];
    }

    /** Simpan order + item secara atomik. */
    public function createOrder(array $customer, array $lines, int $total, string $method, string $status): Order
    {
        return DB::transaction(function () use ($customer, $lines, $total, $method, $status) {
            $order = Order::create([
                'customer_name' => $customer['customer_name'],
                'table_number' => $customer['table_number'],
                'total_amount' => $total,
                'payment_method' => $method,
                'status' => $status,
                'kitchen_status' => 'pending',
                'paid_at' => $status === 'paid' ? now() : null,
            ]);
            $order->items()->createMany($lines);

            return $order->load('items');
        });
    }

    /**
     * Tandai sesi QRIS lunas -> baru di sini order dibuat (muncul di dashboard kasir).
     * Sesi yang sudah kedaluwarsa TIDAK PERNAH menghasilkan order.
     */
    public function markSessionPaid(PaymentSession $session): ?Order
    {
        return DB::transaction(function () use ($session) {
            $session = PaymentSession::lockForUpdate()->findOrFail($session->id);

            if ($session->status === 'paid') {
                return Order::with('items')->find($session->order_id);
            }
            if ($session->status !== 'waiting') {
                return null;
            }
            if ($session->isExpired()) {
                $session->update(['status' => 'expired']);
                return null;
            }

            $data = $session->payload;
            $order = $this->createOrder($data['customer'], $data['lines'], $session->amount, 'qris', 'paid');
            $session->update(['status' => 'paid', 'paid_at' => now(), 'order_id' => $order->id]);

            return $order;
        });
    }
}
