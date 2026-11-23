import { matchesSearchText } from "shared";
import type { WorkforceSchedule } from 'shared';

export type WorkforceTripStatus = 'upcoming' | 'ongoing' | 'completed';
export type WorkforceTripFilter = WorkforceTripStatus | 'all';

export type WorkforceTripTourGroup = {
  key: string;
  tour: WorkforceSchedule['tours'];
  schedules: WorkforceSchedule[];
};

/** Group filtered trips without changing the active trip order. */
export function groupWorkforceTripsByTour(schedules: WorkforceSchedule[]): WorkforceTripTourGroup[] {
  const groups = new Map<string, WorkforceTripTourGroup>();
  for (const schedule of schedules) {
    const tourId = schedule.tours.tour_id ?? schedule.tour_id;
    const key = tourId != null ? `tour-${tourId}` : `schedule-${schedule.tour_schedule_id}`;
    const group = groups.get(key);
    if (group) group.schedules.push(schedule);
    else groups.set(key, { key, tour: schedule.tours, schedules: [schedule] });
  }
  return [...groups.values()];
}

export const WORKFORCE_TRIP_STATUSES = {
  upcoming: { label: 'Sắp khởi hành', className: 'bg-blue-50 text-blue-700' },
  ongoing: { label: 'Đang diễn ra', className: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Đã kết thúc', className: 'bg-slate-100 text-slate-600' },
} as const;

export function getWorkforceTripStatus(
  schedule: Pick<WorkforceSchedule, 'start_date' | 'end_date'>,
  now = Date.now(),
): WorkforceTripStatus {
  if (Date.parse(schedule.end_date) <= now) return 'completed';
  if (Date.parse(schedule.start_date) <= now) return 'ongoing';
  return 'upcoming';
}

/** Lọc trước khi phân trang; ưu tiên chuyến đang đi, sắp đi rồi lịch sử gần nhất. */
export function filterWorkforceTrips(schedules: WorkforceSchedule[], filters: {
  status: WorkforceTripFilter;
  search: string;
  missingCrew: boolean;
  userId?: number;
}, now = Date.now()) {
  const rank = { ongoing: 0, upcoming: 1, completed: 2 };
  return schedules.filter(schedule =>
    (filters.status === 'all' || getWorkforceTripStatus(schedule, now) === filters.status)
    && (!filters.missingCrew || !schedule.crew_ready)
    && (filters.userId === undefined || schedule.crew.some(member => member.user_id === filters.userId))
    && matchesSearchText(filters.search, schedule.tours.name, schedule.tours.code, schedule.code, `#${schedule.tour_schedule_id}`, schedule.departure_location.name),
  ).sort((a, b) => {
    const statusA = getWorkforceTripStatus(a, now);
    const statusB = getWorkforceTripStatus(b, now);
    const order = rank[statusA] - rank[statusB];
    if (order) return order;
    const dateOrder = statusA === 'completed'
      ? Date.parse(b.end_date) - Date.parse(a.end_date)
      : Date.parse(a.start_date) - Date.parse(b.start_date);
    return dateOrder || a.tour_schedule_id - b.tour_schedule_id;
  });
}
