<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Menu;
use App\Models\Option;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAdmin();
        $options = $this->seedOptions();
        $this->seedMenu($options);
    }

    private function seedAdmin(): void
    {
        User::updateOrCreate(
            ['email' => config('kaika.admin_email')],
            [
                'name' => config('kaika.admin_name'),
                'password' => Hash::make(env('KAIKA_ADMIN_PASSWORD', 'ganti-saya-123')),
            ]
        );
    }

    /** @return array<string, \Illuminate\Support\Collection> */
    private function seedOptions(): array
    {
        $make = fn (string $type, string $name, int $price = 0) =>
            Option::firstOrCreate(['type' => $type, 'name' => $name], ['price' => $price]);

        return [
            'sugar' => collect(['Extra Sugar', 'Half Sugar', 'Less Sugar', 'Non Sugar', 'Normal Sugar', 'Slight Sugar'])
                ->map(fn ($n) => $make('sugar', $n)),
            'ice' => collect(['Extra Ice', 'Half Ice', 'Less Ice', 'Non Ice', 'Normal Ice', 'Slight Ice'])
                ->map(fn ($n) => $make('ice', $n)),
            // Kotak "EXTRA / ADDITIONAL" pada menu Kaika
            'shot' => collect([$make('topping', 'Shot Espresso', 8000)]),
            'mineral' => collect([$make('topping', 'Mineral', 7000)]),
            'oat' => collect([$make('topping', 'Oat Milk', 10000)]),
            'coconut' => collect([$make('topping', 'Coconut Milk', 10000)]),
            // Kotak "EXTRA" pada menu The Midday
            'nasi' => collect([$make('topping', 'Nasi', 8000)]),
            'egg' => collect([$make('topping', 'Egg', 5000)]),
            'sambel' => collect([$make('topping', 'Sambel', 3000)]),
            'mayo' => collect([$make('topping', 'Mayo', 3000)]),
            'icecream' => collect([$make('topping', 'Ice Cream', 5000)]),
        ];
    }

    private function seedMenu(array $o): void
    {
        $drinkToppings = collect([$o['shot'], $o['mineral'], $o['oat'], $o['coconut']])->flatten(1);
        $hot = ['Espresso', 'Hot Black', 'Piccolo', 'Flat White', 'Cappucino', 'Magic', 'Split Shot', 'Kopi Susu Panas'];

        // Harga dalam Rupiah penuh (menu tertulis "28 IDR" = Rp 28.000)
        // Format kategori: [brand, nama, tipe opsi, [ [nama, harga(ribu), deskripsi, (opsional) tersedia], ... ]]
        $catalog = [
            ['Kaika Space', 'Coffee Base', 'drink', [
                ['Espresso', 20, 'single shot espresso'],
                ['On the Rock', 25, 'single shot espresso with ice'],
                ['Iced Black', 28, 'pouring water over two espresso shots with ice'],
                ['Hot Black', 26, 'pouring hot water over two espresso shot'],
                ['Piccolo', 25, 'single shot espresso and fresh milk'],
                ['Flat White', 30, 'espresso blended with silky steamed milk'],
                ['Cappucino', 28, 'espresso and foam with bold steamed milk'],
                ['Magic', 30, 'bold ristretto with creamy milk'],
                ['Iced White', 30, 'creamy iced milk coffee'],
                ['Dirty Latte', 30, 'creamy and bold cold milk with hot espresso'],
                ['Split Shot', 35, 'espresso & picollo'],
                ['Kopi Susu Panas', 25, 'warm classic milk coffee'],
            ]],
            ['Kaika Space', 'Manual Brew', 'none', [
                ['Filter Lokal', 35, 'please ask our barista for the coffee line up'],
                ['Filter Inter', 55, 'please ask our barista for the coffee line up'],
                ['Exotic', 90, 'please ask our barista for the coffee line up'],
            ]],
            ['Kaika Space', 'Creamy Coffee', 'drink', [
                ['Kaisen', 28, 'espresso with milk and brown sugar'],
                ['Caramel', 28, 'espresso with milk, caramel and brown sugar'],
                ['Butter SeaSalt', 30, 'single shot espresso, butter seasalt and fresh milk'],
                ['Roasted Almond', 30, 'single shot espresso, roasted almond and fresh milk'],
            ]],
            ['Kaika Space', 'Signature Coffee', 'drink', [
                ['Montblanc', 38, 'a smooth balance of cold brew and thick cream.'],
                ['Orange Cacao', 38, 'bright citrus notes balanced with rich cacao and smooth coffee'],
                ['Apple Coffee', 30, 'crisp apple sweetness blended with a smooth bold coffee finish'],
                ['Natso Mango', 32, 'tropical mango flavor combined with a refreshing coffee character'],
                ['Piniplum Brew', 32, 'juicy pineapple and plum notes with a vibrant coffee twist'],
                ['Pitch Wave', 32, 'sweet peach aroma layered with a light refreshing coffee taste'],
            ]],
            ['Kaika Space', 'Tea Base', 'drink', [
                ['Lychee Tea', 28, 'tisane with sweet lychee notes'],
                ['Crimson Berry', 30, 'raspberry & rosella tisane with a refreshing finish'],
                ['Ringgoberry', 30, 'strawberry, apple & floral blue fusion'],
            ]],
            ['Kaika Space', 'Matcha Base', 'drink', [
                ['Hot Matcha Latte', 30, 'smooth earthy matcha with creamy milk'],
                ['Iced Matcha Latte', 32, 'refreshing creamy matcha over ice'],
                ['Strawberry Matcha', 35, 'iced matcha latte topped with creamy strawberry foam'],
                ['Coconut Matcha', 30, 'iced coconut drink topped with creamy matcha foam'],
                ['Yuzu Matcha', 35, 'refreshing yuzu drink topped with smooth matcha foam'],
            ]],
            ['Kaika Space', 'Non Coffee', 'drink', [
                ['Chocopinko', 32, 'rich chocolate topped with creamy strawberry foam'],
                ['Vanilla Biscuit', 28, 'vanilla fresh milk with crowned with golden biscuit crumble'],
                ['Hot Chocolate', 28, 'rich warm chocolate'],
                ['Iced Chocolate', 30, 'smooth refreshing chocolate'],
                ['Hot Taro', 28, 'warm creamy taro drink'],
                ['Iced Taro', 30, 'smooth refreshing taro'],
                ['Hot Thai Tea', 28, 'warm creamy thai tea drink'],
                ['Iced Thai Tea', 30, 'smooth refreshing thai tea'],
                ['Hot Red Velvet', 28, 'warm creamy red velvet drink'],
                ['Iced Red Velvet', 30, 'smooth refreshing red velvet'],
            ]],

            ['The Midday', 'Roll & Bite', 'mayo_sambel', [
                ['Tex-Mex Chicken Fajita Wrap', 38],
                ['Tex-Mex Beef Fajita Wrap', 43],
                ['Chicken Spring Roll', 30],
                ['Vegetable Spring Roll', 25],
                ['Monte Cristo Sandwich', 38],
                ['Toastie Chicken Supreme with Mushroom', 38],
                ['Taco Lava Birria', 36],
                ['The Midday Long Sandwich', 65],
            ]],
            ['The Midday', 'Sweet Dessert', 'icecream', [
                ['Toastie Sweetie', 25],
                ['Choco Chezzy Crispy Banana', 34],
                ['Crispy Banana (Choco/Chezzy)', 27],
                ['Peanut Caramel Crispy Banana', 27],
                ['Crispy Banana Plain', 21],
                ['Pancake with Ice Cream (Choco/Vanilla/Strawberry)', 26],
                // Tertulis di menu tanpa harga -> dibuat NON-AKTIF dengan harga 0. Isi harga lewat dashboard admin.
                ['New York Cheese Cake', 0, null, false],
                ['Matilda Choco Cake', 0, null, false],
                ['Red Velvet Cheese Cream', 0, null, false],
                ['Muffin Day Banana', 0, null, false],
                ['Soft Cookie', 0, null, false],
                ['Mocca Cake', 0, null, false],
            ]],
            ['The Midday', 'Main Course', 'rice', [
                ['Nasi Goreng Spesial Kaika', 42],
                ['Nasi Goreng Seafood Kaika', 36],
                ['Nasi Goreng Kampung Kaika', 35],
                ['Mie Goreng Spesial Kaika', 37],
                ['Chicken Grill Taliwang Lombok Style', 38],
                ['Nasi Telur Siram Spesial the Midday', 25],
            ]],
            ['The Midday', 'Soup', 'rice', [
                ['Soto Ayam Spesial the Midday', 35],
                ['Bakmie Ayam Spesial Kaika', 30],
            ]],
            ['The Midday', 'Pizza', 'mayo_sambel', [
                ['Hawaiian-style Neapolitan Pizza', 75],
                ['Napoli Fire Pepperoni Pizza', 85],
                ['La Margherita pizza', 66],
            ]],
            ['The Midday', 'Salad', 'mayo', [
                ['Classic Caesar Salad with Fresh Mayo', 48],
                ['Chicken Salad Wrap with Thousand Island Dressing', 57],
            ]],
            ['The Midday', 'Pasta', 'mayo_sambel', [
                ['Spaghetti Ragu Ala Bolognese', 38],
                ['Chicken Creamy Linguine', 38],
                ['Spaghetti Tuna Aglio e Olio', 35],
            ]],
            ['The Midday', 'Rice Bowl', 'rice', [
                ['Rice Bowl Beef Gyu', 36],
                ['Rice Bowl Beef Blackpepper', 42],
                ['Rice Bowl Chicken Blackpepper', 35],
                ['Rice Bowl Katsu Teriyaki', 36],
                ['Beef Pepper Udon Bowl', 40],
                ['Chicken Pepper Udon Bowl', 38],
            ]],
            ['The Midday', 'Snack', 'mayo_sambel', [
                ['French Fries', 25],
                ['Tempe Mendoan', 25],
                ['Loaded Bolognese Nachos', 41],
                ['Chicken Wings Korean Spicy', 45],
                ['Chicken Wings Grill Bbq', 35],
            ]],
        ];

        $extras = [
            'rice' => collect([$o['nasi'], $o['egg'], $o['sambel']])->flatten(1),
            'mayo_sambel' => collect([$o['mayo'], $o['sambel']])->flatten(1),
            'mayo' => $o['mayo'],
            'icecream' => $o['icecream'],
        ];

        foreach ($catalog as $ci => [$brand, $catName, $kind, $items]) {
            $category = Category::updateOrCreate(['name' => $catName, 'brand' => $brand], ['sort_order' => $ci]);

            foreach ($items as $mi => $row) {
                [$name, $priceK] = $row;
                $desc = $row[2] ?? null;
                $available = $row[3] ?? true;

                $menu = Menu::updateOrCreate(
                    ['category_id' => $category->id, 'name' => $name],
                    ['description' => $desc, 'price' => $priceK * 1000, 'is_available' => $available, 'sort_order' => $mi]
                );

                $ids = collect();
                if ($kind === 'drink') {
                    $ids = $ids->merge($o['sugar']->pluck('id'));
                    if (! in_array($name, $hot, true) && ! str_starts_with($name, 'Hot ')) {
                        $ids = $ids->merge($o['ice']->pluck('id'));
                    }
                    $ids = $ids->merge($drinkToppings->pluck('id'));
                } elseif (isset($extras[$kind])) {
                    $ids = $extras[$kind]->pluck('id');
                }
                $menu->options()->sync($ids->unique()->values()->all());
            }
        }
    }
}
