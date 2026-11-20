IF DB_ID('efdi_kitchen') IS NULL
  CREATE DATABASE efdi_kitchen;
GO

USE efdi_kitchen;
GO

-- Buat user database yang terhubung ke login
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'efdi_user')
  CREATE USER efdi_user FOR LOGIN efdi_user;
GO

-- Beri role (db_owner cukup untuk dev; produksi bisa db_datareader + db_datawriter + EXECUTE)
ALTER ROLE db_owner ADD MEMBER efdi_user;
GO

-- Jalankan sebagai efdi_user untuk memastikan bisa login & akses DB
EXECUTE AS LOGIN = 'efdi_user';
SELECT DB_NAME() AS current_db, SUSER_SNAME() AS login_name;
REVERT;
GO