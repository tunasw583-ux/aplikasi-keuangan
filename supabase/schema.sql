create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  title text not null,
  amount numeric(14,2) not null check (amount >= 0),
  type text not null check (type in ('income', 'expense', 'usage')),
  category text not null,
  note text not null default '',
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);

alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using ((select auth.uid()) = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check ((select auth.uid()) = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using ((select auth.uid()) = user_id);
