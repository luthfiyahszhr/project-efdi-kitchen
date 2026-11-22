# Database EfdiKitchenDB (SQL Server)

Skrip ini berisi inisialisasi skema dan data *seed* + migrasi data historis untuk sistem manajemen pemesanan dan produksi **EFDI Kitchen**.

## Cara Menjalankan di SSMS
1. Buka **SQL Server Management Studio (SSMS)** dan buat database kosong bernama `EfdiKitchenDB` (jika belum ada).
2. Buka file `.sql` di folder ini melalui SSMS, pastikan target database aktif mengarah ke `EfdiKitchenDB`.
3. Klik **Execute** (`F5`) dan pastikan seluruh baris tereksekusi tanpa *error*.

## Ringkasan Data Seed
* **Total Tabel (12):** `Pengguna`, `PengaturanPemesanan`, `JadwalOperasional`, `Pesanan`, `Pembayaran`, `RiwayatStatusPesanan`, `ItemInventaris`, `LogAktivitas`, `Produk`, `KomposisiPaket`, `DetailPesanan`, dan `NotaDigital`.
* **Data Transaksi (86 Pesanan):**
  * `EFD-TEST01` (`id_pesanan = 1`): Data uji coba skenario pesanan dibatalkan (`DIBATALKAN`).
  * `EFD-260001` s.d. `EFD-260085` (`id_pesanan = 2..86`): 85 transaksi migrasi historis berstatus `SELESAI` dan `LUNAS` (total omzet historis Rp 77.148.040,00).
* **Katalog & Inventaris:** 71 item produk (ID `1–3` sudah terhubung ke `KomposisiPaket` untuk pengujian pemotongan stok otomatis pada `ItemInventaris`, sedangkan ID `4–71` merupakan katalog hasil migrasi).

## Catatan untuk Tim Backend
* **Password Placeholder:** Nilai kolom `password_hash` pada tabel `Pengguna` (`owner@efdikitchen.local`, `admin1@efdikitchen.local`, `budi.santoso@gmail.com`, dan `siti.aminah@gmail.com`) masih berupa string *placeholder*. Silakan timpa dengan hash `bcrypt` asli setelah modul autentikasi/register selesai dibuat.
* **Identity Insert:** Blok `SET IDENTITY_INSERT ... ON/OFF` sudah diatur di dalam skrip agar ID relasi antar tabel tetap konsisten saat dijalankan ulang pada database bersih.

## Cara Menjalankan di SSMS
Jalankan file `.sql` di folder ini secara berurutan melalui **SQL Server Management Studio (SSMS)** dengan menekan **Execute** (`F5`) pada masing-masing file:
1. `00-setup-mixed-mode.sql` — Mengaktifkan autentikasi *Mixed Mode* (SQL Server & Windows Authentication) jika belum aktif.
2. `01-create-database-and-user.sql` — Membuat database `EfdiKitchenDB` beserta *login/user* aplikasi.
3. `02-schema.sql` — Membuat seluruh struktur 12 tabel, *primary key*, *foreign key*, dan *constraint* pada `EfdiKitchenDB`.
4. `03-seed.sql` — Mengisi data awal (*seed*) serta migrasi 85 transaksi historis ke dalam tabel.
5. `04-api-session.sql` — Membuat penyimpanan sesi SQL-backed yang dipakai autentikasi API.
6. `05-tsd-schema-adjustments.sql` — Mengizinkan `batas_minimum` inventaris bernilai `NULL`, sesuai kontrak TSD.

Jalankan migrasi 04 dan 05 dengan akun database yang memiliki izin perubahan skema (bukan akun runtime aplikasi). Kedua migrasi harus selesai sebelum menjalankan versi backend yang memakai sesi SQL dan batas stok nullable.

Backend juga memerlukan `GOOGLE_RECAPTCHA_SECRET` di file `.env` untuk mengaktifkan registrasi. Gunakan secret Google reCAPTCHA milik aplikasi; jangan commit file `.env`.