<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MenuAdminController extends Controller
{
    private function rules(bool $creating): array
    {
        return [
            'category_id' => ['required', 'exists:categories,id'],
            'name' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'price' => ['required', 'integer', 'min:0', 'max:10000000'],
            'is_available' => ['required', 'boolean'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:3072'],
        ];
    }

    public function index()
    {
        return response()->json([
            'data' => Menu::with('options')->orderBy('category_id')->orderBy('id')->get()->map->toApi()->values(),
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate($this->rules(true));
        $data['image_url'] = $this->storeImage($request);
        unset($data['image']);

        $menu = Menu::create($data);

        return response()->json(['data' => $menu->load('options')->toApi()], 201);
    }

    public function update(Request $request, Menu $menu)
    {
        $data = $request->validate($this->rules(false));

        if ($request->hasFile('image')) {
            $this->deleteImage($menu->image_url);
            $data['image_url'] = $this->storeImage($request);
        }
        unset($data['image']);

        $menu->update($data);

        return response()->json(['data' => $menu->load('options')->toApi()]);
    }

    public function toggle(Menu $menu)
    {
        $menu->update(['is_available' => ! $menu->is_available]);

        return response()->json(['data' => $menu->load('options')->toApi()]);
    }

    public function destroy(Menu $menu)
    {
        $this->deleteImage($menu->image_url);
        $menu->delete(); // order_items.menu_id -> NULL, snapshot nama/harga tetap ada

        return response()->json(['ok' => true]);
    }

    private function storeImage(Request $request): ?string
    {
        if (! $request->hasFile('image')) {
            return null;
        }
        $path = $request->file('image')->store('menus', 'public');

        return Storage::url($path); // "/storage/menus/xxx.jpg" disimpan di kolom image_url
    }

    private function deleteImage(?string $url): void
    {
        if ($url && str_starts_with($url, '/storage/')) {
            Storage::disk('public')->delete(substr($url, strlen('/storage/')));
        }
    }
}
