<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
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
