# Bogi — Future Ideas

A running backlog of things to consider after the v1 friends-test core loop
is solid. Nothing here is committed to — just captured so it doesn't get
lost. Add to this file freely; no need to ask before jotting something down.

## Ranking / comparison flow

- **Visits model + "Rank again"** (design decided, not yet built).
  Courses change over time (renovations, different conditions, etc.), so a
  course's rank shouldn't be frozen forever after the first time it's
  played. Rather than a full per-visit ranked-list (same course showing up
  multiple times), we're following Beli's pattern: one row per course in
  the ranked list, with a **"Rank again"** action that lets you re-run the
  sentiment + comparison flow for a course you've already played.

  How it fits the existing derived-ranking design:
  - `plays` becomes `visits` — drop the `unique(user_id, course_id)`
    constraint so a user can log more than one visit to the same course
    over time.
  - Sentiment and comparisons move to being per-*visit* rather than
    per-*course* (`comparisons` references visit ids, not course ids).
  - To build the ranked list, only each course's **most recent visit**
    counts. Handy free win: the ranking algorithm already ignores any
    comparison edge referencing an id outside the set of ids you hand it
    — so once an old visit's id is excluded from that set (because it's
    no longer the "current" one), its comparisons automatically stop
    affecting the ranking. No manual cleanup/migration of old comparisons
    needed.
  - "Rank again" = log a new visit → pick a fresh sentiment tier → binary
    search it against everyone else's *current* visits (never against the
    course's own superseded visit) → course moves to wherever the new
    experience lands. Old visits stay around as history (dates/tiers),
    just stop affecting the active ranking once superseded.
  - Ripples into: migration (rename/restructure `plays`, `comparisons`
    columns), `src/lib/queries.ts` (pick "current visit per course" before
    calling the ranking derivation), a new "Rank again" UI entry point on
    the rankings page reusing the existing sentiment-prompt + compare-flow
    components.
- **Resume an abandoned comparison.** If someone bails out mid
  binary-search, that course sits in a partially-placed spot until they
  manually re-trigger a comparison. Could detect and prompt to finish.

## Course data

- **Course photos.** `courses.photo_url` already exists in the schema but
  nothing in the UI sets or shows it.
- **"Want to play" → played.** One-click promote a wishlist course
  straight into the add/compare flow instead of re-searching for it.

## Social

- **Direction: Bogi becomes a social app**, not just a private ranked
  list. First concrete step: let users upload photos from a round, with a
  visibility setting per photo — private / friends-only / public.
  - **Decided:** "public" = any signed-in Bogi user, not the open web.
    Keeps this out of discovery/moderation territory for now — just an
    RLS-level visibility tier (private / friends / any signed-in user).
  - **Resolved by the visits model above:** photos naturally attach to a
    `visits` row (one per round played), which is now the planned schema
    once "Visits model + Rank again" is built — no separate schema
    decision needed for photos specifically.
  - Related, smaller-scope version of "social": friend activity feed
    (already listed below) becomes much more natural once there's photo
    content to show in it.

## Third-party integrations (long-term vision, not near-term)

- **Direction:** connect to GHIN for official handicap tracking / verified
  course plays, and to tee-time booking platforms (GolfNow-style) so users
  can book directly through Bogi — the golf equivalent of Beli's OpenTable
  integration for restaurant reservations.
- **Reality check:** neither of these is a self-serve developer API.
  - GHIN is run by the USGA and access requires a formal
    partnership/licensing relationship, not a public API key signup.
  - GolfNow-style booking APIs work like OpenTable's — negotiated
    partnerships (often with revenue share), not open REST APIs. Beli
    almost certainly had real user traction before OpenTable agreed to
    that integration.
  - Net effect: this is a "once Bogi has real traction" milestone, and
    that traction is likely a prerequisite to even getting a partnership
    conversation started, not just an engineering task to schedule.
- **Lower-effort interim alternatives** that get partial value now, no
  partnership needed:
  - **Handicap-lite:** a self-reported handicap field, or an unofficial
    differential calculated from rounds logged in Bogi itself. Not an
    official USGA handicap, but gives users something.
  - **Booking-lite:** deep-link out to a course's existing GolfNow/booking
    page ("Book a tee time →" opens their site) instead of true in-app
    booking. No partnership required, just a link — could live on the
    course detail view whenever that exists.

## Out of scope for v1 (from the original spec — revisit once the core loop
is proven fun with the friend group)

- Recommendation engine / taste-matching
- Activity feed / notifications (e.g. "your friend just ranked a new
  course")
- Native mobile app
- Monetization, badges, gamification

## Backlog etiquette

- New idea → add a bullet under the right section (or a new section).
- Nothing gets built from this file without discussing it first.
