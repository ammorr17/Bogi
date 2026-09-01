import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <Link href="/rankings" className="text-sm font-bold">
          Bogi
        </Link>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <Link href="/rankings" className="hover:text-gray-900">
            Rankings
          </Link>
          <Link href="/want-to-play" className="hover:text-gray-900">
            Want to play
          </Link>
          <Link href="/friends" className="hover:text-gray-900">
            Friends
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="hover:text-gray-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
