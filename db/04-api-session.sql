USE [EfdiKitchenDB];
GO

IF OBJECT_ID(N'dbo.ApiSession', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ApiSession
    (
        session_id_hash VARBINARY(32) NOT NULL,
        csrf_token_hash VARBINARY(32) NOT NULL,
        id_pengguna INT NULL,
        created_at DATETIME2(0) NOT NULL CONSTRAINT DF_ApiSession_created_at DEFAULT SYSUTCDATETIME(),
        last_activity DATETIME2(0) NOT NULL CONSTRAINT DF_ApiSession_last_activity DEFAULT SYSUTCDATETIME(),
        expires_at DATETIME2(0) NOT NULL,
        CONSTRAINT PK_ApiSession PRIMARY KEY (session_id_hash),
        CONSTRAINT FK_ApiSession_Pengguna FOREIGN KEY (id_pengguna) REFERENCES dbo.Pengguna(id_pengguna)
    );

    CREATE INDEX IX_ApiSession_expires_at ON dbo.ApiSession(expires_at);
END;
GO
