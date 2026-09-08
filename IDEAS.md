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

## Global course rankings / top lists

- **Direction (decided):** aggregate everyone's personal rankings into a
  single numeric score per course, so we can generate lists like "top
  public courses in Texas" or "top private courses" — filterable by
  `courses.state` / `public_or_private`, both of which already exist, so
  filtering itself is essentially free once a score exists.
- **Decided approach: weighted average of normalized rank.** For each
  user who's ranked a course, convert its position in *their* derived
  list to a 0–1 score (best in their list ≈ 1.0, worst ≈ 0.0 — this
  already accounts for tier for free, since Positive/Neutral/Negative
  determines position in each user's list). Average that across everyone
  who's ranked the course, weighted toward the overall mean when a course
  has few raters (Bayesian/"IMDb-style" adjustment) so one person's #1
  doesn't outrank a course 50 people love. A query over existing derived
  data, not a new ranking system.
  - **Rejected for now: Elo/Bradley-Terry over pooled raw comparisons**
    (treating every user's head-to-head as one data point in a single
    global rating model). More statistically rigorous and actually a
    good fit once there's real volume — this is literally the scenario
    the ranking.ts doc comment flagged as worth revisiting Elo for — but
    it's a real rating computation to build, not just a query. Natural
    upgrade path once usage justifies it; no wasted work from starting
    with the simpler approach first.
- **Practical note:** this aggregates across *all* users, so computing it
  live on every request could get slow at real scale (unlike the
  per-user rankings, which only ever touch one person's data). Worth
  caching/recomputing periodically once that matters — not a concern at
  friends-test size.

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
- **Friend activity feed** (design decided, not yet built — depends on
  the visits model and photos above for real content to show).
  Beli-style push feed: a single chronological stream aggregating your
  friends' activity — new courses ranked/added, "Rank again" updates,
  new photos — not just a pull model where you visit a friend's page to
  see what's new.
  - Needs a new `activity_events` table (actor user_id, event type, a
    reference to the visit/photo/course involved, created_at), written at
    the same time as the action itself (e.g. the visit-logging API also
    inserts a "ranked a course" event) rather than derived after the fact.
  - Feed query for a viewer = events where the actor is an accepted
    friend (or the viewer), ordered by created_at.
  - Has to respect the photo visibility tiers from the Social section
    above: a **private** photo's event should never surface to friends at
    all (or surface without the photo attached); friends-only and
    signed-in-only photos are fine to show to an audience that already
    satisfies those rules.
  - Natural home for read/unread state and pagination later, but neither
    is required for a first version.
  - Feed sources expand to "friends OR followed accounts" once the
    "Public profiles + following" idea below exists.

## User profile

- **Direction (decided):** a more robust profile — home course, top
  ranked course, handicap, years of experience, # of courses ranked.
- Most of this is close to free:
  - **Top ranked course** and **# of courses ranked** aren't new data —
    just rank #1 and the count from the ranking derivation that already
    exists. No schema needed.
  - **Home course**, **handicap**, and **years of experience** are the
    only genuinely new fields — self-reported, added as columns on
    `users` (home course as an FK to `courses`, the other two as simple
    nullable fields).
  - **Free win on visibility:** `users` already has an RLS policy letting
    friends (and only friends) see your row — so new columns on that same
    table automatically inherit friends-only visibility with no new
    policy work, consistent with how plays/comparisons are already
    scoped. That stays the *default* — see "Public profiles + following"
    below for the opt-in public version of this.
  - **Merges with "Handicap-lite"** under Third-party integrations below
    — same feature, no need to track it twice.

## Public profiles + following (influencers)

- **Direction (decided):** on top of the friends-only profile above, let
  a user opt into a genuinely public profile — a real URL viewable by
  anyone on the open web, no Bogi account required. Aimed at golf
  influencer/creator use: a shareable link (Instagram bio, etc.) where
  people can follow along with where someone's playing and see their
  showcased experiences. This is opt-in, not the default — regular
  friends-test users stay exactly as private as they are today.
- **Decided: a new, separate "follow" relationship**, not an extension of
  `friendships`. One-way, no accept step required (`follows`: follower_id,
  followed_id, created_at) — you can follow someone without them
  following back, unlike the mutual accept/decline friend model. Friends
  stays the relationship for private data sharing (plays, comparisons,
  want-to-play); follows is the one-way "keep up with this person's public
  stuff" relationship.
- **Decided: a profile is either public or private, as a whole** — one
  account-level flag (`users.is_public`, default `false`), not per-field
  or per-photo granularity on top of it.
  - **Resolves the photo-visibility question**, rather than needing a new
    tier: the existing 3-tier photo model (private / friends / any
    signed-in Bogi user) stays exactly as-is and doesn't change meaning.
    What the profile flag controls is purely the *outer gate* — whether
    a login-free `/u/[id]`-style route exists at all for that user. On a
    public profile, that route shows the profile fields plus whatever's
    already tagged "public" tier (now reachable by anyone, not just
    signed-in users); private and friends-only photos stay exactly as
    restricted as they always were, public flag or not. On a private
    profile (the default), nothing changes from how the app behaves
    today — "public" tier photos still only reach as far as other
    signed-in Bogi users, since there's no open route to show them on.
  - Following only really makes sense against a **public** profile —
    there's no public content to "follow along with" on a private one.
- **Real technical implications of "genuinely open web"**, since this is
  new territory for the app (literally everything today requires
  `auth.uid()`):
  - A public route that bypasses the login wall entirely (today's
    middleware redirects every unauthenticated request to `/login` except
    `/login` and `/auth/callback` — a public profile route like `/u/[id]`
    needs to be added to that exemption list, only rendering for users
    with `is_public = true`).
  - A genuine anonymous-read RLS policy gated by `is_public` — not just
    "authenticated" like every other policy today.
  - **Moderation becomes real** once strangers can view content —
    reporting/blocking wasn't needed for the friends-only version of this
    app and will be for this one. Cost of choosing "genuinely open web"
    over the narrower alternative.
- **Feeds into the friend activity feed above:** once follows exist, feed
  sources expand from "accepted friends" to "friends OR followed
  accounts."

## Group trip planning

- **Direction (decided):** surface overlap between friends' "want to
  play" lists so a group can spot courses everyone's already interested
  in — the seed of planning an actual golf trip together.
- **Decided:** `want_to_play` moves from private-only to friend-visible,
  same pattern as `plays`/`comparisons` already use (add an
  `is_friend_with(user_id)` clause to its select policy). Friends can see
  each other's full want-to-play lists, not just a computed overlap.
- **Phased:**
  - Phase 1: pick a set of friends, see which courses appear on more than
    one of your want-to-play lists. No new "trip" entity yet — just a
    smarter view over data that already exists once the RLS change above
    lands.
  - Phase 2 (stretch): an actual trip-planning flow on top — invites,
    RSVP, picking dates, maybe voting on which of the overlapping courses
    to actually play. This is close to its own feature area (would need
    something like `trips` / `trip_participants` tables) and should be
    scoped separately once Phase 1 proves useful.
- **Side note:** grouping courses by rough geographic proximity (so a
  "trip" is actually to one area) needs course coordinates — see
  "Location-based discovery" below, which needs the same thing.

## Location-based discovery

- **Direction (decided):** a "Courses near you" discovery view — not
  push notifications (that's a separate, bigger piece of infrastructure
  if it ever comes up later). Also the natural jumping-off point for
  surfacing tee times once a booking integration exists (see Third-party
  integrations below).
- **Getting the user's location:** browser Geolocation API with a
  permission prompt, plus a manual city/zip fallback for when permission
  is denied or on desktop where it's less reliable. Could optionally save
  a "home location" on the user so it doesn't re-prompt every visit.
- **Course coordinates:** `courses` doesn't store lat/long today. The
  OpenGolfAPI dataset used for seeding does include coordinates, so
  backfilling the already-seeded courses is easy. Courses added manually
  later would need either a geocoding step at creation time or just stay
  excluded from proximity search until backfilled. This same lat/long
  addition also unblocks the geographic-clustering side note under Group
  trip planning above.
- **Distance queries:** a plain Haversine-distance SQL query is plenty at
  this app's scale — no need for PostGIS unless this someday needs to
  handle far more courses than a golf app for a friend group ever will.

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
  - **Handicap-lite:** see "User profile" above — a self-reported
    handicap field there covers this until/unless real GHIN access ever
    happens.
  - **Booking-lite:** deep-link out to a course's existing GolfNow/booking
    page ("Book a tee time →" opens their site) instead of true in-app
    booking. No partnership required, just a link — could live on the
    course detail view whenever that exists.

## Out of scope for v1 (from the original spec — revisit once the core loop
is proven fun with the friend group)

- Recommendation engine / taste-matching
- Native mobile app
- Monetization, badges, gamification

## Backlog etiquette

- New idea → add a bullet under the right section (or a new section).
- Nothing gets built from this file without discussing it first.
