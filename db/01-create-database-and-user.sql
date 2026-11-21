USE master;
GO

-- 1. Buat database EfdiKitchenDB jika belum ada
IF DB_ID(N'EfdiKitchenDB') IS NULL
BEGIN
    CREATE DATABASE [EfdiKitchenDB];
END
GO

-- 2. Buat Login tingkat server untuk aplikasi backend
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'efdi_app_login')
BEGIN
    CREATE LOGIN [efdi_app_login]
    WITH PASSWORD = N'EfdiKitchen_App2026!',
         DEFAULT_DATABASE = [EfdiKitchenDB],
         CHECK_EXPIRATION = OFF,
         CHECK_POLICY = ON;
END
GO

-- 3. Masuk ke EfdiKitchenDB dan petakan User aplikasi (Principle of Least Privilege)
USE EfdiKitchenDB;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'efdi_app_user')
BEGIN
    CREATE USER [efdi_app_user] FOR LOGIN [efdi_app_login];
    ALTER ROLE [db_datareader] ADD MEMBER [efdi_app_user];
    ALTER ROLE [db_datawriter] ADD MEMBER [efdi_app_user];
    GRANT EXECUTE TO [efdi_app_user];
END
GO

PRINT 'Database EfdiKitchenDB dan akun efdi_app_login berhasil dibuat.';
GO