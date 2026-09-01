"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Course } from "@/lib/queries";

export default function CompareClient({
  newCourse,
  opponent,
  mid,
  lo,
  hi,
  totalToCompare,
}: {
  newCourse: Course;
  opponent: Course;
  mid: number;
  lo: number;
  hi: number;
  totalToCompare: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function choose(newCourseWon: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCourseId: newCourse.id,
          opponentId: opponent.id,
          mid,
          lo,
          hi,
          newCourseWon,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitting(false);
        return;
      }
      if (json.done) {
        router.push("/rankings?added=1");
      } else {
        router.push(
          `/compare?new=${newCourse.id}&lo=${json.lo}&hi=${json.hi}`,
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = hi - lo;
  const progress =
    totalToCompare > 0
      ? Math.round(((totalToCompare - remaining) / totalToCompare) * 100)
      : 100;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-8">
      <p className="text-center text-sm text-gray-500">Which was better?</p>
      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full bg-gray-900 transition-all"
          style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
        />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <CourseButton
          course={newCourse}
          disabled={submitting}
          onClick={() => choose(true)}
        />
        <p className="text-center text-xs font-medium text-gray-400">vs</p>
        <CourseButton
          course={opponent}
          disabled={submitting}
          onClick={() => choose(false)}
        />
      </div>
    </main>
  );
}

function CourseButton({
  course,
  disabled,
  onClick,
}: {
  course: Course;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="rounded-2xl border-2 border-gray-200 px-5 py-6 text-left transition hover:border-gray-900 disabled:opacity-50"
    >
      <p className="text-lg font-semibold">{course.name}</p>
      {(course.city || course.state) && (
        <p className="mt-1 text-sm text-gray-500">
          {[course.city, course.state].filter(Boolean).join(", ")}
        </p>
      )}
    </button>
  );
}
