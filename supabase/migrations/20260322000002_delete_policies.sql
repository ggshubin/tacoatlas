-- supabase/migrations/20260322000002_delete_policies.sql
-- Allow users to delete their own reviews and personal vendors

-- Reviews: owner can delete
create policy "Users can delete their own reviews" on reviews
  for delete using (auth.uid() = user_id);

-- Taco / salsa / condiment sub-entries cascade automatically (ON DELETE CASCADE),
-- but the policies still need delete permission for the top-level review delete to work
create policy "Users can delete their own taco entries" on taco_entries
  for delete using (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

create policy "Users can delete their own salsa entries" on salsa_entries
  for delete using (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

create policy "Users can delete their own condiments" on condiments
  for delete using (
    exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid())
  );

-- Personal vendors: owner can delete (cascades to reviews)
create policy "Owners can delete their personal vendors" on vendors
  for delete using (
    status = 'personal' and submitted_by = auth.uid()
  );
