<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    // POST /api/admin/login  { password }  — akun tunggal "Kasir Utama / Admin Kaika Space"
    public function login(Request $request)
    {
        $request->validate(['password' => ['required', 'string']]);

        $user = User::where('email', config('kaika.admin_email'))->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages(['password' => 'Kata sandi salah.']);
        }

        $user->tokens()->delete(); // satu sesi aktif
        $token = $user->createToken('kasir-utama')->plainTextToken;

        return response()->json(['data' => ['token' => $token, 'name' => config('kaika.admin_name')]]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['ok' => true]);
    }
}
