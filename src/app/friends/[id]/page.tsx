import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRankedCoursesForUser } from "@/lib/queries";
import RankedList from "@/components/ranked-list";

export default async function FriendRankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: friendId } = await params;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(friendId)) redirect("/friends");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (!friendship) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <p className="text-sm text-gray-500">
          You&apos;re not friends with this person yet.
        </p>
        <Link href="/friends" className="mt-2 inline-block text-sm underline">
          Back to friends
        </Link>
      </main>
    );
  }

  const { data: friendUser } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("id", friendId)
    .single();

  const [mine, theirs] = await Promise.all([
    getRankedCoursesForUser(supabase, user.id),
    getRankedCoursesForUser(supabase, friendId),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href="/friends" className="text-sm text-gray-500 underline">
        ← Friends
      </Link>
      <h1 className="mt-2 text-xl font-bold">
        You vs {friendUser?.name ?? friendUser?.email ?? "friend"}
      </h1>

      <div className="mt-4 grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-500">You</h2>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No courses ranked yet.</p>
          ) : (
            <RankedList entries={mine} className="mt-2" />
          )}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-500">
            {friendUser?.name ?? friendUser?.email ?? "Friend"}
          </h2>
          {theirs.length === 0 ? (
            <p className="mt-2 text-sm text-gray-500">No courses ranked yet.</p>
          ) : (
            <RankedList entries={theirs} className="mt-2" />
          )}
        </div>
      </div>
    </main>
  );
}
