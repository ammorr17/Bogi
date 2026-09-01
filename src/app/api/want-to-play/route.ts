import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
  if (!courseId) {
    return NextResponse.json({ error: "courseId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("want_to_play")
    .insert({ user_id: user.id, course_id: courseId });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Already on your want-to-play list." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "added" }, { status: 201 });
}
