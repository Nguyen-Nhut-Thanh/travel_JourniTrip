import { matchesSearchText } from "shared";
import { applyDiscount, type FlashDealSchedule } from 'shared';

export type FlashDealFilters = { search: string; status: string; departure: string; destination: string };
export const DEFAULT_FLASH_DEAL_FILTERS: FlashDealFilters = { search: '', status: 'all', departure: 'all', destination: 'all' };
export function groupFlashDealSchedules(items: FlashDealSchedule[]) {
  const groups = new Map<string, { key: string; tour: FlashDealSchedule['tours']; schedules: FlashDealSchedule[] }>();
  for (const schedule of items) {
    const tourId = schedule.tours?.tour_id ?? schedule.tour_id;
    const key = tourId != null ? `tour-${tourId}` : `schedule-${schedule.tour_schedule_id}`;
    const group = groups.get(key);
    if (group) group.schedules.push(schedule);
    else groups.set(key, { key, tour: schedule.tours, schedules: [schedule] });
  }
  return [...groups.values()].map(group => ({
    ...group,
    schedules: [...group.schedules].sort((left, right) => new Date(left.start_date).getTime() - new Date(right.start_date).getTime()),
  }));
}
export function getFlashDealSeats(schedule: FlashDealSchedule) { return Math.max(0, schedule.quota - (schedule.booked_count ?? schedule._count?.bookings ?? 0)); }
export function getManagedScheduleOffer(schedule: FlashDealSchedule) {
  // Show the configured offer in admin, including offers awaiting activation.
  const discount = schedule.flash_deals ?? schedule.schedule_promotions;
  if (!discount) return null;
  return {
    source: schedule.flash_deals ? 'flash_deal' : 'schedule_promotion',
    discountType: discount.discount_type,
    discountValue: Number(discount.discount_value),
    price: applyDiscount(Number(schedule.price), discount.discount_type, Number(discount.discount_value)),
    title: schedule.flash_deals ? 'Flash Deal' : schedule.schedule_promotions?.title || 'Ưu đãi đợt khởi hành',
  };
}
export function getFlashDealStatus(schedule: FlashDealSchedule, now = Date.now()) {
  const deal = schedule.flash_deals;
  if (!deal) {
    const promotion = schedule.schedule_promotions;
    if (!promotion) return { key: 'none', label: 'Chưa có deal' };
    if (new Date(schedule.start_date).getTime() <= now || new Date(promotion.end_date).getTime() <= now) return { key: 'expired', label: 'Đã kết thúc' };
    if (!promotion.is_active || schedule.status === 0 || schedule.tours?.status === 0) return { key: 'paused', label: 'Tạm ẩn' };
    if (getFlashDealSeats(schedule) === 0 || (promotion.max_slots != null && promotion.used_slots >= promotion.max_slots)) return { key: 'soldout', label: 'Đã hết chỗ' };
    return { key: 'promotion', label: 'Có ưu đãi đợt' };
  }
  if (new Date(schedule.start_date).getTime() <= now || (deal.end_date && new Date(deal.end_date).getTime() <= now)) return { key: 'expired', label: 'Đã kết thúc' };
  if (deal.status !== 1 || schedule.status === 0 || schedule.tours?.status === 0) return { key: 'paused', label: 'Tạm ẩn' };
  if (getFlashDealSeats(schedule) === 0) return { key: 'soldout', label: 'Đã hết chỗ' };
  if (new Date(deal.start_date).getTime() > now) return { key: 'scheduled', label: 'Đã có deal' };
  return { key: 'active', label: 'Đang giảm giá' };
}
export function filterManagedFlashDeals(items: FlashDealSchedule[], filters: FlashDealFilters, now = Date.now()) {
  return items.filter(item => {
    const departure = new Date(item.start_date).getTime();
    if (!Number.isFinite(departure) || departure <= now) return false;
    if (!matchesSearchText(filters.search, item.tours?.name, item.tours?.code, item.code, `#${item.tour_schedule_id}`)) return false;
    if (filters.status !== 'all' && getFlashDealStatus(item, now).key !== filters.status) return false;
    if (filters.departure !== 'all' && departure > now + Number(filters.departure) * 86400000) return false;
    return filters.destination === 'all' || !!item.tours?.tour_destinations?.some(destination => String(destination.locations.location_id) === filters.destination);
  });
}
export function filterFlashDealSchedules(
  schedules: FlashDealSchedule[],
  searchTerm: string,
  now = Date.now(),
) {
  return filterManagedFlashDeals(
    schedules,
    { ...DEFAULT_FLASH_DEAL_FILTERS, search: searchTerm },
    now,
  );
}
export function getFlashDealOverview(items: FlashDealSchedule[], now = Date.now()) {
  return items.reduce((totals, item) => {
    const status = getFlashDealStatus(item, now).key;
    if (status === 'active') { totals.active++; totals.seats += getFlashDealSeats(item); }
    if (status === 'scheduled') totals.scheduled++;
    return totals;
  }, { active: 0, scheduled: 0, seats: 0 });
}
