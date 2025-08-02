-- Add premium support to users table
ALTER TABLE users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN premium_expires_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT NULL;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT NULL;

-- Create premium features table
CREATE TABLE IF NOT EXISTS premium_features (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default premium features
INSERT INTO premium_features (id, name, description) VALUES
    ('multiplayer', 'Multiplayer Games', 'Play unlimited games with friends using room codes'),
    ('advanced_ai', 'Advanced AI Coaching', 'Access to all AI coaching personalities and deeper analysis'),
    ('unlimited_analysis', 'Unlimited Analysis', 'No limits on game analysis and engine usage'),
    ('exclusive_puzzles', 'Exclusive Puzzles', 'Access to premium puzzle sets and advanced training'),
    ('custom_themes', 'Custom Themes', 'Unlock all board and piece themes'),
    ('priority_support', 'Priority Support', '24/7 priority customer support'),
    ('no_ads', 'Ad-Free Experience', 'No advertisements or promotional content');

-- Create premium transactions table
CREATE TABLE IF NOT EXISTS premium_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL, -- in cents
    currency TEXT DEFAULT 'USD',
    status TEXT NOT NULL, -- pending, completed, failed, refunded
    stripe_payment_intent_id TEXT,
    months INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Update some test users to have premium status
UPDATE users 
SET is_premium = TRUE, 
    premium_expires_at = datetime('now', '+30 days')
WHERE id = 'alice-001';

-- Create index for faster premium checks
CREATE INDEX idx_users_premium ON users(is_premium, premium_expires_at);