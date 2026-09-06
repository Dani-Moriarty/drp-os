IF OBJECT_ID(N'dbo.message_board_messages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.message_board_messages (
        id BIGINT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        author NVARCHAR(60) NOT NULL,
        body NVARCHAR(1000) NOT NULL,
        created_at DATETIME2(6) NOT NULL,
        administrator BIT NOT NULL CONSTRAINT df_message_board_administrator DEFAULT 0
    )
END;
