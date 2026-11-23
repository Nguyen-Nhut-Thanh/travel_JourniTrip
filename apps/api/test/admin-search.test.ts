import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Prisma } from "@prisma/client";
import { sqlSearchText } from "../src/common/search";
import { ToursAdminService } from "../src/modules/tours/tours-admin.service";
import type { PrismaService } from "../src/infrastructure/database/prisma.service";
import { BookingsAdminService } from "../src/modules/bookings/bookings-admin.service";
import type { BookingsService } from "../src/modules/bookings/bookings.service";
import type { MailService } from "../src/infrastructure/mail/mail.service";
import { ToursPublicService } from "../src/modules/tours/tours-public.service";

test("SQL search binds and escapes user input instead of treating wildcard characters as patterns", () => {
  const query = sqlSearchText(Prisma.sql`name`, "ĐÀ 100% a_b \\ 'OR' 1=1");
  assert.ok(query.text.includes("translate(lower(name)"));
  assert.ok(!query.text.includes("100%"));
  assert.ok(query.values.includes("(^|[^a-z0-9])da"));
  assert.ok(String(query.values[2]).includes("100\\%"));
  assert.ok(String(query.values[2]).includes("a\\_b"));
  assert.ok(String(query.values[2]).includes("\\\\"));
  assert.equal(sqlSearchText(Prisma.sql`name`, " ").text, "TRUE");
});

test("admin tour API returns child codes and can search children without loading tour details", async () => {
  let calls = 0;
  const prisma = { tours: { findMany: async (query: { where: unknown; select: { tour_schedules: { select: { code: boolean } } } }) => {
    calls++;
    assert.deepEqual(query.where, { status: 1 });
    assert.equal(query.select.tour_schedules.select.code, true);
    return [{ tour_id: 1, name: "Đà Nẵng", code: "DN", status: 1, tour_destinations: [], tour_schedules: [
      { tour_schedule_id: 987, code: "DN-987", _count: { bookings: 2 } }, { tour_schedule_id: 988, code: null, _count: { bookings: 3 } },
    ] }];
  } } } as unknown as PrismaService;
  const service = new ToursAdminService(prisma);
  const result = await service.list({ status: "1", search: "da nang dn-987" });
  assert.equal(calls, 1);
  assert.equal(result.items.length, 1);
  assert.deepEqual(result.items[0].schedule_summaries, [{ tour_schedule_id: 987, code: "DN-987" }, { tour_schedule_id: 988, code: null }]);
  assert.equal(result.items[0].booked_count, 5);
  assert.equal((await service.list({ status: "1", search: "does not exist" })).items.length, 0);
});

test("booking text search applies matched IDs before pagination and preserves other filters", async () => {
  const captured: Record<string, unknown>[] = [];
  const prisma = {
    $queryRaw: async (query: Prisma.Sql) => {
      assert.ok(query.text.includes("LEFT JOIN tour_schedules"));
      assert.ok(query.values.includes("%nui cam%"));
      return [{ booking_id: 42 }, { booking_id: 62 }];
    },
    bookings: {
      findMany: async (query: Record<string, unknown>) => { captured.push(query); return [{ booking_id: 62 }]; },
      count: async (query: Record<string, unknown>) => { captured.push(query); return 12; },
      groupBy: async () => [{ status: "paid", _count: { _all: 12 } }],
    },
  } as unknown as PrismaService;
  const bookings = { cancelExpiredPendingBookings: async () => {} } as unknown as BookingsService;
  const service = new BookingsAdminService(prisma, {} as MailService, bookings);
  const result = await service.listAdminBookings(true, 2, 10, { search: "núi cấm", status: "paid", tourId: "5" });
  assert.deepEqual(captured[0].where, { booking_id: { in: [42, 62] }, status: "paid", tour_schedules: { tour_id: 5 } });
  assert.equal(captured[0].skip, 10);
  assert.deepEqual(captured[0].where, captured[1].where);
  assert.equal(result.totalPages, 2);
  assert.deepEqual(result.items, [{ booking_id: 62 }]);
});

test("tour pickers keep normalized search constraints alongside destination and pagination", async () => {
  const captured: { where: Prisma.toursWhereInput; skip?: number }[] = [];
  const prisma = {
    $queryRaw: async () => [{ tour_id: 7 }],
    tours: {
      count: async (query: { where: Prisma.toursWhereInput }) => { captured.push(query); return 0; },
      findMany: async (query: { where: Prisma.toursWhereInput; skip: number }) => { captured.push(query); return []; },
    },
  } as unknown as PrismaService;
  const result = await new ToursPublicService(prisma).publicList({ search: "da nang", destination: "Hội An", take: "8", skip: "8" });
  assert.equal(result.items.length, 0);
  assert.equal(captured[1].skip, 8);
  assert.deepEqual(captured[0].where, captured[1].where);
  assert.deepEqual((captured[0].where.AND as Prisma.toursWhereInput[])[0], { tour_id: { in: [7] } });
  assert.equal((captured[0].where.AND as Prisma.toursWhereInput[]).length, 2);
});
