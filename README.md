# project-efdi-kitchen
Optimalisasi Pengelolaan Pesanan dan Kebutuhan Produksi pada Bisnis Catering Berbasis Web

## Menjalankan aplikasi terintegrasi

Frontend menggunakan API backend sebagai sumber data; data produk, pesanan,
pembayaran, stok, pengguna, dan pengaturan operasional disimpan di SQL Server.

1. Jalankan skrip SQL pada folder `db` secara berurutan (`00` sampai `03`) di SQL
   Server. Skrip `03-seed.sql` menyiapkan data awal untuk akun operasional,
   produk, stok, dan jadwal.
2. Salin `Backend/.env.example` menjadi `Backend/.env`, lalu isi koneksi SQL
   Server dan `GOOGLE_RECAPTCHA_SECRET`. Jangan commit file `.env`.
3. Salin `Frontend/.env.example` menjadi `Frontend/.env`, lalu isi
   `VITE_RECAPTCHA_SITE_KEY` dengan site key reCAPTCHA v2 Checkbox yang sesuai
   dengan secret backend. Daftarkan `localhost` sebagai domain untuk pengembangan
   lokal.
4. Jalankan backend dari folder `Backend` dengan `npm run dev`.
5. Jalankan frontend dari folder `Frontend` dengan `npm run dev`. Vite meneruskan
   `/api`, `/csrf`, `/health`, dan `/media` ke `VITE_BACKEND_URL` (default
   `http://127.0.0.1:3000`). Sesuaikan URL ini jika backend memakai port berbeda.

Status koneksi backend dan database dapat diperiksa melalui `http://localhost:3000/health`.
Registrasi membutuhkan konfigurasi reCAPTCHA; akun pengelola harus disiapkan
sesuai kredensial deployment pada database.
