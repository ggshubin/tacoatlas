-- Fix SELECT policies to respect review privacy (matching sibling table pattern)
DROP POLICY IF EXISTS "Public read burrito_entries" ON burrito_entries;
DROP POLICY IF EXISTS "Public read torta_entries" ON torta_entries;

CREATE POLICY "Review sub-entries follow review access" ON burrito_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = burrito_entries.review_id
        AND (r.is_public = true OR r.user_id = auth.uid())
    )
  );

CREATE POLICY "Review sub-entries follow review access" ON torta_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reviews r
      WHERE r.id = torta_entries.review_id
        AND (r.is_public = true OR r.user_id = auth.uid())
    )
  );

-- Add review_id indexes
CREATE INDEX burrito_entries_review_id_idx ON burrito_entries(review_id);
CREATE INDEX torta_entries_review_id_idx ON torta_entries(review_id);
