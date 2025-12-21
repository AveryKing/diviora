IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'diviora')
BEGIN
    CREATE DATABASE diviora;
END
GO