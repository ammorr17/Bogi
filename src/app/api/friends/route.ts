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
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const { data: found, error: lookupError } = await supabase
    .rpc("find_user_by_email", { lookup_email: email })
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json({ error: lookupError.message }, { status: 500 });
  }
  if (!found) {
    return NextResponse.json(
      { error: "No Bogi user with that email yet." },
      { status: 404 },
    );
  }
  if (found.id === user.id) {
    return NextResponse.json(
      { error: "That's your own email." },
      { status: 400 },
    );
  }

  // If they already sent *us* a pending request, accept it instead of
  // creating a duplicate/opposite-direction row.
  const { data: reciprocal } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_id", found.id)
    .eq("friend_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (reciprocal) {
    const { error: acceptError } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", reciprocal.id);
    if (acceptError) {
      return NextResponse.json({ error: acceptError.message }, { status: 500 });
    }
    return NextResponse.json({ status: "accepted" });
  }

  const { error: insertError } = await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: found.id,
    status: "pending",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You already sent a request to this person." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ status: "pending" }, { status: 201 });
}
