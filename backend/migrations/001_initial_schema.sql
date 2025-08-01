-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rating INTEGER DEFAULT 1200,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    white_player_id TEXT NOT NULL,
    black_player_id TEXT NOT NULL,
    pgn TEXT,
    result TEXT, -- '1-0', '0-1', '1/2-1/2', '*'
    time_control TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    FOREIGN KEY (white_player_id) REFERENCES users(id),
    FOREIGN KEY (black_player_id) REFERENCES users(id)
);

-- Training sessions table
CREATE TABLE IF NOT EXISTS training_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    ai_personality TEXT NOT NULL,
    session_type TEXT NOT NULL, -- 'tactics', 'positional', 'endgame', etc.
    duration_seconds INTEGER,
    score INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Puzzles solved table
CREATE TABLE IF NOT EXISTS puzzles_solved (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    puzzle_id INTEGER NOT NULL,
    solved BOOLEAN NOT NULL,
    time_taken_seconds INTEGER,
    attempts INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_stats (
    user_id TEXT PRIMARY KEY,
    puzzles_solved INTEGER DEFAULT 0,
    puzzles_attempted INTEGER DEFAULT 0,
    total_training_time INTEGER DEFAULT 0,
    best_puzzle_streak INTEGER DEFAULT 0,
    current_puzzle_streak INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_drawn INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_games_white_player ON games(white_player_id);
CREATE INDEX idx_games_black_player ON games(black_player_id);
CREATE INDEX idx_training_sessions_user ON training_sessions(user_id);
CREATE INDEX idx_puzzles_solved_user ON puzzles_solved(user_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);