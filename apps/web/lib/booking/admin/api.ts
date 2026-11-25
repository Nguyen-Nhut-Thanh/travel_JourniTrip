import { requestWithToken } from "@/lib/http/requestWithToken";
import type { AdminBookingFilters, AdminBookingTourListResponse } from "shared";

export function getAdminBookingList<T>(page: number, limit = 10, filters: AdminBookingFilters = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) if (value && value !== "all") query.set(key, value);
  return requestWithToken<T>(
    `/bookings/admin/list?${query}`,
  );
}

export function getAdminBookingDetail<T>(bookingId: number) {
  return requestWithToken<T>(`/bookings/admin/${bookingId}`);
}

export function getAdminBookingTours(page: number, limit = 10, filters: AdminBookingFilters = {}) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  for (const [key, value] of Object.entries(filters)) if (value && value !== "all") query.set(key, value);
  return requestWithToken<AdminBookingTourListResponse>(`/bookings/admin/tours?${query}`);
}

export function runAdminBookingAction<T>(
  bookingId: number,
  action: "approve-cancel" | "reject-cancel",
  payload: Record<string, unknown>,
) {
  return requestWithToken<T>(`/bookings/admin/${bookingId}/${action}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function cancelPendingBooking<T = unknown>(bookingId: number, reason?: string) {
  return requestWithToken<T>(`/bookings/admin/${bookingId}/cancel-pending`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ reason }),
  });
}

export interface AdminCancelBookingPayload {
  reason?: string;
  refundAmount?: number;
  note?: string;
  cancelType?: "operator_fault" | "customer_request";
  resolutionOption?: "full_refund" | "reschedule";
  allowedOptions?: ("full_refund" | "reschedule")[];
  newScheduleId?: number;
  waiveDifference?: boolean;
  pickupPointId?: number;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export function adminCancelBooking<T = unknown>(
  bookingId: number,
  payload: AdminCancelBookingPayload,
) {
  return requestWithToken<T>(`/bookings/admin/${bookingId}/cancel-booking`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function confirmRefundTransfer<T = unknown>(
  bookingId: number,
  payload: {
    transactionCode?: string;
    note?: string;
    amount?: number;
    refundId?: string;
  },
) {
  return requestWithToken<T>(`/bookings/admin/${bookingId}/confirm-refund-transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export function confirmBookingCollection(id: number, payload: { proposalId: string; amount: number; transactionCode: string }) {
  return requestWithToken(`/bookings/admin/${id}/confirm-collection`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function cancelBookingDeparture(id: number, reason: string) {
  return requestWithToken<{ affected: number }>(`/bookings/admin/departures/${id}/cancel`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
}

export function recordBookingIncident(id: number, payload: { kind: string; reference: string; reason: string; amount: number }) {
  return requestWithToken(`/bookings/admin/${id}/incident`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function reconcileBookingPayment(id: number, payload: { paymentId: number; reason: string }) {
  return requestWithToken(`/bookings/admin/${id}/reconcile-review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}

export function beginBookingRefund(id: number, payload: { refundId: string; release?: boolean; note?: string }) {
  return requestWithToken(`/bookings/admin/${id}/refund-processing`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
}
