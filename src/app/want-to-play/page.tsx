import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWantToPlayForUser } from "@/lib/queries";
import WantToPlayClient from "./want-to-play-client";

export default async function WantToPlayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const entries = await getWantToPlayForUser(supabase, user.id);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">Want to play</h1>
      <p className="mt-1 text-sm text-gray-500">
        Courses on your list, separate from what you&apos;ve already played.
      </p>
      <WantToPlayClient initialEntries={entries} />
    </main>
  );
}
