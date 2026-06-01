-- ============================================================
-- Longkedin — PostgreSQL Initialization Script
-- Creates extensions and schemas on first DB start
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create vector extension in separate schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Set up vector search index defaults
-- (Actual indexes created via Prisma migrations)

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE longkedin TO longkedin;
