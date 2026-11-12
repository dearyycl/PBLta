# Tutorial Laravel Lengkap — Backend "Kaika Space x The Midday"

Panduan dari nol sampai API berjalan, terhubung ke frontend React, dan lolos tes **white box** & **black box**.
Semua kode backend sudah ada di folder `backend/` — Anda tinggal menyalinnya ke proyek Laravel baru.

> Catatan jujur: kode di folder ini ditulis tanpa bisa dijalankan di lingkungan saya (tidak ada akses jaringan untuk
> `composer`/`npm`). Jalankan tes pada langkah 12 dan 13; jika ada error versi, kirimkan pesan error-nya ke saya.

---

## 0. Yang Perlu Dipasang

| Alat | Versi | Cek |
|---|---|---|
| PHP | 8.2+ (ekstensi: mbstring, xml, curl, mysql, sqlite, gd/fileinfo) | `php -v` |
| Composer | 2.x | `composer -V` |
| MySQL / MariaDB | 8+ (bisa lewat XAMPP/Laragon) | `mysql --version` |
| Node.js | 18+ | `node -v` |

Windows: paling mudah pakai **Laragon** (sudah termasuk PHP, MySQL, Composer).

---

## 1. Buat Proyek Laravel

```bash
composer create-project laravel/laravel kaika-backend
cd kaika-backend
php artisan install:api        # memasang Laravel Sanctum + routes/api.php
```

Jawab `yes` jika ditanya menjalankan migrasi (nanti diulang, tidak masalah).

## 2. Database MySQL

Buat database:

```sql
CREATE DATABASE kaika CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Edit `.env`:

```env
APP_NAME="Kaika Space"
APP_URL=http://127.0.0.1:8000
APP_TIMEZONE=Asia/Makassar

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kaika
DB_USERNAME=root
DB_PASSWORD=

