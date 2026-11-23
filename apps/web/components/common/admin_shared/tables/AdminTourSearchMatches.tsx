import Link from "next/link";
import { getMatchingTourSchedules, type TourLike } from "shared";
import { AdminSearchHighlight } from "./AdminSearchHighlight";

export function AdminTourSearchMatches({ tour, query, links = false }: { tour: TourLike; query: string; links?: boolean }) {
  const matches = getMatchingTourSchedules(tour, query);
  if (!matches.length) return null;
  return <span className="mt-1.5 flex flex-wrap gap-1 text-[11px] text-blue-700">
    <span>Khớp lịch trình:</span>
    {matches.slice(0, 3).map(schedule => {
      const label = <AdminSearchHighlight text={schedule.code || `#${schedule.tour_schedule_id}`} query={query} />;
      return links ? <Link key={schedule.tour_schedule_id} className="rounded bg-blue-50 px-1.5 hover:underline" href={`/admin/schedules/${schedule.tour_schedule_id}`}>{label}</Link>
        : <span key={schedule.tour_schedule_id} className="rounded bg-blue-50 px-1.5">{label}</span>;
    })}
    {matches.length > 3 && <span>+{matches.length - 3} lịch trình</span>}
  </span>;
}
