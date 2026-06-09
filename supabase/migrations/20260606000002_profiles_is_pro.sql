-- ─────────────────────────────────────────────────────────────
-- Add is_pro server-side override flag to profiles
-- ─────────────────────────────────────────────────────────────
-- Lets us grant Pro to specific users (testers, comp accounts,
-- support-issue refunds) without going through RevenueCat.
-- The app ORs this flag with the RC entitlement check.
--
-- RLS already restricts UPDATE to (auth.uid() = id) and is_admin
-- isn't in the safe-columns set the policy allows — apply the same
-- treatment to is_pro: users can't flip themselves Pro. Only admins
-- via dashboard / service-role can write this column.
-- ─────────────────────────────────────────────────────────────

alter table profiles
  add column if not exists is_pro boolean not null default false;

-- Backfill: flip every existing user (all 9 are test/family accounts) to Pro.
-- New signups continue to default to false.
update profiles set is_pro = true where is_pro = false;
