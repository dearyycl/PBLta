<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderItem extends Model
{
    protected $fillable = ['order_id', 'menu_id', 'menu_name', 'unit_price', 'quantity', 'notes', 'selected_options'];

    protected $casts = ['selected_options' => 'array', 'unit_price' => 'integer', 'quantity' => 'integer'];

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function toApi(): array
    {
        $text = collect($this->selected_options ?? [])
            ->map(fn ($o) => ($o['qty'] ?? 1) > 1 ? "{$o['name']} x{$o['qty']}" : $o['name'])
            ->implode(', ');

        return [
            'id' => $this->id,
            'menu_id' => $this->menu_id,
            'menu_name' => $this->menu_name,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price,
            'notes' => $this->notes,
            'options_text' => $text,
        ];
    }
}
