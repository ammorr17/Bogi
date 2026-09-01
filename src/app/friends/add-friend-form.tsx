"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AddFriendForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    setStatus("idle");
    if (!res.ok) {
      setMessage(json.error ?? "Something went wrong.");
      return;
    }
    setEmail("");
    setMessage(
      json.status === "accepted" ? "You're now friends!" : "Request sent.",
    );
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        type="email"
        required
        placeholder="Friend's email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Add
      </button>
      {message && <p className="w-full text-xs text-gray-500">{message}</p>}
    </form>
  );
}
