<?php

namespace App\Http\Controllers;

use App\Models\PaymentSession;
use App\Services\OrderService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    // POST /api/payments/qris — membuat sesi; BELUM membuat order
    public function createQris(Request $request, OrderService $service)
    {
        $data = $request->validate(array_merge(OrderController::rules(), [
            'payment_method' => ['required', 'in:qris'],
        ]));

        $built = $service->buildLines($data['items']);

        $session = PaymentSession::create([
            'amount' => $built['total'],
            'status' => 'waiting',
            'expires_at' => now()->addMinutes(config('kaika.qris_ttl_minutes')),
            'payload' => [
                'customer' => ['customer_name' => $data['customer_name'], 'table_number' => $data['table_number']],
                'lines' => $built['lines'],
            ],
        ]);

        // GANTI dengan QR string asli dari payment gateway (Midtrans/Xendit/dll.)
        $session->update(['qr_payload' => "KAIKA-QRIS|{$session->id}|{$session->amount}"]);

        return response()->json(['data' => $this->present($session)], 201);
    }

    // GET /api/payments/{id}
    public function show(PaymentSession $session, OrderService $service)
    {
        // Kedaluwarsa dievaluasi saat dibaca: sesi tak dibayar tidak pernah jadi order
        if ($session->status === 'waiting' && $session->isExpired()) {
            $session->update(['status' => 'expired']);
        }

        return response()->json(['data' => $this->present($session->fresh())]);
    }

    // POST /api/payments/{id}/simulate-paid — hanya lokal/uji
    public function simulatePaid(PaymentSession $session, OrderService $service)
    {
        abort_unless(
            config('kaika.enable_simulation') || app()->environment(['local', 'testing']),
            404
        );

        $order = $service->markSessionPaid($session);
        if (! $order) {
            return response()->json(['message' => 'Sesi pembayaran sudah habis atau tidak valid.'], 410);
        }

        return response()->json(['data' => $this->present($session->fresh())]);
    }

    // POST /api/payments/webhook — dipanggil payment gateway
    public function webhook(Request $request, OrderService $service)
    {
        $secret = (string) config('kaika.webhook_secret');
        $expected = hash_hmac('sha256', $request->getContent(), $secret);

        abort_if($secret === '' || ! hash_equals($expected, (string) $request->header('X-Signature')), 401, 'Signature tidak valid.');

        $data = $request->validate(['session_id' => ['required', 'integer'], 'status' => ['required', 'in:paid,failed']]);
        $session = PaymentSession::findOrFail($data['session_id']);

        if ($data['status'] === 'paid') {
            $service->markSessionPaid($session);
        } elseif ($session->status === 'waiting') {
            $session->update(['status' => 'failed']); // gagal -> dibuang, tidak ada order
        }

        return response()->json(['ok' => true]);
    }

    private function present(PaymentSession $s): array
    {
        return [
            'id' => $s->id,
            'status' => $s->status,
            'amount' => $s->amount,
            'qr_payload' => $s->qr_payload,
            'expires_at' => $s->expires_at->toIso8601String(),
            'order_id' => $s->order_id,
            'order_number' => $s->order_id ? 'KM-' . str_pad((string) $s->order_id, 4, '0', STR_PAD_LEFT) : null,
        ];
    }
}
