<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    protected $fillable = ['name', 'brand', 'sort_order'];

    public function menus(): HasMany
    {
        return $this->hasMany(Menu::class);
    }
}
