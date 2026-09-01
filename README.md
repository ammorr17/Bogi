# Bogi

"Beli, but for golf courses." Build a personal ranked list of golf courses
by comparing them head-to-head instead of rating them 1-10.

Stack: Next.js (App Router) + Supabase (Postgres + Auth), deployed to
Vercel.

## How ranking works

Rankings are never stored directly — they're derived from an append-only
log of head-to-head comparisons (`comparisons`: winner beats loser).

When you add a course you've played, it's inserted into your existing
ranked list via binary search: "Course A or Course B?", narrowing down in
O(log n) comparisons until its slot is found. Your ranked list for any
screen is then just a topological sort of those comparisons. See the doc
comment at the top of `src/lib/ranking.ts` for the full writeup, including
why insertion sort was chosen over an Elo-style rating for this stage.

## Setup

1. Create a [Supabase](https://supabase.com) project.
2. Run the migration in `supabase/migrations/0001_init.sql` against it —
   either paste it into the Supabase SQL editor, or with the Supabase CLI:

   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

3. In Supabase Auth settings, enable Email (magic link / OTP) sign-in.
4. Copy `.env.example` to `.env.local` and fill in your project's URL and
   anon key (Project Settings -> API).
5. Install dependencies and run the dev server:

   ```bash
   npm install
   npm run dev
   ```

6. Seed the shared course directory. Edit `scripts/courses-seed-data.ts` to
   match your friend group's actual course list first — the checked-in
   list is just a generic starter set. Then, with the service role key
   from Project Settings -> API set as `SUPABASE_SERVICE_ROLE_KEY`:

   ```bash
   npm run seed
   ```

## Core loop

1. **Sign in** with a magic link (Supabase Auth, email OTP).
2. **Add a course you've played** — search the shared directory or add a
   new course if it's missing (`/courses/add`).
3. **Compare** it against courses you've already ranked — fast, one
   head-to-head decision at a time (`/compare`).
4. **See your ranked list**, fully derived from your comparisons
   (`/rankings`).
5. **Add friends** by email and view your ranked lists side by side
   (`/friends`).
6. **Save courses you want to play**, separate from your ranked list
   (`/want-to-play`).

## Project structure

- `supabase/migrations/0001_init.sql` — schema, indexes, and RLS policies
  for `users`, `courses`, `plays`, `comparisons`, `friendships`,
  `want_to_play`.
- `src/lib/ranking.ts` — the ranking algorithm (pure functions, unit-testable).
- `src/lib/queries.ts` — data-access helpers that combine plays + comparisons
  into a ranked list.
- `src/lib/supabase/` — Supabase client setup for the browser, server
  components, and middleware (session refresh + route protection).
- `src/app/` — pages and API routes for each step of the core loop above.
- `scripts/` — the course-directory seed script.

## Deploying

Deploy to [Vercel](https://vercel.com/new), setting the same environment
variables from `.env.example` (skip `SUPABASE_SERVICE_ROLE_KEY` in the
Vercel project — it's only needed locally to run the seed script).
