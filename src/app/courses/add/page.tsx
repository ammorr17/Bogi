"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CourseSearch from "@/components/course-search";
import type { Course } from "@/lib/queries";
import type { Sentiment } from "@/lib/database.types";

const SENTIMENT_OPTIONS: { value: Sentiment; label: string; hint: string }[] = [
  { value: "positive", label: "Positive", hint: "I really liked it" },
  { value: "neutral", label: "Neutral", hint: "It was fine" },
  { value: "negative", label: "Negative", hint: "I didn't like it" },
];

export default function AddCoursePage() {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addPlay(course: Course, sentiment: Sentiment) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/plays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, sentiment }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Something went wrong.");
        setSelectedCourse(null);
        return;
      }
      if (json.needsComparison) {
        const { lo, hi } = json.comparisonBounds;
        router.push(`/compare?new=${course.id}&lo=${lo}&hi=${hi}`);
      } else {
        router.push("/rankings?added=1");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (selectedCourse) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <button
          onClick={() => setSelectedCourse(null)}
          className="text-sm text-gray-500 underline"
        >
          ← Back to search
        </button>

        <h1 className="mt-2 text-xl font-bold">{selectedCourse.name}</h1>
        {(selectedCourse.city || selectedCourse.state) && (
          <p className="text-sm text-gray-500">
            {[selectedCourse.city, selectedCourse.state].filter(Boolean).join(", ")}
          </p>
        )}

        <p className="mt-6 text-sm text-gray-500">
          Overall, how was it?
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {SENTIMENT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              disabled={submitting}
              onClick={() => addPlay(selectedCourse, opt.value)}
              className="flex items-center justify-between rounded-xl border-2 border-gray-200 px-4 py-3 text-left transition hover:border-gray-900 disabled:opacity-50"
            >
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.hint}</span>
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-xl font-bold">Add a course you&apos;ve played</h1>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-4">
        <CourseSearch onSelect={setSelectedCourse} />
      </div>
    </main>
  );
}
