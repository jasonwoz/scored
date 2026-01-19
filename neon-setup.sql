-- Complete PostgreSQL database setup for Scored app on Neon
-- Run this SQL script in your Neon PostgreSQL database

-- =============================================================================
-- BETTER AUTH TABLES (Required for authentication)
-- These tables are automatically created by Better Auth, but we'll define them here for completeness
-- =============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS "user" (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    email_verified BOOLEAN DEFAULT FALSE,
    image TEXT,
    username TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS session (
    id TEXT PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    user_agent TEXT,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- Accounts table (for OAuth providers)
CREATE TABLE IF NOT EXISTS account (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens table
CREATE TABLE IF NOT EXISTS verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- APPLICATION TABLES (Custom tables for your app)
-- =============================================================================

-- Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
    id SERIAL PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender_id, receiver_id)
);

-- Friends table for accepted friendships (bidirectional)
CREATE TABLE IF NOT EXISTS friends (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    friend_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id),
    CHECK (user_id < friend_id) -- Prevent duplicate bidirectional friendships
);

-- Scores table for daily score logging
CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    description TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date) -- One score per user per day
);

-- =============================================================================
-- INDEXES (For performance optimization)
-- =============================================================================

-- Better Auth indexes
CREATE INDEX IF NOT EXISTS idx_session_user_id ON session(user_id);
CREATE INDEX IF NOT EXISTS idx_session_token ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account(user_id);
CREATE INDEX IF NOT EXISTS idx_account_provider ON account(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_identifier ON verification(identifier);
CREATE INDEX IF NOT EXISTS idx_verification_expires ON verification(expires_at);

-- Friend system indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend ON friends(friend_id);

-- Scores indexes
CREATE INDEX IF NOT EXISTS idx_scores_user ON scores(user_id);
CREATE INDEX IF NOT EXISTS idx_scores_date ON scores(date);
CREATE INDEX IF NOT EXISTS idx_scores_user_date ON scores(user_id, date);

-- =============================================================================
-- VERIFICATION QUERIES (Check that all tables were created)
-- =============================================================================

-- Check table existence and row counts
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user', 'session', 'account', 'verification', 'friend_requests', 'friends', 'scores')
ORDER BY tablename;

-- Count records in each table
SELECT
    'user' as table_name,
    COUNT(*) as record_count
FROM "user"
UNION ALL
SELECT
    'session' as table_name,
    COUNT(*) as record_count
FROM session
UNION ALL
SELECT
    'account' as table_name,
    COUNT(*) as record_count
FROM account
UNION ALL
SELECT
    'verification' as table_name,
    COUNT(*) as record_count
FROM verification
UNION ALL
SELECT
    'friend_requests' as table_name,
    COUNT(*) as record_count
FROM friend_requests
UNION ALL
SELECT
    'friends' as table_name,
    COUNT(*) as record_count
FROM friends
UNION ALL
SELECT
    'scores' as table_name,
    COUNT(*) as record_count
FROM scores
ORDER BY table_name;

-- =============================================================================
-- OPTIONAL: Sample data for testing (uncomment if needed)
-- =============================================================================

/*
-- Insert a test user (replace with your actual data)
INSERT INTO "user" (id, name, email, username) VALUES
('test-user-1', 'Test User', 'test@example.com', 'testuser')
ON CONFLICT (id) DO NOTHING;

-- Insert a sample score
INSERT INTO scores (user_id, score, description) VALUES
('test-user-1', 85, 'Great day! Feeling productive and happy.')
ON CONFLICT (user_id, date) DO NOTHING;
*/

COMMIT;