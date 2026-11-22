USE [EfdiKitchenDB];
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID(N'dbo.ItemInventaris')
      AND name = N'batas_minimum'
      AND is_nullable = 0
)
BEGIN
    ALTER TABLE dbo.ItemInventaris ALTER COLUMN batas_minimum DECIMAL(12, 3) NULL;
END;
GO
