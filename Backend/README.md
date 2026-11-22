# EFDI Kitchen Backend

Backend TypeScript untuk API Efdi Kitchen yang mengikuti kontrak endpoint TSD v2.0 Final.

## Menyiapkan lingkungan

1. Salin `.env.example` menjadi `.env`, lalu isi konfigurasi SQL Server lokal. Jangan commit `.env`.
2. Daftarkan aplikasi pada Google reCAPTCHA dan isi `GOOGLE_RECAPTCHA_SECRET`. Registrasi Customer akan gagal tertutup bila secret belum dikonfigurasi.
3. Jalankan skrip database sesuai urutan pada [`db/README.md`](../db/README.md). Migrasi `04-api-session.sql` dan `05-tsd-schema-adjustments.sql` harus diterapkan menggunakan akun yang memiliki izin perubahan skema; keduanya belum dijalankan otomatis oleh backend.
4. Instal dependensi dengan `npm install`, lalu jalankan `npm run dev`.

## Menguji API

- Swagger UI tersedia pada `http://localhost:3000/api-docs`.
- Ambil sesi anonim dan token CSRF melalui `GET http://localhost:3000/csrf`. Respons menerbitkan cookie `efdi_session` dan token `X-CSRF-Token`.
- Sertakan cookie tersebut dan header `X-CSRF-Token` pada request API. Swagger UI dari origin backend dapat memakai cookie browser; salin token CSRF dari respons bootstrap bila diminta.
- API bisnis menggunakan prefix `/api`; endpoint baca pada kontrak bisnis menggunakan `POST`. `GET /health`, `GET /csrf`, dan foto produk di `/media/produk/{id_produk}` merupakan utilitas di luar endpoint bisnis.
- Bukti pembayaran disimpan privat dan hanya dapat dipratinjau oleh Admin/Owner melalui endpoint TSD; folder upload tidak diekspos sebagai direktori statis.

Jalankan `npm run typecheck` atau `npm run build` untuk memeriksa sumber TypeScript.
