<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentSession extends Model
{
    protected $fillable = ['amount', 'status', 'qr_payload', 'payload', 'expires_at', 'paid_at', 'order_id'];

    protected $casts = [
        'payload' => 'array',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'amount' => 'integer',
    ];

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }
}
