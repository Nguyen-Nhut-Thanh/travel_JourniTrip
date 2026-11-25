import { BookingWorkflow } from "../src/modules/bookings/booking-workflow";
const future = (days: number) => new Date(Date.now() + days * 86400000);

export function bookingFixture(count = 2, total = count * 3000000) {
  let state: any = {
    booking: { booking_id: 1, user_id: 7, status: "paid", tour_schedule_id: 1, adult_count: count, child_count: 0, infant_count: 0,
      adult_unit_price: 3000000, child_unit_price: 0, infant_unit_price: 0, total_amount: total, services_total: 0, discount_amount: count * 3000000 - total,
      cancellation_meta: {}, room_selection: { type: "shared" }, membership_snapshot: {},
      booking_travelers: Array.from({ length: count }, (_, i) => ({ traveler_id: i + 1, traveler_type: "ADULT", full_name: `Khách ${i + 1}` })) },
    schedules: [
      { tour_schedule_id: 1, tour_id: 9, status: 1, start_date: future(10), end_date: future(11), booked_count: count, quota: 20, tours: { status: 1, cut_off_hours: 24, name: "Tour A" } },
      { tour_schedule_id: 2, tour_id: 9, status: 1, start_date: future(20), end_date: future(21), booked_count: 0, quota: 20, price: 4000000, single_room_surcharge: 0,
        tour_schedule_prices: [{ passenger_type: "child", price: 0 }, { passenger_type: "infant", price: 0 }], pickup_points: [], tours: { status: 1, cut_off_hours: 24, name: "Tour A" } },
    ], payments: [{ payment_id: 1, status: "completed", amount: total, booking_id: 1 }], locks: [] as string[], points: [] as any[],
  };
  const hydrated = () => structuredClone({ ...state.booking, payments: state.payments, tour_schedules: state.schedules.find((s: any) => s.tour_schedule_id === state.booking.tour_schedule_id) });
  const apply = (row: any, data: any) => { for (const [key, value] of Object.entries(data)) row[key] = value && typeof value === "object" && "increment" in value ? row[key] + (value as any).increment : value && typeof value === "object" && "decrement" in value ? row[key] - (value as any).decrement : structuredClone(value); return row; };
  const tx: any = {
    $queryRaw: async (strings: any) => { state.locks.push(String(strings)); return []; },
    $executeRaw: async () => 1,
    membership_point_transactions: {
      findMany: async ({ where }: any) => structuredClone(state.points.filter((e: any) => Object.entries(where).every(([k,v]) => e[k] === v))),
      aggregate: async ({ where }: any) => {
        const rows = state.points.filter((e: any) => Object.entries(where).every(([k,v]) => e[k] === v));
        return { _sum: { points: rows.reduce((s: number,e: any) => s + e.points, 0), reserved: rows.reduce((s: number,e: any) => s + (e.reserved || 0), 0) } };
      },
      create: async ({ data }: any) => { if (state.points.some((e: any) => e.event_key === data.event_key)) throw Error('Duplicate points event'); const entry = { transaction_id: state.points.length + 1, reserved: 0, ...data }; state.points.push(entry); return entry; },
      upsert: async ({ where, create }: any) => {
        const existing = state.points.find((e: any) => e.event_key === where.event_key);
        if (existing) return existing;
        const entry = { transaction_id: state.points.length + 1, reserved: 0, ...create }; state.points.push(entry); return entry;
      },
    },
    bookings: {
      findUnique: async () => hydrated(),
      findMany: async () => [hydrated()],
      update: async ({ data }: any) => { apply(state.booking, data); return hydrated(); },
      updateMany: async ({ where, data }: any) => { if (where.status && state.booking.status !== where.status) return { count:0 }; apply(state.booking,data); return { count:1 }; },
    },
    tour_schedules: {
      findUnique: async ({ where }: any) => structuredClone(state.schedules.find((s: any) => s.tour_schedule_id === where.tour_schedule_id) || null),
      update: async ({ where, data }: any) => apply(state.schedules.find((s: any) => s.tour_schedule_id === where.tour_schedule_id), data),
      updateMany: async ({ where, data }: any) => { const row = state.schedules.find((s: any) => s.tour_schedule_id === where.tour_schedule_id && s.booked_count >= (where.booked_count?.gte || 0)); if (!row) return { count: 0 }; apply(row, data); return { count: 1 }; },
    },
    booking_travelers: { findFirst: async () => null, deleteMany: async ({ where }: any) => { state.booking.booking_travelers = state.booking.booking_travelers.filter((t: any) => !where.traveler_id.in.includes(t.traveler_id)); } },
    payments: {
      update: async ({ where, data }: any) => apply(state.payments.find((p: any) => p.payment_id === where.payment_id), data),
      findFirst: async ({ where }: any) => state.payments.find((p: any) => p.method === where.method && p.transaction_code === where.transaction_code),
      create: async ({ data }: any) => { if (state.payments.some((p: any) => p.provider_reference && p.provider_reference === data.provider_reference)) throw new Error("duplicate reference"); const row = { ...data, payment_id: state.payments.length + 1 }; state.payments.push(row); return row; },
      updateMany: async () => ({ count: 0 }),
    },
    vouchers: { updateMany: async () => ({ count: 1 }), findMany: async () => [] }, schedule_promotions: { updateMany: async () => ({ count: 1 }) },
    membership_notifications: { upsert: async () => ({}) },
  };
  let queue = Promise.resolve();
  const prisma: any = { ...tx, $transaction: (fn: any) => {
    const result = queue.then(async () => { const before = structuredClone(state); try { return await fn(tx); } catch (error) { state = before; throw error; } });
    queue = result.then(() => undefined, () => undefined); return result;
  } };
  return { workflow: new BookingWorkflow(prisma), state: () => state, booking: hydrated, prisma };
}
