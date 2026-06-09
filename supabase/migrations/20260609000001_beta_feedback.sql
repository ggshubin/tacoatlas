create table public.beta_feedback (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null check (type in ('bug', 'feature')),
  message     text        not null check (char_length(message) >= 1),
  user_id     uuid        references auth.users(id) on delete set null,
  user_email  text,
  created_at  timestamptz not null default now()
);

alter table public.beta_feedback enable row level security;

-- Anyone (anon or authenticated) can insert
create policy "beta_feedback_insert"
  on public.beta_feedback
  for insert
  to anon, authenticated
  with check (true);

-- Public cannot read — only service role via dashboard
create policy "beta_feedback_no_select"
  on public.beta_feedback
  for select
  to anon, authenticated
  using (false);
