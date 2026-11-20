SELECT SERVERPROPERTY('IsIntegratedSecurityOnly') AS windows_only;
-- 1 = Windows only (SQL login DITOLAK)
-- 0 = Mixed mode (SQL login DIIZINKAN)

USE master;
GO

-- Cek apakah login sudah ada
SELECT name, type_desc, is_disabled
FROM sys.server_principals
WHERE name = 'efdi_user';
GO

-- Jika BELUM ada → buat
CREATE LOGIN efdi_user
  WITH PASSWORD = 'Efdi@123',
       CHECK_POLICY = OFF,
       CHECK_EXPIRATION = OFF;
GO

-- Jika SUDAH ada → reset password & pastikan tidak disabled
ALTER LOGIN efdi_user WITH PASSWORD = 'Efdi@123';
ALTER LOGIN efdi_user ENABLE;
GO