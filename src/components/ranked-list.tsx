import type { RankedCourse } from "@/lib/queries";
import type { Sentiment } from "@/lib/database.types";

const SENTIMENT_DOT: Record<Sentiment, string> = {
  positive: "bg-green-500",
  neutral: "bg-gray-400",
  negative: "bg-red-500",
};

export default function RankedList({
  entries,
  className,
}: {
  entries: RankedCourse[];
  className?: string;
}) {
  return (
    <ol className={className}>
      {entries.map(({ rank, course, datePlayed, sentiment }) => (
        <li
          key={course.id}
          className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0"
        >
          <span className="w-7 shrink-0 text-right text-sm font-semibold text-gray-400">
            {rank}
          </span>
          <span
            title={sentiment}
            className={`h-2 w-2 shrink-0 rounded-full ${SENTIMENT_DOT[sentiment]}`}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{course.name}</p>
            <p className="truncate text-xs text-gray-500">
              {[course.city, course.state].filter(Boolean).join(", ")}
              {datePlayed ? ` · played ${datePlayed}` : ""}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
