"use client";

import { useState } from "react";
import CourseSearch from "@/components/course-search";
import type { Course } from "@/lib/queries";
import type { WantToPlayEntry } from "@/lib/queries";

export default function WantToPlayClient({
  initialEntries,
}: {
  initialEntries: WantToPlayEntry[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function add(course: Course) {
    if (entries.some((e) => e.course.id === course.id)) return;
    setAdding(course.id);
    setError(null);
    try {
      const res = await fetch("/api/want-to-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      setEntries((prev) => [{ id: crypto.randomUUID(), course }, ...prev]);
    } finally {
      setAdding(null);
    }
  }

  async function remove(entryId: string, courseId: string) {
    setRemoving(entryId);
    try {
      await fetch(`/api/want-to-play/${courseId}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <ul className="mt-4 flex flex-col gap-2">
        {entries.length === 0 && (
          <p className="text-sm text-gray-500">Nothing saved yet.</p>
        )}
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm"
          >
            <span>
              <span className="font-medium">{entry.course.name}</span>
              {(entry.course.city || entry.course.state) && (
                <span className="ml-1 text-gray-500">
                  {[entry.course.city, entry.course.state]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              )}
            </span>
            <button
              disabled={removing === entry.id}
              onClick={() => remove(entry.id, entry.course.id)}
              className="text-xs text-gray-400 underline disabled:opacity-50"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 border-t border-gray-200 pt-4">
        <h2 className="text-sm font-semibold text-gray-500">Add a course</h2>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-2">
          <CourseSearch onSelect={add} actionLabel="Save" busyCourseId={adding} />
        </div>
      </div>
    </>
  );
}
