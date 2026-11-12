<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Menu;

class CatalogController extends Controller
{
    // GET /api/categories
    public function categories()
    {
        return response()->json([
            'data' => Category::orderBy('brand', 'desc')->orderBy('sort_order')->orderBy('id')->get(['id', 'name', 'brand']),
        ]);
    }

    // GET /api/menus  (termasuk yang habis agar tampil "Sold out")
    public function menus()
    {
        $menus = Menu::with('options')->orderBy('category_id')->orderBy('sort_order')->orderBy('id')->get();

        return response()->json(['data' => $menus->map->toApi()->values()]);
    }
}
