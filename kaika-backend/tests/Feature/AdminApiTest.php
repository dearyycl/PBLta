<?php

namespace Tests\Feature;

use App\Models\Menu;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use Tests\TestHelpers;

class AdminApiTest extends TestCase
{
    use RefreshDatabase, TestHelpers;

    private function auth(): array
    {
        $this->makeAdmin('rahasia123');
        $token = $this->postJson('/api/admin/login', ['password' => 'rahasia123'])->assertOk()->json('data.token');

        return ['Authorization' => "Bearer $token"];
    }

    public function test_endpoint_admin_wajib_login(): void
    {
        foreach (['/api/admin/orders', '/api/admin/menus', '/api/admin/reports'] as $url) {
            $this->getJson($url)->assertUnauthorized();
        }
    }

    public function test_login_password_salah_ditolak(): void
    {
        $this->makeAdmin('rahasia123');
        $this->postJson('/api/admin/login', ['password' => 'salah'])->assertStatus(422);
    }

    public function test_login_berhasil_memakai_label_akun_tunggal(): void
    {
        $this->makeAdmin('rahasia123');
        $this->postJson('/api/admin/login', ['password' => 'rahasia123'])
            ->assertOk()->assertJsonPath('data.name', 'Kasir Utama / Admin Kaika Space');
    }

    public function test_antrean_dan_pergantian_status_dapur(): void
    {
        $h = $this->auth();
        $menu = $this->makeMenu();
        $id = $this->postJson('/api/orders', $this->orderPayload($menu))->json('data.id');

        $this->getJson('/api/admin/orders', $h)->assertOk()->assertJsonCount(1, 'data');
        $this->patchJson("/api/admin/orders/$id/status", ['kitchen_status' => 'cooking'], $h)
            ->assertOk()->assertJsonPath('data.kitchen_status', 'cooking');
        $this->patchJson("/api/admin/orders/$id/status", ['kitchen_status' => 'meledak'], $h)->assertStatus(422);
    }

    public function test_crud_menu_dengan_upload_gambar(): void
    {
        Storage::fake('public');
        $h = $this->auth();
        $cat = $this->makeMenu()->category;

        $res = $this->post('/api/admin/menus', [
            'category_id' => $cat->id, 'name' => 'Menu Baru', 'price' => 27000, 'is_available' => 1,
            'description' => 'enak', 'image' => UploadedFile::fake()->image('a.jpg'),
        ], $h + ['Accept' => 'application/json'])->assertCreated();

        $url = $res->json('data.image_url');
        $this->assertStringStartsWith('/storage/menus/', $url);
        Storage::disk('public')->assertExists(substr($url, strlen('/storage/')));

        $id = $res->json('data.id');
        $this->putJson("/api/admin/menus/$id", [
            'category_id' => $cat->id, 'name' => 'Menu Baru', 'price' => 29000, 'is_available' => true,
        ], $h)->assertOk()->assertJsonPath('data.price', 29000);

        $this->patchJson("/api/admin/menus/$id/toggle", [], $h)->assertJsonPath('data.is_available', false);

        $this->deleteJson("/api/admin/menus/$id", [], $h)->assertOk();
        $this->assertDatabaseMissing('menus', ['id' => $id]);
        Storage::disk('public')->assertMissing(substr($url, strlen('/storage/')));
    }

    public function test_upload_bukan_gambar_ditolak(): void
    {
        Storage::fake('public');
        $h = $this->auth();
        $cat = $this->makeMenu()->category;
        $this->post('/api/admin/menus', [
            'category_id' => $cat->id, 'name' => 'X', 'price' => 1000, 'is_available' => 1,
            'image' => UploadedFile::fake()->create('virus.exe', 10),
        ], $h + ['Accept' => 'application/json'])->assertStatus(422)->assertJsonValidationErrors('image');
    }

    public function test_menu_dihapus_tidak_merusak_riwayat_pesanan(): void
    {
        $h = $this->auth();
        $menu = $this->makeMenu(['name' => 'Flat White']);
        $this->postJson('/api/orders', $this->orderPayload($menu));
        $this->deleteJson("/api/admin/menus/{$menu->id}", [], $h)->assertOk();

        $item = Order::first()->items->first();
        $this->assertNull($item->menu_id);
        $this->assertSame('Flat White', $item->menu_name);
    }

    public function test_laporan_hanya_menghitung_order_lunas(): void
    {
        $h = $this->auth();
        $menu = $this->makeMenu(['price' => 30000]);

        $cashId = $this->postJson('/api/orders', $this->orderPayload($menu))->json('data.id');   // 60.000, belum lunas
        $this->postJson('/api/orders', $this->orderPayload($menu, ['payment_method' => 'debit']));  // belum lunas
        $this->getJson('/api/admin/reports', $h)->assertJsonPath('data.summary.total_revenue', 0);

        $this->patchJson("/api/admin/orders/$cashId/paid", [], $h)->assertOk()->assertJsonPath('data.status', 'paid');

        $this->getJson('/api/admin/reports', $h)
            ->assertJsonPath('data.summary.total_revenue', 60000)
            ->assertJsonPath('data.summary.total_orders', 1)
            ->assertJsonPath('data.summary.by_method.cash', 60000)
            ->assertJsonCount(1, 'data.transactions');
    }

    public function test_laporan_validasi_rentang_tanggal(): void
    {
        $h = $this->auth();
        $this->getJson('/api/admin/reports?from=2026-11-10&to=2026-11-01', $h)->assertStatus(422);
    }
}
