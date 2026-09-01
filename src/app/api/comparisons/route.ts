import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { narrowBounds } from "@/lib/ranking";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { newCourseId, opponentId, mid, lo, hi, newCourseWon } = body as {
    newCourseId: string;
    opponentId: string;
    mid: number;
    lo: number;
    hi: number;
    newCourseWon: boolean;
  };

  if (
    typeof newCourseId !== "string" ||
    typeof opponentId !== "string" ||
    typeof mid !== "number" ||
    typeof lo !== "number" ||
    typeof hi !== "number" ||
    typeof newCourseWon !== "boolean"
  ) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  // Make sure both courses are actually ones this user has played, so a
  // comparison can't be recorded against something outside their list.
  const { data: plays, error: playsError } = await supabase
    .from("plays")
    .select("course_id")
    .eq("user_id", user.id)
    .in("course_id", [newCourseId, opponentId]);

  if (playsError) {
    return NextResponse.json({ error: playsError.message }, { status: 500 });
  }
  if (!plays || plays.length !== 2) {
    return NextResponse.json(
      { error: "both courses must be in your played list" },
      { status: 400 },
    );
  }

  const { error: insertError } = await supabase.from("comparisons").insert({
    user_id: user.id,
    course_id_winner: newCourseWon ? newCourseId : opponentId,
    course_id_loser: newCourseWon ? opponentId : newCourseId,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const next = narrowBounds(lo, hi, mid, newCourseWon);
  const done = next.lo >= next.hi;

  return NextResponse.json({ done, lo: next.lo, hi: next.hi });
}
