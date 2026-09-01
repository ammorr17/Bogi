import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (q.length === 0) {
    return NextResponse.json({ courses: [] });
  }

  // Strip characters that are structurally significant in PostgREST's
  // `.or()` filter syntax (comma separates conditions, parens group them)
  // so user input can't alter the query shape.
  const safeQ = q.replace(/[,()]/g, "").slice(0, 100);

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .or(`name.ilike.%${safeQ}%,city.ilike.%${safeQ}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ courses: data });
}
