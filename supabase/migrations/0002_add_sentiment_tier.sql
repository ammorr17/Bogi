-- Adds a coarse "Positive / Neutral / Negative" tier to each play, captured
-- before the head-to-head comparison flow. Tiers are strictly ordered
-- (every Positive course ranks above every Neutral, above every Negative);
-- comparisons only ever happen between courses in the same tier, so as a
-- user's list grows, each new course only needs to be binary-searched
-- against its own tier instead of their whole list. See the doc comment at
-- the top of src/lib/ranking.ts for how this composes with the existing
-- topological-sort ranking derivation.
--
-- Safe to re-run (mirrors 0001_init.sql's idempotency conventions).

alter table public.plays
  add column if not exists sentiment text not null default 'neutral'
    check (sentiment in ('positive', 'neutral', 'negative'));
