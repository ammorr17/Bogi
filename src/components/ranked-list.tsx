import type { RankedCourse } from "@/lib/queries";

export default function RankedList({
  entries,
  className,
}: {
  entries: RankedCourse[];
  className?: string;
}) {
  return (
    <ol className={className}>
      {entries.map(({ rank, course, datePlayed }) => (
        <li
          key={course.id}
          className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-0"
        >
          <span className="w-7 shrink-0 text-right text-sm font-semibold text-gray-400">
            {rank}
          </span>
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
