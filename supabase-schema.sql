-- YouBeTheJudge: Court Community Feature Schema
-- Run this in Supabase SQL Editor

-- ══════════════════════════════════════════════
-- 1. TABLES
-- ══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS court_cases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic         text NOT NULL,
  category      text NOT NULL DEFAULT 'Random',
  side_a        text NOT NULL,
  side_b        text NOT NULL,
  display_a     text NOT NULL DEFAULT 'Person A',
  display_b     text NOT NULL DEFAULT 'Person B',
  ai_winner     text NOT NULL,
  ai_headline   text NOT NULL,
  ai_ruling     text NOT NULL,
  verdict_json  jsonb,
  preview       text,
  visitor_id    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS court_votes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  visitor_id  text NOT NULL,
  side        text NOT NULL CHECK (side IN ('a','b')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(case_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS court_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id     uuid NOT NULL REFERENCES court_cases(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES court_comments(id) ON DELETE CASCADE,
  username    text NOT NULL,
  text        text NOT NULL,
  tag         text,
  visitor_id  text,
  likes_count int NOT NULL DEFAULT 0,
  report_count int NOT NULL DEFAULT 0,
  hidden      boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS court_comment_likes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid NOT NULL REFERENCES court_comments(id) ON DELETE CASCADE,
  visitor_id  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, visitor_id)
);

CREATE TABLE IF NOT EXISTS court_comment_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id  uuid NOT NULL REFERENCES court_comments(id) ON DELETE CASCADE,
  visitor_id  text NOT NULL,
  reason      text DEFAULT 'inappropriate',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, visitor_id)
);

-- ══════════════════════════════════════════════
-- 2. INDEXES
-- ══════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_court_cases_category_created ON court_cases(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_court_votes_case ON court_votes(case_id);
CREATE INDEX IF NOT EXISTS idx_court_comments_case ON court_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_court_comment_likes_comment ON court_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_court_comment_reports_comment ON court_comment_reports(comment_id);

-- ══════════════════════════════════════════════
-- 3. VIEW: court_cases_with_stats
-- ══════════════════════════════════════════════

CREATE OR REPLACE VIEW court_cases_with_stats AS
SELECT
  c.id, c.topic, c.category, c.display_a, c.display_b,
  c.ai_winner, c.ai_headline, c.ai_ruling, c.preview,
  c.created_at,
  COALESCE(va.cnt, 0) AS votes_a,
  COALESCE(vb.cnt, 0) AS votes_b,
  COALESCE(va.cnt, 0) + COALESCE(vb.cnt, 0) AS total_votes,
  COALESCE(cc.cnt, 0) AS comment_count
FROM court_cases c
LEFT JOIN (SELECT case_id, COUNT(*) AS cnt FROM court_votes WHERE side='a' GROUP BY case_id) va ON va.case_id = c.id
LEFT JOIN (SELECT case_id, COUNT(*) AS cnt FROM court_votes WHERE side='b' GROUP BY case_id) vb ON vb.case_id = c.id
LEFT JOIN (SELECT case_id, COUNT(*) AS cnt FROM court_comments WHERE hidden=false GROUP BY case_id) cc ON cc.case_id = c.id;

-- ══════════════════════════════════════════════
-- 4. TRIGGERS
-- ══════════════════════════════════════════════

-- Auto-update likes_count on comment
CREATE OR REPLACE FUNCTION update_comment_likes_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE court_comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE court_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_likes ON court_comment_likes;
CREATE TRIGGER trg_comment_likes
AFTER INSERT OR DELETE ON court_comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Auto-update report_count and auto-hide at 3 reports
CREATE OR REPLACE FUNCTION update_comment_report_count() RETURNS trigger AS $$
BEGIN
  UPDATE court_comments
  SET report_count = report_count + 1,
      hidden = CASE WHEN report_count + 1 >= 3 THEN true ELSE hidden END
  WHERE id = NEW.comment_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_comment_reports ON court_comment_reports;
CREATE TRIGGER trg_comment_reports
AFTER INSERT ON court_comment_reports
FOR EACH ROW EXECUTE FUNCTION update_comment_report_count();

-- ══════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY
-- ══════════════════════════════════════════════

ALTER TABLE court_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE court_comment_reports ENABLE ROW LEVEL SECURITY;

-- Public read/write (anon key access)
CREATE POLICY "Public read court_cases" ON court_cases FOR SELECT USING (true);
CREATE POLICY "Public insert court_cases" ON court_cases FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read court_votes" ON court_votes FOR SELECT USING (true);
CREATE POLICY "Public insert court_votes" ON court_votes FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read court_comments" ON court_comments FOR SELECT USING (hidden = false);
CREATE POLICY "Public insert court_comments" ON court_comments FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read court_comment_likes" ON court_comment_likes FOR SELECT USING (true);
CREATE POLICY "Public insert court_comment_likes" ON court_comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete court_comment_likes" ON court_comment_likes FOR DELETE USING (true);

CREATE POLICY "Public read court_comment_reports" ON court_comment_reports FOR SELECT USING (true);
CREATE POLICY "Public insert court_comment_reports" ON court_comment_reports FOR INSERT WITH CHECK (true);
