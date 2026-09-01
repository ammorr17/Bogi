"use client";

import { useEffect, useState } from "react";
import type { Course } from "@/lib/queries";

/**
 * Debounced course search + "create new course" form. Calls `onSelect` with
 * either an existing course or a freshly-created one — the caller decides
 * what happens next (add a play, add to want-to-play, etc).
 */
export default function CourseSearch({
  onSelect,
  actionLabel = "Add",
  busyCourseId,
}: {
  onSelect: (course: Course) => void | Promise<void>;
  actionLabel?: string;
  busyCourseId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Course[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCourse, setNewCourse] = useState({
    name: "",
    city: "",
    state: "",
    publicOrPrivate: "unknown" as "public" | "private" | "unknown",
  });

  useEffect(() => {
    if (query.trim().length < 2) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/courses/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.courses ?? []);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  async function createCourse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCourse),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    setShowCreate(false);
    setNewCourse({ name: "", city: "", state: "", publicOrPrivate: "unknown" });
    await onSelect(json.course);
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search courses by name or city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-col gap-2">
        {searching && <p className="text-sm text-gray-400">Searching...</p>}
        {query.trim().length >= 2 && results.map((course) => (
          <button
            key={course.id}
            disabled={busyCourseId === course.id}
            onClick={() => onSelect(course)}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm hover:border-gray-400 disabled:opacity-50"
          >
            <span>
              <span className="font-medium">{course.name}</span>
              {(course.city || course.state) && (
                <span className="ml-1 text-gray-500">
                  {[course.city, course.state].filter(Boolean).join(", ")}
                </span>
              )}
            </span>
            <span className="text-xs text-gray-400">
              {busyCourseId === course.id ? "Adding..." : actionLabel}
            </span>
          </button>
        ))}
      </div>

      {query.trim().length >= 2 && !searching && results.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">
          No matches for &quot;{query}&quot;.
        </p>
      )}

      <div className="mt-6 border-t border-gray-200 pt-4">
        {!showCreate ? (
          <button
            onClick={() => {
              setShowCreate(true);
              setNewCourse((c) => ({ ...c, name: query }));
            }}
            className="text-sm font-medium text-gray-700 underline"
          >
            Can&apos;t find it? Add a new course
          </button>
        ) : (
          <form onSubmit={createCourse} className="flex flex-col gap-2">
            <input
              required
              placeholder="Course name"
              value={newCourse.name}
              onChange={(e) => setNewCourse((c) => ({ ...c, name: e.target.value }))}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
            />
            <div className="flex gap-2">
              <input
                placeholder="City"
                value={newCourse.city}
                onChange={(e) => setNewCourse((c) => ({ ...c, city: e.target.value }))}
                className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
              <input
                placeholder="State"
                value={newCourse.state}
                onChange={(e) => setNewCourse((c) => ({ ...c, state: e.target.value }))}
                className="w-1/2 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
              />
            </div>
            <select
              value={newCourse.publicOrPrivate}
              onChange={(e) =>
                setNewCourse((c) => ({
                  ...c,
                  publicOrPrivate: e.target.value as typeof c.publicOrPrivate,
                }))
              }
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-gray-900 focus:outline-none"
            >
              <option value="unknown">Public or private?</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add course
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
