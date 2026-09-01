"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CourseSearch from "@/components/course-search";
import type { Course } from "@/lib/queries";

export default function AddCoursePage() {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addPlay(course: Course) {
    setAdding(course.id);
    setError(null);
    try {
      const res = await fetch("/api/plays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        return;
      }
      if (json.needsComparison) {
        const { lo, hi } = json.comparisonBounds;
        router.push(`/compare?new=${course.id}&lo=${lo}&hi=${hi}`);
      } else {
        router.push("/rankings?added=1");
      }
    } finally {
      setAdding(null);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">Add a course you&apos;ve played</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <CourseSearch onSelect={addPlay} busyCourseId={adding} />
      </div>
    </main>
  );
}