KAIKA_ADMIN_EMAIL=admin@kaika.space
KAIKA_ADMIN_PASSWORD=ISI_KATA_SANDI_KUAT
KAIKA_QRIS_TTL=5
KAIKA_ENABLE_SIMULATION=true   # HANYA lokal. Wajib false di produksi.
KAIKA_WEBHOOK_SECRET=
```

Di `config/app.php`, pastikan: `'timezone' => env('APP_TIMEZONE', 'UTC'),`

## 3. Salin File Backend

Dari folder `backend/` paket ini, salin ke proyek Laravel (timpa jika ditanya):

| Dari `backend/` | Ke proyek Laravel |
|---|---|
| `config/kaika.php` | `config/kaika.php` |
| `app/Models/*.php` | `app/Models/` |
| `app/Services/OrderService.php` | `app/Services/OrderService.php` |
| `app/Http/Controllers/*.php` dan `Admin/*.php` | `app/Http/Controllers/` |
| `routes/api.php` | `routes/api.php` |
| `database/migrations/2026_11_01_000001_create_kaika_tables.php` | `database/migrations/` |
| `database/seeders/DatabaseSeeder.php` | `database/seeders/` (timpa) |
| `tests/TestHelpers.php`, `tests/Unit/*`, `tests/Feature/*` | `tests/` |

## 4. Siapkan Model `User` (untuk Sanctum)

Buka `app/Models/User.php`, pastikan memakai `HasApiTokens`:

```php
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;
    // ...
}
```

## 5. CORS & Sanctum (token Bearer)

Frontend memakai **Bearer token**, bukan cookie, jadi cukup CORS terbuka untuk `/api/*`.
Buat/ubah `config/cors.php`:

```php
return [
    'paths' => ['api/*', 'storage/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [env('FRONTEND_URL', 'http://localhost:5173')],
    'allowed_headers' => ['*'],
    'supports_credentials' => false,
];
```

Tambahkan di `.env`: `FRONTEND_URL=http://localhost:5173`
(Jika memakai proxy Vite bawaan paket ini, CORS tidak terpakai saat development, tapi dibutuhkan saat produksi.)

## 6. Migrasi & Seeder

```bash
php artisan migrate
php artisan db:seed
php artisan storage:link      # agar gambar upload bisa diakses di /storage/...
```

Seeder membuat:
- Akun tunggal **"Kasir Utama / Admin Kaika Space"** (email dari `.env`, kata sandi dari `KAIKA_ADMIN_PASSWORD`).
- Opsi: 6 Sugar, 6 Ice, dan topping sesuai kotak EXTRA/ADDITIONAL pada menu Anda
  (Shot Espresso Rp8.000, Mineral Rp7.000, Oat Milk Rp10.000, Coconut Milk Rp10.000, Nasi Rp8.000, Egg Rp5.000, Sambel Rp3.000, Mayo Rp3.000, Ice Cream Rp5.000).
- **Seluruh menu dari gambar yang Anda lampirkan** (7 kategori Kaika Space + 9 kategori The Midday), harga "28 IDR" disimpan sebagai Rp 28.000.

Hal yang perlu Anda ketahui tentang data awal:
1. **6 item dessert** (New York Cheese Cake, Matilda Choco Cake, Red Velvet Cheese Cream, Muffin Day Banana, Soft Cookie, Mocca Cake) tertulis di menu tanpa harga. Saya buat dengan harga 0 dan status **Sold Out**. Isi harga lalu aktifkan lewat dashboard admin.
2. Menu **minuman panas** (nama berawalan "Hot", Espresso, Piccolo, Flat White, Cappucino, Magic, Split Shot, Kopi Susu Panas) hanya mendapat opsi Sugar, tanpa Ice. **Manual Brew** tidak punya opsi sugar/ice.
3. Pemetaan topping makanan adalah asumsi saya (Main Course/Soup/Rice Bowl: Nasi, Egg, Sambel; Roll & Bite/Pizza/Pasta/Snack: Mayo, Sambel; Salad: Mayo; Dessert: Ice Cream). Ubah di bagian `$extras` pada seeder jika berbeda.
4. **Gambar menu masih kosong** (`image_url = NULL`) dan frontend menampilkan ikon pengganti. Unggah gambar lewat Dashboard → Kelola Menu → Edit. Gambar disimpan di `storage/app/public/menus` dan path-nya disimpan di kolom `image_url`.

Ulangi seeding kapan saja dengan aman: `php artisan db:seed` memakai `updateOrCreate`, jadi tidak menggandakan data.
Catatan: seeding ulang akan mengembalikan harga/deskripsi menu ke nilai awal; jangan jalankan lagi setelah Anda mengubah harga lewat dashboard.

## 7. Jalankan Server

```bash
php artisan serve        # http://127.0.0.1:8000
```

Uji cepat:

```bash
curl http://127.0.0.1:8000/api/categories
curl http://127.0.0.1:8000/api/menus
```

## 8. Penjelasan Arsitektur (agar mudah Anda kembangkan)

### Skema database
- `categories` (name, brand: Kaika Space / The Midday)
- `menus` (category_id, name, description, price, image_url, is_available)
- `options` (type: sugar/ice/topping, name, price) + pivot `menu_option` → opsi mana yang tersedia di tiap menu
- `orders` (customer_name, table_number, total_amount, payment_method, `status` pembayaran: pending/paid/failed, `kitchen_status`: pending/cooking/completed)
- `order_items` (menu_id, **menu_name & unit_price sebagai snapshot**, quantity, notes, selected_options JSON)
- `payment_sessions` (sesi QRIS: amount, status waiting/paid/expired/failed, expires_at, payload pesanan)

### Aturan pembayaran (sesuai spesifikasi Anda)
- **Cash/Debit**: `POST /api/orders` → order langsung masuk antrean kasir (status bayar `pending`). Kasir menekan **Tandai Lunas** setelah menerima uang.
- **QRIS**: `POST /api/payments/qris` hanya membuat **sesi**, **bukan order**. Order baru dibuat saat sesi dibayar (webhook / simulasi).
  - Timer habis atau pembayaran gagal → sesi ditandai `expired`/`failed` dan **tidak pernah** menjadi order, jadi tidak pernah masuk dashboard kasir.
  - Tidak ada endpoint untuk menghidupkan kembali sesi, dan pembayaran terlambat dijawab `410 Gone`. Frontend hanya menampilkan satu tombol "Kembali ke Menu Utama / Pesan Ulang" yang menghapus seluruh keranjang.
- **Harga dihitung di server** (`OrderService::buildLines`); harga kiriman client diabaikan.

### Endpoint
| Method | URL | Fungsi |
|---|---|---|
| GET | `/api/categories`, `/api/menus` | Katalog (termasuk opsi per menu) |
| POST | `/api/orders` | Pesanan Cash/Debit |
| POST | `/api/payments/qris` | Buat sesi QRIS |
| GET | `/api/payments/{id}` | Status sesi (dipolling frontend tiap 3 detik) |
| POST | `/api/payments/{id}/simulate-paid` | Simulasi bayar (hanya local/testing) |
| POST | `/api/payments/webhook` | Callback payment gateway (tanda tangan HMAC) |
| POST | `/api/admin/login` | Login akun tunggal, hasilkan token |
| GET/PATCH | `/api/admin/orders`, `/{id}/status`, `/{id}/paid` | Antrean & status |
| GET/POST/PUT/PATCH/DELETE | `/api/admin/menus…` | CRUD menu + upload gambar |
| GET | `/api/admin/reports?from&to` | Ringkasan & transaksi (hanya order lunas) |

## 9. Menjalankan Frontend React

```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173  (proxy /api -> http://127.0.0.1:8000)
```

- Halaman pelanggan: `http://localhost:5173/`
- Dashboard kasir/admin: `http://localhost:5173/admin` (kata sandi = `KAIKA_ADMIN_PASSWORD`)
- Uji QRIS lokal: di `frontend/.env` isi `VITE_ENABLE_SIM=true`, lalu tombol "Simulasikan Pembayaran" muncul di halaman QR.
- **Foto latar launch page**: simpan foto interior kafe sebagai `frontend/public/hero.jpg`. Tanpa file itu, latar tampil sebagai gradien burgundy.

## 10. QRIS Sungguhan (Produksi)

Kode saat ini membuat `qr_payload` placeholder (`KAIKA-QRIS|id|amount`) agar alurnya bisa diuji. Untuk QRIS asli:

1. Daftar ke payment gateway yang mendukung QRIS (mis. Midtrans, Xendit, Duitku) dan dapatkan API key.
2. Di `PaymentController::createQris`, setelah sesi dibuat, panggil API gateway untuk membuat transaksi QRIS dengan `order_id = session id`, `amount`, dan masa berlaku sama dengan `expires_at`. Simpan string QR dari respons ke `qr_payload`.
3. Atur URL notifikasi gateway ke `https://domain-anda.com/api/payments/webhook`. Sesuaikan verifikasi tanda tangan di `webhook()` dengan format gateway yang dipilih (setiap gateway berbeda), lalu isi `KAIKA_WEBHOOK_SECRET`.
4. Set `KAIKA_ENABLE_SIMULATION=false` dan `APP_ENV=production`.

Jangan menandai pembayaran lunas dari frontend; hanya webhook gateway yang boleh melakukannya.

## 11. Contoh Isi Opsional: Jadwal Pembersihan Sesi

Sesi kedaluwarsa dievaluasi saat dibaca, jadi tidak wajib. Untuk merapikan tabel, tambahkan di `routes/console.php`:

```php
use Illuminate\Support\Facades\Schedule;
use App\Models\PaymentSession;

Schedule::call(fn () => PaymentSession::where('status', 'waiting')
    ->where('expires_at', '<', now())->update(['status' => 'expired']))->everyMinute();
```

dan jalankan scheduler: `php artisan schedule:work`.

## 12. Tes Backend (White Box & Black Box)

Siapkan database tes. Di `phpunit.xml`, aktifkan SQLite memori:

```xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

Jalankan:

```bash
php artisan test
# atau per kelompok:
php artisan test --testsuite=Unit       # WHITE BOX
php artisan test --testsuite=Feature    # BLACK BOX
```

**White box** (`tests/Unit/OrderServiceTest.php`) menguji tiap cabang logika internal `OrderService`:
perhitungan harga topping, keranjang kosong, menu tidak ada, menu sold out, batas qty (0 dan 51),
opsi milik menu lain, sugar lebih dari satu, batas qty topping, pemangkasan catatan 200 karakter,
sesi kedaluwarsa tidak membuat order, dan idempotensi pembayaran ganda.

**Black box** (`tests/Feature/*`) hanya menguji kontrak HTTP:
katalog & sold out, order cash, validasi wajib isi, manipulasi harga client diabaikan, alur QRIS
(sesi ≠ order, bayar → order lunas, kedaluwarsa → tidak ada order, bayar terlambat → 410, webhook tanpa
tanda tangan ditolak), login admin, endpoint admin wajib login, CRUD menu + upload gambar, penolakan file
bukan gambar, riwayat pesanan tetap utuh saat menu dihapus, dan laporan hanya menghitung order lunas.

## 13. Tes Frontend

```bash
cd frontend
npm test
```

- `format.test.js`, `cartReducer.test.js` → white box (logika fungsi & reducer, termasuk penggabungan item identik)
- `components.test.jsx`, `payment.test.jsx` → black box dari sisi pengguna: kartu tersedia vs Sold out, radio Sugar/Ice maksimal 1,
  total harga dinamis "Add Orders - Rp …", countdown, layar **"Waktu Pembayaran Habis"** dengan **tepat satu tombol** dan tanpa opsi coba lagi.

### Daftar uji manual responsif
Buka DevTools → mode perangkat, cek lebar **360, 390, 768, 1024, 1440 px**:
- [ ] Launch page: logo kiri-atas, teks tidak terpotong, tombol CTA terlihat tanpa scroll di 360×640
- [ ] Menu: 1 kolom (HP), 2 kolom (≥640px), 3 kolom (≥1000px); tab kategori bisa digeser; panah ▼ membuka semua kategori
- [ ] Scroll menu: tab aktif berpindah otomatis; klik tab menggulir halus ke kategori
- [ ] Bottom sheet: tombol "Add Orders" selalu terlihat; konten bisa digulir; Esc menutup
- [ ] Keranjang/pembayaran: tombol bayar menempel di bawah; kolom input tidak tertutup keyboard
- [ ] Admin: kanban 1 kolom (HP) → 3 kolom (≥900px); tabel berubah jadi kartu di <720px

## 14. Deploy Singkat (Produksi)

1. Backend di VPS/hosting PHP: `composer install --no-dev -o`, `php artisan migrate --force`, `php artisan storage:link`, `php artisan config:cache route:cache`.
2. Arahkan web root ke `public/`; aktifkan HTTPS (wajib untuk QRIS & webhook).
3. Frontend: isi `VITE_API_URL=https://api.domain-anda.com`, lalu `npm run build` dan unggah folder `dist/` (SPA: arahkan semua rute ke `index.html`).
4. Pastikan `FRONTEND_URL` di backend sama dengan domain frontend.

## 15. Pemecahan Masalah

| Gejala | Penyebab & solusi |
|---|---|
| Menu tidak muncul / "Menu belum bisa dimuat" | Backend belum jalan atau proxy salah. Cek `php artisan serve` dan buka `/api/menus` di browser. |
| 401 saat membuka dashboard | Token kedaluwarsa; login ulang. |
| Gambar upload tidak tampil | Belum `php artisan storage:link`; atau saat produksi backend & frontend beda domain → set `VITE_API_URL`. |
| `Class "Laravel\Sanctum\HasApiTokens" not found` | Jalankan `php artisan install:api`. |
| Tes: `no such table` | Pastikan `RefreshDatabase` dipakai dan `phpunit.xml` memakai SQLite memori. |
| Tombol simulasi tidak muncul | `VITE_ENABLE_SIM=true` di `frontend/.env`, lalu restart `npm run dev`. |
