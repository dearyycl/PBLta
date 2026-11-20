<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Controllers\OrderController;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderAdminController extends Controller
{
    // GET /api/admin/orders — antrean live (order QRIS hanya ada jika sudah lunas)
    public function index()
    {
        $orders = Order::with('items')
            ->where(function ($q) {
                $q->where('kitchen_status', '!=', 'completed')
                  ->orWhere('created_at', '>=', now()->subHours(6));
            })
            ->orderBy('created_at')
            ->get();

        return response()->json(['data' => $orders->map->toApi()->values()]);
    }

    // POST /api/admin/orders — pesanan langsung di kasir (POS). Wajib login, langsung berstatus LUNAS.
    public function store(Request $request, OrderService $service)
    {
        $data = $request->validate(array_merge(OrderController::rules(), [
            'customer_name' => ['nullable', 'string', 'max:60'],
            'table_number' => ['nullable', 'string', 'max:10'],
            'payment_method' => ['required', 'in:cash,debit,qris'],
        ]));

        $data['customer_name'] = trim((string) ($data['customer_name'] ?? '')) ?: 'Pelanggan';
        $data['table_number'] = trim((string) ($data['table_number'] ?? '')) ?: 'Take Away';

        $built = $service->buildLines($data['items']); // harga tetap dihitung server
        $order = $service->createOrder($data, $built['lines'], $built['total'], $data['payment_method'], 'paid');

        return response()->json(['data' => $order->toApi()], 201);
    }

    // PATCH /api/admin/orders/{order}/status { kitchen_status }
    public function updateStatus(Request $request, Order $order)
    {
        $data = $request->validate(['kitchen_status' => ['required', 'in:pending,cooking,completed']]);
        $order->update($data);

        return response()->json(['data' => $order->load('items')->toApi()]);
    }

    // PATCH /api/admin/orders/{order}/paid — kasir menandai Cash/Debit sudah dibayar
    public function markPaid(Order $order)
    {
        if ($order->status !== 'paid') {
            $order->update(['status' => 'paid', 'paid_at' => now()]);
        }

        return response()->json(['data' => $order->load('items')->toApi()]);
    }
}
