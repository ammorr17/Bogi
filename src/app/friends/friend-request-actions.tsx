"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FriendRequestActions({
  otherId,
  incoming,
}: {
  otherId: string;
  incoming: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    await fetch(`/api/friends/${otherId}/accept`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    await fetch(`/api/friends/${otherId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {incoming && (
        <button
          disabled={busy}
          onClick={accept}
          className="rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          Accept
        </button>
      )}
      <button
        disabled={busy}
        onClick={remove}
        className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-50"
      >
        {incoming ? "Decline" : "Remove"}
      </button>
    </div>
  );
}
