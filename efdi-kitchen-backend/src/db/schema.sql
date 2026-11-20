-- =====================================================
-- Efdi Kitchen — MSSQL Schema (selaras FSD Final v3.0)
-- =====================================================
IF DB_ID('efdi_kitchen') IS NULL
  CREATE DATABASE efdi_kitchen;
GO
USE efdi_kitchen;
GO

-- ---------- users ----------
IF OBJECT_ID('users', 'U') IS NULL
CREATE TABLE users (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    nama NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER'
        CHECK (role IN ('CUSTOMER','ADMIN','OWNER')),
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ---------- produk ----------
IF OBJECT_ID('produk', 'U') IS NULL
CREATE TABLE produk (
    id_produk BIGINT IDENTITY(1,1) PRIMARY KEY,
    nama_paket NVARCHAR(150) NOT NULL,
    deskripsi NVARCHAR(MAX) NULL,
    isi_paket NVARCHAR(MAX) NULL,
    harga_per_porsi DECIMAL(12,2) NOT NULL CHECK (harga_per_porsi > 0),
    foto_url NVARCHAR(255) NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ---------- jadwal_operasional ----------
IF OBJECT_ID('jadwal_operasional', 'U') IS NULL
CREATE TABLE jadwal_operasional (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    hari VARCHAR(10) NOT NULL
        CHECK (hari IN ('SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU','MINGGU')),
    jam_buka TIME NOT NULL,
    jam_tutup TIME NOT NULL,
    is_active BIT NOT NULL DEFAULT 1
);
GO

-- ---------- pengaturan_pemesanan ----------
IF OBJECT_ID('pengaturan_pemesanan', 'U') IS NULL
CREATE TABLE pengaturan_pemesanan (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    mode_pemesanan VARCHAR(20) NOT NULL DEFAULT 'OTOMATIS'
        CHECK (mode_pemesanan IN ('OTOMATIS','DIBUKA_MANUAL','DITUTUP_MANUAL')),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ---------- pesanan ----------
IF OBJECT_ID('pesanan', 'U') IS NULL
CREATE TABLE pesanan (
    id_pesanan BIGINT IDENTITY(1,1) PRIMARY KEY,
    kode_pesanan VARCHAR(30) NOT NULL UNIQUE,
    nama_pelanggan NVARCHAR(100) NOT NULL,
    no_kontak VARCHAR(15) NOT NULL,
    tanggal_acara DATE NOT NULL,
    waktu_acara TIME NOT NULL,
    catatan NVARCHAR(500) NULL,
    kanal VARCHAR(20) NOT NULL CHECK (kanal IN ('ONLINE','DATANG_LANGSUNG')),
    id_pelanggan BIGINT NULL REFERENCES users(id),
    dibuat_oleh_admin BIGINT NULL REFERENCES users(id),
    status_pesanan VARCHAR(20) NOT NULL
        CHECK (status_pesanan IN ('MENUNGGU_DP','DIPROSES','SIAP','SELESAI','DIBATALKAN')),
    status_pembayaran VARCHAR(20) NOT NULL
        CHECK (status_pembayaran IN ('BELUM_BAYAR','MENUNGGU_VERIFIKASI','DP_DITERIMA','LUNAS')),
    total_tagihan DECIMAL(12,2) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT ck_kanal_pelaku CHECK (
        (kanal = 'ONLINE' AND id_pelanggan IS NOT NULL) OR
        (kanal = 'DATANG_LANGSUNG' AND dibuat_oleh_admin IS NOT NULL)
    )
);
CREATE INDEX idx_pesanan_status ON pesanan(status_pesanan);
CREATE INDEX idx_pesanan_created ON pesanan(created_at);
GO

-- ---------- detail_pesanan ----------
IF OBJECT_ID('detail_pesanan', 'U') IS NULL
CREATE TABLE detail_pesanan (
    id_detail BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_pesanan BIGINT NOT NULL REFERENCES pesanan(id_pesanan) ON DELETE CASCADE,
    id_produk BIGINT NOT NULL REFERENCES produk(id_produk),
    jumlah_porsi INT NOT NULL CHECK (jumlah_porsi >= 1),
    harga_satuan DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);
GO

-- ---------- nota_digital ----------
IF OBJECT_ID('nota_digital', 'U') IS NULL
CREATE TABLE nota_digital (
    id_nota BIGINT IDENTITY(1,1) PRIMARY KEY,
    nomor_nota VARCHAR(30) NOT NULL UNIQUE,
    id_pesanan BIGINT NOT NULL UNIQUE REFERENCES pesanan(id_pesanan),
    total_tagihan DECIMAL(12,2) NOT NULL,
    nominal_dp DECIMAL(12,2) NOT NULL,     -- snapshot BR-26
    sisa_pembayaran DECIMAL(12,2) NOT NULL, -- snapshot BR-26
    diterbitkan_pada DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ---------- pembayaran ----------
IF OBJECT_ID('pembayaran', 'U') IS NULL
CREATE TABLE pembayaran (
    id_pembayaran BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_pesanan BIGINT NOT NULL REFERENCES pesanan(id_pesanan),
    jenis VARCHAR(12) NOT NULL CHECK (jenis IN ('DP','PELUNASAN')),
    metode VARCHAR(12) NOT NULL CHECK (metode IN ('QRIS','TRANSFER','TUNAI')),
    nominal DECIMAL(12,2) NOT NULL,
    file_bukti_url NVARCHAR(255) NULL,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('MENUNGGU_VERIFIKASI','DITERIMA','DITOLAK','DIVOID')),
    status_sebelum_verifikasi VARCHAR(20) NOT NULL
        CHECK (status_sebelum_verifikasi IN ('BELUM_BAYAR','MENUNGGU_VERIFIKASI','DP_DITERIMA','LUNAS')),
    verified_by BIGINT NULL REFERENCES users(id),
    verified_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
CREATE INDEX idx_pembayaran_pesanan ON pembayaran(id_pesanan);
CREATE INDEX idx_pembayaran_status ON pembayaran(status);
GO

-- ---------- riwayat_status_pesanan ----------
IF OBJECT_ID('riwayat_status_pesanan', 'U') IS NULL
CREATE TABLE riwayat_status_pesanan (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_pesanan BIGINT NOT NULL REFERENCES pesanan(id_pesanan),
    status VARCHAR(30) NOT NULL,
    waktu DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

-- ---------- bahan ----------
IF OBJECT_ID('bahan', 'U') IS NULL
CREATE TABLE bahan (
    id_bahan BIGINT IDENTITY(1,1) PRIMARY KEY,
    nama NVARCHAR(100) NOT NULL,
    satuan NVARCHAR(20) NOT NULL,
    stok DECIMAL(12,3) NOT NULL DEFAULT 0,
    stok_minimum DECIMAL(12,3) NOT NULL DEFAULT 0,
    tipe VARCHAR(10) NOT NULL CHECK (tipe IN ('BAHAN','KEMASAN'))
);
GO

-- ---------- komposisi_bahan ----------
IF OBJECT_ID('komposisi_bahan', 'U') IS NULL
CREATE TABLE komposisi_bahan (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    id_produk BIGINT NOT NULL REFERENCES produk(id_produk),
    id_bahan BIGINT NOT NULL REFERENCES bahan(id_bahan),
    jumlah_per_porsi DECIMAL(12,3) NOT NULL
);
GO

-- ---------- log_aktivitas ----------
IF OBJECT_ID('log_aktivitas', 'U') IS NULL
CREATE TABLE log_aktivitas (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    actor_id BIGINT NULL REFERENCES users(id),
    aksi VARCHAR(50) NOT NULL,
    entitas VARCHAR(50) NOT NULL,
    entitas_id BIGINT NULL,
    detail NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO