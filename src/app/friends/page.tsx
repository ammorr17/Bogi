import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddFriendForm from "./add-friend-form";
import FriendRequestActions from "./friend-request-actions";

export default async function FriendsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  const rows = friendships ?? [];
  const otherIds = rows.map((f) => (f.user_id === user.id ? f.friend_id : f.user_id));

  const { data: otherUsers } = otherIds.length
    ? await supabase.from("users").select("id, name, email").in("id", otherIds)
    : { data: [] as { id: string; name: string | null; email: string }[] };

  const usersById = new Map((otherUsers ?? []).map((u) => [u.id, u]));

  const accepted = rows.filter((f) => f.status === "accepted");
  const incoming = rows.filter(
    (f) => f.status === "pending" && f.friend_id === user.id,
  );
  const outgoing = rows.filter(
    (f) => f.status === "pending" && f.user_id === user.id,
  );

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">Friends</h1>

      <AddFriendForm />

      {incoming.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500">Requests</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {incoming.map((f) => {
              const other = usersById.get(f.user_id);
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <span>{other?.name ?? other?.email ?? "Someone"}</span>
                  <FriendRequestActions otherId={f.user_id} incoming />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-gray-500">Sent</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {outgoing.map((f) => {
              const other = usersById.get(f.friend_id);
              return (
                <li
                  key={f.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500"
                >
                  <span>{other?.name ?? other?.email ?? "Someone"}</span>
                  <span className="text-xs">Pending</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-gray-500">Your friends</h2>
        {accepted.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            No friends yet — add one by email above.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {accepted.map((f) => {
              const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
              const other = usersById.get(otherId);
              return (
                <li key={f.id}>
                  <Link
                    href={`/friends/${otherId}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm hover:border-gray-400"
                  >
                    <span>{other?.name ?? other?.email ?? "Someone"}</span>
                    <span className="text-xs text-gray-400">
                      View rankings →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
