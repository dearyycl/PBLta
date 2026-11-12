<?php

namespace Tests\Unit;

use App\Services\OrderService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use Tests\TestHelpers;

/**
 * WHITE BOX: menguji setiap cabang keputusan di OrderService::buildLines
 */
class OrderServiceTest extends TestCase
{
    use RefreshDatabase, TestHelpers;

    private function svc(): OrderService
    {
        return new OrderService();
    }

    public function test_menghitung_total_dengan_topping_di_server(): void
    {
        $menu = $this->makeMenu(['price' => 30000]);
        $oat = $this->makeOption('topping', 'Oat Milk', 10000);
        $shot = $this->makeOption('topping', 'Shot Espresso', 8000);
        $menu->options()->attach([$oat->id, $shot->id]);

        $r = $this->svc()->buildLines([[
            'menu_id' => $menu->id, 'quantity' => 2,
            'selected_options' => [['id' => $oat->id, 'qty' => 1], ['id' => $shot->id, 'qty' => 2]],
        ]]);

        // (30.000 + 10.000 + 2x8.000) x 2 = 112.000
        $this->assertSame(112000, $r['total']);
        $this->assertSame(56000, $r['lines'][0]['unit_price']);
    }

    public function test_keranjang_kosong_ditolak(): void
    {
        $this->expectException(ValidationException::class);
        $this->svc()->buildLines([]);
    }

    public function test_menu_tidak_ada_ditolak(): void
    {
        $this->expectException(ValidationException::class);
        $this->svc()->buildLines([['menu_id' => 999, 'quantity' => 1]]);
    }

    public function test_menu_sold_out_ditolak(): void
    {
        $menu = $this->makeMenu(['is_available' => false]);
        $this->expectException(ValidationException::class);
        $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1]]);
    }

    public function test_quantity_di_luar_batas_ditolak(): void
    {
        $menu = $this->makeMenu();
        foreach ([0, 51] as $bad) {
            try {
                $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => $bad]]);
                $this->fail("qty $bad seharusnya ditolak");
            } catch (ValidationException $e) {
                $this->assertArrayHasKey('items.0.quantity', $e->errors());
            }
        }
    }

    public function test_opsi_milik_menu_lain_ditolak(): void
    {
        $menu = $this->makeMenu();
        $foreign = $this->makeOption('topping', 'Nasi', 8000); // tidak di-attach
        $this->expectException(ValidationException::class);
        $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1, 'selected_options' => [['id' => $foreign->id, 'qty' => 1]]]]);
    }

    public function test_sugar_lebih_dari_satu_ditolak(): void
    {
        $menu = $this->makeMenu();
        $a = $this->makeOption('sugar', 'Normal Sugar');
        $b = $this->makeOption('sugar', 'Less Sugar');
        $menu->options()->attach([$a->id, $b->id]);

        $this->expectException(ValidationException::class);
        $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1, 'selected_options' => [['id' => $a->id], ['id' => $b->id]]]]);
    }

    public function test_qty_topping_di_luar_batas_ditolak(): void
    {
        $menu = $this->makeMenu();
        $t = $this->makeOption('topping', 'Mayo', 3000);
        $menu->options()->attach($t->id);
        $this->expectException(ValidationException::class);
        $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1, 'selected_options' => [['id' => $t->id, 'qty' => 11]]]]);
    }

    public function test_catatan_dipangkas_200_karakter(): void
    {
        $menu = $this->makeMenu();
        $r = $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1, 'notes' => str_repeat('a', 300)]]);
        $this->assertSame(200, mb_strlen($r['lines'][0]['notes']));
    }

    public function test_sesi_kedaluwarsa_tidak_membuat_order(): void
    {
        $menu = $this->makeMenu();
        $built = $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1]]);
        $session = \App\Models\PaymentSession::create([
            'amount' => $built['total'], 'status' => 'waiting', 'expires_at' => now()->subSecond(),
            'payload' => ['customer' => ['customer_name' => 'A', 'table_number' => '1'], 'lines' => $built['lines']],
        ]);

        $this->assertNull($this->svc()->markSessionPaid($session));
        $this->assertSame('expired', $session->fresh()->status);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_markSessionPaid_idempoten(): void
    {
        $menu = $this->makeMenu();
        $built = $this->svc()->buildLines([['menu_id' => $menu->id, 'quantity' => 1]]);
        $session = \App\Models\PaymentSession::create([
            'amount' => $built['total'], 'status' => 'waiting', 'expires_at' => now()->addMinutes(5),
            'payload' => ['customer' => ['customer_name' => 'A', 'table_number' => '1'], 'lines' => $built['lines']],
        ]);

        $this->svc()->markSessionPaid($session);
        $this->svc()->markSessionPaid($session); // webhook dobel
        $this->assertDatabaseCount('orders', 1);
    }
}
