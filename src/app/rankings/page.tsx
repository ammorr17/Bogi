import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRankedCoursesForUser } from "@/lib/queries";
import RankedList from "@/components/ranked-list";

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ranked = await getRankedCoursesForUser(supabase, user.id);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">My rankings</h1>
        <Link
          href="/courses/add"
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          + Add course
        </Link>
      </div>

      {params.added && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
          Added to your rankings.
        </p>
      )}

      {ranked.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          You haven&apos;t added any courses yet.{" "}
          <Link href="/courses/add" className="underline">
            Add your first one
          </Link>
          .
        </p>
      ) : (
        <RankedList entries={ranked} className="mt-4" />
      )}
    </main>
  );
}
