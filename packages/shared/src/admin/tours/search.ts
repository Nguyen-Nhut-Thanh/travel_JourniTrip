import type { TourLike } from "./models";
import { matchesSearchText, normalizeSearchText } from "../../search/text";

export function getMatchingTourSchedules(tour: TourLike, query: string) {
  if (!normalizeSearchText(query)) return [];
  // A match on the tour itself does not need a list of every child schedule.
  if (matchesSearchText(query, tour.name, tour.code, tour.summary)) return [];
  return (tour.schedule_summaries ?? []).filter(schedule => matchesSearchText(query,
    tour.name, tour.code, tour.summary, schedule.code, `#${schedule.tour_schedule_id}`));
}

export function matchesAdminTourSearch(tour: TourLike, query: string) {
  return matchesSearchText(query, tour.name, tour.code, tour.summary)
    || getMatchingTourSchedules(tour, query).length > 0;
}
