-- YouBeTheJudge: User accounts & monetization tables
-- Run this in your Supabase SQL editor

-- Users table
CREATE TABLE IF NOT EXISTS ybtj_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT UNIQUE,
  email TEXT,
  google_id TEXT UNIQUE,
  display_name TEXT DEFAULT 'User',
  avatar_url TEXT,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  verdicts_used INTEGER DEFAULT 0,
  bonus_verdicts INTEGER DEFAULT 0,
  verdicts_reset_at TIMESTAMPTZ DEFAULT NOW(),
  party_expires_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ybtj_users_phone ON ybtj_users(phone);
CREATE INDEX IF NOT EXISTS idx_ybtj_users_google_id ON ybtj_users(google_id);
CREATE INDEX IF NOT EXISTS idx_ybtj_users_email ON ybtj_users(email);

-- Verdict history (tied to user accounts)
CREATE TABLE IF NOT EXISTS ybtj_verdict_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES ybtj_users(id),
  topic TEXT NOT NULL,
  person_a_name TEXT,
  person_b_name TEXT,
  winner TEXT, -- 'A', 'B', 'Tie'
  score_a INTEGER,
  score_b INTEGER,
  headline TEXT,
  ruling TEXT,
  judge_mode TEXT DEFAULT 'neutral',
  is_group BOOLEAN DEFAULT false,
  case_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verdict_history_user ON ybtj_verdict_history(user_id);

-- RLS policies
ALTER TABLE ybtj_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ybtj_verdict_history ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our serverless functions use anon key with service-role-like access)
CREATE POLICY "Allow all for anon" ON ybtj_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON ybtj_verdict_history FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ybtj_users_updated_at
  BEFORE UPDATE ON ybtj_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
