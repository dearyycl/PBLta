<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    protected $fillable = [
        'customer_name', 'table_number', 'total_amount', 'payment_method',
        'status', 'kitchen_status', 'paid_at',
    ];

    protected $casts = ['total_amount' => 'integer', 'paid_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function getOrderNumberAttribute(): string
    {
        return 'KM-' . str_pad((string) $this->id, 4, '0', STR_PAD_LEFT);
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'customer_name' => $this->customer_name,
            'table_number' => $this->table_number,
            'total_amount' => $this->total_amount,
            'payment_method' => $this->payment_method,
            'status' => $this->status,
            'kitchen_status' => $this->kitchen_status,
            'created_at' => $this->created_at?->timezone(config('app.timezone'))->format('Y-m-d H:i'),
            'items' => $this->items->map(fn (OrderItem $i) => $i->toApi())->values(),
        ];
    }
}
