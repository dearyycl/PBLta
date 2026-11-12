<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    // GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
    // Satu akun -> satu laporan terkonsolidasi. Hanya order LUNAS yang dihitung.
    public function index(Request $request)
    {
        $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $q = Order::where('status', 'paid');
        if ($request->filled('from')) {
            $q->where('paid_at', '>=', $request->date('from')->startOfDay());
        }
        if ($request->filled('to')) {
            $q->where('paid_at', '<=', $request->date('to')->endOfDay());
        }

        $orders = $q->orderByDesc('paid_at')->get();
        $revenue = (int) $orders->sum('total_amount');

        return response()->json(['data' => [
            'summary' => [
                'total_revenue' => $revenue,
                'total_orders' => $orders->count(),
                'average' => $orders->count() ? (int) round($revenue / $orders->count()) : 0,
                'by_method' => $orders->groupBy('payment_method')->map(fn ($g) => (int) $g->sum('total_amount')),
            ],
            'transactions' => $orders->map(fn (Order $o) => [
                'id' => $o->id,
                'order_number' => $o->order_number,
                'created_at' => $o->paid_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'),
                'customer_name' => $o->customer_name,
                'table_number' => $o->table_number,
                'payment_method' => $o->payment_method,
                'total_amount' => $o->total_amount,
            ])->values(),
        ]]);
    }
}
