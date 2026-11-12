<?php

namespace App\Http\Controllers;

use App\Services\OrderService;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public static function rules(): array
    {
        return [
            'customer_name' => ['required', 'string', 'max:60'],
            'table_number' => ['required', 'string', 'max:10'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.menu_id' => ['required', 'integer'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'items.*.notes' => ['nullable', 'string', 'max:200'],
            'items.*.selected_options' => ['nullable', 'array'],
            'items.*.selected_options.*.id' => ['required', 'integer'],
            'items.*.selected_options.*.qty' => ['nullable', 'integer', 'min:1', 'max:10'],
        ];
    }

    // POST /api/orders  — khusus Cash / Debit di kasir
    public function store(Request $request, OrderService $service)
    {
        $data = $request->validate(array_merge(self::rules(), [
            'payment_method' => ['required', 'in:cash,debit'],
        ]));

        $built = $service->buildLines($data['items']);
        $order = $service->createOrder($data, $built['lines'], $built['total'], $data['payment_method'], 'pending');

        return response()->json(['data' => $order->toApi()], 201);
    }
}
