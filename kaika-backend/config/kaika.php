<?php

return [
    // Batas waktu pembayaran QRIS (menit)
    'qris_ttl_minutes' => (int) env('KAIKA_QRIS_TTL', 5),

    // Mengaktifkan endpoint simulasi bayar (HANYA untuk lokal/uji)
    'enable_simulation' => (bool) env('KAIKA_ENABLE_SIMULATION', false),

    // Rahasia tanda tangan webhook payment gateway
    'webhook_secret' => env('KAIKA_WEBHOOK_SECRET', ''),

    // Akun tunggal kasir/admin
    'admin_email' => env('KAIKA_ADMIN_EMAIL', 'admin@kaika.space'),
    'admin_name' => 'Kasir Utama / Admin Kaika Space',
];
