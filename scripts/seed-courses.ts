/**
 * Seed the shared `courses` table.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
 *
 * Requires the service role key (not the anon key) since RLS on `courses`
 * only allows authenticated app users to insert, and this runs outside
 * that context. Safe to re-run — existing courses (matched by
 * name+city+state) are skipped rather than duplicated.
 */
import { createClient } from "@supabase/supabase-js";
import { courses } from "./courses-seed-data";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY before running the seed script.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function main() {
  const { data: existing, error: fetchError } = await supabase
    .from("courses")
    .select("name, city, state");

  if (fetchError) {
    console.error("Failed to read existing courses:", fetchError.message);
    process.exit(1);
  }

  const existingKeys = new Set(
    (existing ?? []).map((c) => `${c.name}|${c.city ?? ""}|${c.state ?? ""}`),
  );

  const toInsert = courses
    .filter((c) => !existingKeys.has(`${c.name}|${c.city}|${c.state}`))
    .map((c) => ({
      name: c.name,
      city: c.city,
      state: c.state,
      public_or_private: c.publicOrPrivate,
    }));

  if (toInsert.length === 0) {
    console.log("Nothing to seed — all courses already exist.");
    return;
  }

  const { error: insertError } = await supabase.from("courses").insert(toInsert);
  if (insertError) {
    console.error("Failed to insert courses:", insertError.message);
    process.exit(1);
  }

  console.log(`Seeded ${toInsert.length} course(s).`);
}

main();
