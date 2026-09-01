import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PublicOrPrivate } from "@/lib/database.types";

const VALID_TYPES: PublicOrPrivate[] = ["public", "private", "unknown"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : null;
  const state = typeof body.state === "string" ? body.state.trim() : null;
  const publicOrPrivate: PublicOrPrivate = VALID_TYPES.includes(
    body.publicOrPrivate,
  )
    ? body.publicOrPrivate
    : "unknown";

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      name,
      city: city || null,
      state: state || null,
      public_or_private: publicOrPrivate,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ course: data }, { status: 201 });
}
