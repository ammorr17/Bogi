import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Sentiment } from "@/lib/database.types";

const VALID_SENTIMENTS: Sentiment[] = ["positive", "neutral", "negative"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const courseId = typeof body.courseId === "string" ? body.courseId : null;
  const sentiment: Sentiment | null = VALID_SENTIMENTS.includes(body.sentiment)
    ? body.sentiment
    : null;
  const datePlayed =
    typeof body.datePlayed === "string" && body.datePlayed ? body.datePlayed : null;

  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }
  if (!sentiment) {
    return NextResponse.json(
      { error: "sentiment must be one of positive, neutral, negative" },
      { status: 400 },
    );
  }

  // How many *other* courses has this user already played IN THIS SAME
  // TIER? Comparisons only ever happen within a tier, so that count (not
  // the user's total play count) determines the binary-search bounds.
  const { count: existingCount, error: countError } = await supabase
    .from("plays")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("sentiment", sentiment)
    .neq("course_id", courseId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  const { data: play, error: insertError } = await supabase
    .from("plays")
    .insert({
      user_id: user.id,
      course_id: courseId,
      date_played: datePlayed,
      sentiment,
    })
    .select("*")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You've already added this course." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const needsComparison = (existingCount ?? 0) > 0;

  return NextResponse.json({
    play,
    needsComparison,
    comparisonBounds: needsComparison
      ? { lo: 0, hi: existingCount ?? 0 }
      : null,
  });
}
