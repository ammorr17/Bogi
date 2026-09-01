import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { computeRankedOrder } from "@/lib/ranking";

type Client = SupabaseClient<Database>;
export type Course = Database["public"]["Tables"]["courses"]["Row"];

export interface RankedCourse {
  rank: number;
  course: Course;
  datePlayed: string | null;
}

/**
 * Fetch a user's played courses and comparisons and derive their ranked
 * list. Relies on RLS: callers can only successfully read their own rows,
 * or an accepted friend's rows.
 */
export async function getRankedCoursesForUser(
  supabase: Client,
  userId: string,
): Promise<RankedCourse[]> {
  const [playsRes, comparisonsRes] = await Promise.all([
    supabase
      .from("plays")
      .select("course_id, date_played, created_at, courses(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("comparisons")
      .select("course_id_winner, course_id_loser")
      .eq("user_id", userId),
  ]);

  if (playsRes.error) throw playsRes.error;
  if (comparisonsRes.error) throw comparisonsRes.error;

  const plays = playsRes.data ?? [];
  const courseById = new Map<string, Course>();
  for (const play of plays) {
    const course = play.courses as unknown as Course | null;
    if (course) courseById.set(play.course_id, course);
  }

  const courseIds = plays.map((p) => p.course_id);
  const tieBreakOrder = [...courseIds]; // already ordered by created_at asc
  const comparisons = (comparisonsRes.data ?? []).map((c) => ({
    winnerId: c.course_id_winner,
    loserId: c.course_id_loser,
  }));

  const ordered = computeRankedOrder(courseIds, comparisons, tieBreakOrder);
  const datePlayedByCourse = new Map(
    plays.map((p) => [p.course_id, p.date_played]),
  );

  return ordered
    .map((courseId, i) => {
      const course = courseById.get(courseId);
      if (!course) return null;
      return {
        rank: i + 1,
        course,
        datePlayed: datePlayedByCourse.get(courseId) ?? null,
      };
    })
    .filter((r): r is RankedCourse => r !== null);
}

export interface WantToPlayEntry {
  id: string;
  course: Course;
}

export async function getWantToPlayForUser(
  supabase: Client,
  userId: string,
): Promise<WantToPlayEntry[]> {
  const { data, error } = await supabase
    .from("want_to_play")
    .select("id, courses(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const course = row.courses as unknown as Course | null;
      if (!course) return null;
      return { id: row.id, course };
    })
    .filter((r): r is WantToPlayEntry => r !== null);
}
