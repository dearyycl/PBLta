<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->enum('brand', ['Kaika Space', 'The Midday']);
            $t->unsignedSmallInteger('sort_order')->default(0);
            $t->timestamps();
        });

        Schema::create('menus', function (Blueprint $t) {
            $t->id();
            $t->foreignId('category_id')->constrained()->cascadeOnDelete();
            $t->string('name');
            $t->text('description')->nullable();
            $t->unsignedInteger('price');            // Rupiah penuh, mis. 25000
            $t->string('image_url')->nullable();     // path/URL gambar
            $t->boolean('is_available')->default(true);
            $t->unsignedSmallInteger('sort_order')->default(0);
            $t->timestamps();
        });

        // Opsi: sugar, ice, topping (harga tambahan)
        Schema::create('options', function (Blueprint $t) {
            $t->id();
            $t->enum('type', ['sugar', 'ice', 'topping']);
            $t->string('name');
            $t->unsignedInteger('price')->default(0);
            $t->timestamps();
        });

        Schema::create('menu_option', function (Blueprint $t) {
            $t->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $t->foreignId('option_id')->constrained()->cascadeOnDelete();
            $t->primary(['menu_id', 'option_id']);
        });

        Schema::create('orders', function (Blueprint $t) {
            $t->id();
            $t->string('customer_name');
            $t->string('table_number', 10);
            $t->unsignedInteger('total_amount');
            $t->enum('payment_method', ['qris', 'cash', 'debit']);
            $t->enum('status', ['pending', 'paid', 'failed'])->default('pending');           // status pembayaran
            $t->enum('kitchen_status', ['pending', 'cooking', 'completed'])->default('pending'); // status dapur
            $t->timestamp('paid_at')->nullable();
            $t->timestamps();
            $t->index(['status', 'created_at']);
        });

        Schema::create('order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('order_id')->constrained()->cascadeOnDelete();
            $t->foreignId('menu_id')->nullable()->constrained()->nullOnDelete();
            $t->string('menu_name');                  // snapshot, aman bila menu dihapus
            $t->unsignedInteger('unit_price');        // snapshot harga satuan + topping
            $t->unsignedSmallInteger('quantity');
            $t->string('notes', 200)->nullable();
            $t->json('selected_options')->nullable();
            $t->timestamps();
        });

        // Sesi pembayaran QRIS. Order BARU dibuat setelah dibayar.
        Schema::create('payment_sessions', function (Blueprint $t) {
            $t->id();
            $t->unsignedInteger('amount');
            $t->enum('status', ['waiting', 'paid', 'expired', 'failed'])->default('waiting');
            $t->string('qr_payload')->nullable();
            $t->json('payload');                      // data pesanan yang divalidasi
            $t->timestamp('expires_at');
            $t->timestamp('paid_at')->nullable();
            $t->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['payment_sessions', 'order_items', 'orders', 'menu_option', 'options', 'menus', 'categories'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
