<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\PaymentSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use Tests\TestHelpers;

/**
 * BLACK BOX: hanya memakai kontrak HTTP (input -> output), tanpa melihat isi kode.
 */
class CustomerApiTest extends TestCase
{
    use RefreshDatabase, TestHelpers;

    public function test_katalog_menampilkan_menu_tersedia_dan_sold_out(): void
    {
        $this->makeMenu(['name' => 'Espresso']);
        $this->makeMenu(['name' => 'Habis', 'is_available' => false]);

        $this->getJson('/api/categories')->assertOk()->assertJsonPath('data.0.brand', 'Kaika Space');
        $res = $this->getJson('/api/menus')->assertOk();
        $res->assertJsonCount(2, 'data');
        $res->assertJsonFragment(['name' => 'Habis', 'is_available' => false]);
    }

    public function test_order_cash_masuk_antrean_status_pending(): void
    {
        $menu = $this->makeMenu();
        $this->postJson('/api/orders', $this->orderPayload($menu))
            ->assertCreated()
            ->assertJsonPath('data.total_amount', 60000)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.kitchen_status', 'pending');
        $this->assertDatabaseCount('orders', 1);
    }

    public function test_order_tidak_bisa_memakai_metode_qris_di_endpoint_kasir(): void
    {
        $menu = $this->makeMenu();
        $this->postJson('/api/orders', $this->orderPayload($menu, ['payment_method' => 'qris']))
            ->assertStatus(422);
    }

    public function test_validasi_wajib_nama_meja_dan_item(): void
    {
        $this->postJson('/api/orders', ['payment_method' => 'cash'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['customer_name', 'table_number', 'items']);
    }

    public function test_harga_dari_client_diabaikan(): void
    {
        $menu = $this->makeMenu(['price' => 30000]);
        $payload = $this->orderPayload($menu);
        $payload['total_amount'] = 1; // dicoba dimanipulasi
        $payload['items'][0]['price'] = 1;
        $this->postJson('/api/orders', $payload)->assertCreated()->assertJsonPath('data.total_amount', 60000);
    }

    public function test_item_sold_out_ditolak(): void
    {
        $menu = $this->makeMenu(['is_available' => false]);
        $this->postJson('/api/orders', $this->orderPayload($menu))->assertStatus(422);
        $this->assertDatabaseCount('orders', 0);
    }

    /* ---------- QRIS ---------- */

    public function test_qris_membuat_sesi_tetapi_belum_membuat_order(): void
    {
        $menu = $this->makeMenu();
        $this->postJson('/api/payments/qris', $this->orderPayload($menu, ['payment_method' => 'qris']))
            ->assertCreated()
            ->assertJsonPath('data.status', 'waiting')
            ->assertJsonPath('data.amount', 60000);

        $this->assertDatabaseCount('payment_sessions', 1);
        $this->assertDatabaseCount('orders', 0); // belum ada di antrean kasir
    }

    public function test_qris_dibayar_membuat_order_lunas_di_antrean(): void
    {
        $menu = $this->makeMenu();
        $id = $this->postJson('/api/payments/qris', $this->orderPayload($menu, ['payment_method' => 'qris']))->json('data.id');

        $this->postJson("/api/payments/$id/simulate-paid")->assertOk()->assertJsonPath('data.status', 'paid');

        $order = Order::first();
        $this->assertSame('paid', $order->status);
        $this->assertSame('qris', $order->payment_method);
        $this->getJson("/api/payments/$id")->assertJsonPath('data.order_id', $order->id);
    }

    public function test_qris_kedaluwarsa_dibuang_dan_tidak_pernah_jadi_order(): void
    {
        $menu = $this->makeMenu();
        $id = $this->postJson('/api/payments/qris', $this->orderPayload($menu, ['payment_method' => 'qris']))->json('data.id');

        PaymentSession::find($id)->update(['expires_at' => now()->subMinute()]);

        $this->getJson("/api/payments/$id")->assertJsonPath('data.status', 'expired');
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_bayar_setelah_kedaluwarsa_ditolak_tanpa_retry(): void
    {
        $menu = $this->makeMenu();
        $id = $this->postJson('/api/payments/qris', $this->orderPayload($menu, ['payment_method' => 'qris']))->json('data.id');
        PaymentSession::find($id)->update(['expires_at' => now()->subSecond()]);

        $this->postJson("/api/payments/$id/simulate-paid")->assertStatus(410);
        $this->assertDatabaseCount('orders', 0);
        // sesi tetap mati: tidak ada jalan menghidupkannya kembali
        $this->getJson("/api/payments/$id")->assertJsonPath('data.status', 'expired');
    }

    public function test_webhook_tanpa_signature_valid_ditolak(): void
    {
        config(['kaika.webhook_secret' => 'rahasia']);
        $this->postJson('/api/payments/webhook', ['session_id' => 1, 'status' => 'paid'], ['X-Signature' => 'salah'])
            ->assertStatus(401);
    }

    public function test_webhook_gagal_menandai_sesi_failed_tanpa_order(): void
    {
        config(['kaika.webhook_secret' => 'rahasia']);
        $menu = $this->makeMenu();
        $id = $this->postJson('/api/payments/qris', $this->orderPayload($menu, ['payment_method' => 'qris']))->json('data.id');

        $body = json_encode(['session_id' => $id, 'status' => 'failed']);
        $sig = hash_hmac('sha256', $body, 'rahasia');
        $this->call('POST', '/api/payments/webhook', [], [], [], [
            'CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => $sig, 'HTTP_ACCEPT' => 'application/json',
        ], $body)->assertOk();

        $this->assertSame('failed', PaymentSession::find($id)->status);
        $this->assertDatabaseCount('orders', 0);
    }
}
