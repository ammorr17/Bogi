# Bogi — Future Ideas

A running backlog of things to consider after the v1 friends-test core loop
is solid. Nothing here is committed to — just captured so it doesn't get
lost. Add to this file freely; no need to ask before jotting something down.

## Ranking / comparison flow

- **Re-tier or re-rank a course.** Right now Positive/Neutral/Negative is
  locked in when you add the course, with no way to fix a mistake or
  update your opinion after playing it again. Would need to decide what
  happens to existing comparisons if a course moves tiers.
- **Resume an abandoned comparison.** If someone bails out mid
  binary-search, that course sits in a partially-placed spot until they
  manually re-trigger a comparison. Could detect and prompt to finish.

## Course data

- **Course photos.** `courses.photo_url` already exists in the schema but
  nothing in the UI sets or shows it.
- **"Want to play" → played.** One-click promote a wishlist course
  straight into the add/compare flow instead of re-searching for it.

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
