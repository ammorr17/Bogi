import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRankedCoursesForUser } from "@/lib/queries";
import { nextOpponent } from "@/lib/ranking";
import CompareClient from "./compare-client";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const newCourseId = params.new;
  if (!newCourseId) redirect("/rankings");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ranked = await getRankedCoursesForUser(supabase, user.id);
  const newCourseEntry = ranked.find((r) => r.course.id === newCourseId);
  if (!newCourseEntry) redirect("/rankings");

  const existingRanked = ranked.filter((r) => r.course.id !== newCourseId);
  const existingRankedIds = existingRanked.map((r) => r.course.id);

  const lo = params.lo ? Number(params.lo) : 0;
  const hi = params.hi ? Number(params.hi) : existingRankedIds.length;

  const step = nextOpponent(existingRankedIds, lo, hi);
  if (!step) {
    redirect("/rankings?added=1");
  }

  const opponentEntry = existingRanked.find(
    (r) => r.course.id === step.opponentId,
  )!;

  return (
    <CompareClient
      newCourse={newCourseEntry.course}
      opponent={opponentEntry.course}
      mid={step.mid}
      lo={lo}
      hi={hi}
      totalToCompare={existingRankedIds.length}
    />
  );
}
