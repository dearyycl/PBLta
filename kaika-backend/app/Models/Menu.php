<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Menu extends Model
{
    protected $fillable = ['category_id', 'name', 'description', 'price', 'image_url', 'is_available', 'sort_order'];

    protected $casts = ['is_available' => 'boolean', 'price' => 'integer'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function options(): BelongsToMany
    {
        return $this->belongsToMany(Option::class, 'menu_option');
    }

    /** Bentuk JSON untuk frontend */
    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,
            'name' => $this->name,
            'description' => $this->description,
            'price' => $this->price,
            'image_url' => $this->image_url,
            'is_available' => $this->is_available,
            'options' => $this->relationLoaded('options')
                ? $this->options->map(fn (Option $o) => [
                    'id' => $o->id, 'type' => $o->type, 'name' => $o->name, 'price' => $o->price,
                ])->values()
                : [],
        ];
    }
}
