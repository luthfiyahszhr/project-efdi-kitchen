USE master;
GO

-- Cek status mode autentikasi saat ini
SELECT 
    CASE SERVERPROPERTY('IsIntegratedSecurityOnly')
        WHEN 1 THEN 'Windows Authentication Only (Akan diubah ke Mixed Mode)'
        WHEN 0 THEN 'Mixed Mode sudah aktif'
    END AS Status_Autentikasi_Sebelum;
GO

-- Aktifkan Mixed Mode Authentication (LoginMode = 2)
-- Catatan: Membutuhkan hak akses sysadmin dan Restart service SQL Server setelah dijalankan
EXEC xp_instance_regwrite 
    N'HKEY_LOCAL_MACHINE', 
    N'Software\Microsoft\MSSQLServer\MSSQLServer', 
    N'LoginMode', 
    REG_DWORD, 
    2;
GO

PRINT 'Mixed Mode berhasil diatur. Silakan RESTART service SQL Server di SSMS/Services sebelum lanjut ke file 01.';
GO