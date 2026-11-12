<?php

namespace Tests;

use App\Models\Category;
use App\Models\Menu;
use App\Models\Option;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

trait TestHelpers
{
    protected function makeMenu(array $over = []): Menu
    {
        $cat = Category::firstOrCreate(['name' => 'Coffee Base', 'brand' => 'Kaika Space']);

        return Menu::create(array_merge([
            'category_id' => $cat->id, 'name' => 'Flat White', 'description' => 'silky',
            'price' => 30000, 'is_available' => true,
        ], $over));
    }

    protected function makeOption(string $type, string $name, int $price = 0): Option
    {
        return Option::create(compact('type', 'name', 'price'));
    }

    protected function makeAdmin(string $password = 'rahasia123'): User
    {
        return User::create([
            'name' => config('kaika.admin_name'),
            'email' => config('kaika.admin_email'),
            'password' => Hash::make($password),
        ]);
    }

    protected function orderPayload(Menu $menu, array $over = []): array
    {
        return array_merge([
            'customer_name' => 'Ani', 'table_number' => '7', 'payment_method' => 'cash',
            'items' => [['menu_id' => $menu->id, 'quantity' => 2, 'selected_options' => []]],
        ], $over);
    }
}
