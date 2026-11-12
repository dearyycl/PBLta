<?php

use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\MenuAdminController;
use App\Http\Controllers\Admin\OrderAdminController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

// ---------- Publik (pelanggan) ----------
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/menus', [CatalogController::class, 'menus']);

Route::middleware('throttle:30,1')->group(function () {
    Route::post('/orders', [OrderController::class, 'store']);
    Route::post('/payments/qris', [PaymentController::class, 'createQris']);
});
Route::get('/payments/{session}', [PaymentController::class, 'show'])->middleware('throttle:120,1');
Route::post('/payments/{session}/simulate-paid', [PaymentController::class, 'simulatePaid']);
Route::post('/payments/webhook', [PaymentController::class, 'webhook']);

// ---------- Admin (akun tunggal) ----------
Route::post('/admin/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::prefix('admin')->middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/orders', [OrderAdminController::class, 'index']);
    Route::patch('/orders/{order}/status', [OrderAdminController::class, 'updateStatus']);
    Route::patch('/orders/{order}/paid', [OrderAdminController::class, 'markPaid']);

    Route::get('/menus', [MenuAdminController::class, 'index']);
    Route::post('/menus', [MenuAdminController::class, 'store']);
    Route::put('/menus/{menu}', [MenuAdminController::class, 'update']);
    Route::patch('/menus/{menu}/toggle', [MenuAdminController::class, 'toggle']);
    Route::delete('/menus/{menu}', [MenuAdminController::class, 'destroy']);

    Route::get('/reports', [ReportController::class, 'index']);
});
