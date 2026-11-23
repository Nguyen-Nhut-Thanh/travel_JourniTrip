export type BookingBankAccount = { bankName: string; bankAccountNumber: string; bankAccountName: string };
export type BookingRefund = {
  id: string; amount: number; reason: "cancellation" | "reschedule" | "partial_cancellation" | "service_adjustment";
  status: "pending" | "processing" | "completed"; createdAt: string; bank?: BookingBankAccount;
  transferredAt?: string; transactionCode?: string; note?: string;
};

export function normalizeBookingBank(value: any): BookingBankAccount {
  const bankName = String(value?.bankName ?? "").trim();
  const bankAccountNumber = String(value?.bankAccountNumber ?? "").trim();
  const bankAccountName = String(value?.bankAccountName ?? "").trim().toUpperCase();
  if (bankName.length < 2 || bankName.length > 100 || !/^[0-9]{4,30}$/.test(bankAccountNumber) || bankAccountName.length < 2 || bankAccountName.length > 150) {
    throw new Error("Vui lòng nhập ngân hàng, số tài khoản (4–30 chữ số) và tên chủ tài khoản hợp lệ.");
  }
  return { bankName, bankAccountNumber, bankAccountName };
}

export function bookingFunds(payments: { status?: string | null; amount?: unknown }[]) {
  let collected = 0, refunded = 0;
  for (const payment of payments) {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount) || amount < 0) throw new Error("Dữ liệu giao dịch không hợp lệ; cần đối soát.");
    if (["completed", "success", "paid"].includes(payment.status || "")) collected += amount;
    if (payment.status === "refunded") refunded += amount;
  }
  return { collected, refunded, available: Math.max(0, Math.round(collected - refunded)) };
}

/** Read legacy pending refunds without inventing an amount or reopening completed refunds. */
export function bookingRefunds(booking: any): BookingRefund[] {
  const m = booking.cancellation_meta || {};
  if (Array.isArray(m.refunds)) return m.refunds;
  if (bookingFunds(booking.payments || []).refunded || m.resolutionProposal?.refundTransfer || m.refundTransfer) return [];
  const p = m.resolutionProposal;
  const differenceRefund = booking.status === "paid" && p?.status === "accepted_reschedule" && p.priceDifference < 0;
  if (!["cancelled", "refund_pending"].includes(booking.status) && !differenceRefund) return [];
  const raw = differenceRefund ? -p.priceDifference : p?.refundAmount ?? m.adminApproval?.refundAmount ?? m.refundAmount;
  const amount = typeof raw === "number" ? raw : Number(String(raw || "").replace(/[^0-9]/g, ""));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > bookingFunds(booking.payments || []).available) return [];
  const candidate = p?.customerBankInfo || m.customerBankInfo || m.cancelRequest || (p?.customerDecision?.bankAccount ? { bankName: p.customerDecision.bankAccount.bankName, bankAccountNumber: p.customerDecision.bankAccount.accountNumber, bankAccountName: p.customerDecision.bankAccount.accountHolder } : null);
  let recipient: BookingBankAccount | undefined;
  try { recipient = normalizeBookingBank(candidate); } catch { /* Customer can supply the missing account. */ }
  return [{ id: `legacy-${booking.booking_id}`, amount, reason: differenceRefund ? "reschedule" : "cancellation", status: "pending", createdAt: m.cancelledAt || booking.created_at || new Date(0).toISOString(), ...(recipient ? { bank: recipient } : {}) }];
}

/** Exact integer allocation, preserving the sum even when discounts do not divide evenly. */
export function allocateBookingAmount(total: number, weights: number[]) {
  if (!Number.isSafeInteger(total) || total < 0 || weights.some(w => !Number.isFinite(w) || w < 0)) throw new Error("Giá phân bổ không hợp lệ.");
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!weights.length) return [];
  const normalized = sum ? weights : weights.map(() => 1);
  const denominator = sum || weights.length;
  const amounts = normalized.map(w => Math.floor(total * w / denominator));
  const order = normalized.map((w, i) => ({ i, remainder: total * w / denominator - amounts[i] })).sort((a, b) => b.remainder - a.remainder || a.i - b.i);
  for (let left = total - amounts.reduce((a, b) => a + b, 0), i = 0; left > 0; left--, i++) amounts[order[i % order.length].i]++;
  return amounts;
}

export function cancellationPortion(booking: any, travelerIds?: number[]) {
  const travelers: any[] = booking.booking_travelers || [];
  const total = Math.round(Number(booking.total_amount));
  if (!travelerIds?.length) return { partial: false, amount: total, travelers, remaining: [] as any[] };
  if (new Set(travelerIds).size !== travelerIds.length || travelerIds.some(id => !Number.isSafeInteger(id))) throw new Error("Danh sách hành khách không hợp lệ.");
  const selected = travelers.filter(t => travelerIds.includes(t.traveler_id));
  if (selected.length !== travelerIds.length) throw new Error("Hành khách không thuộc booking hoặc đã được hủy.");
  const remaining = travelers.filter(t => !travelerIds.includes(t.traveler_id));
  if (!remaining.length) return { partial: false, amount: total, travelers, remaining };
  if (!remaining.some(t => t.traveler_type.toLowerCase() === "adult")) throw new Error("Đoàn còn lại phải có ít nhất một người lớn.");
  const weights = travelers.map(t => Number(booking[`${t.traveler_type.toLowerCase()}_unit_price`]) || 0);
  const gross = weights.reduce((a, b) => a + b, 0);
  const serviceDiscount = Number(booking.membership_snapshot?.serviceDiscount) || 0;
  const netTickets = Math.max(0, Math.min(total, Math.round(gross - Math.max(0, Number(booking.discount_amount) - serviceDiscount))));
  const allocations = allocateBookingAmount(netTickets, weights);
  const amount = travelers.reduce((sum, t, i) => sum + (travelerIds.includes(t.traveler_id) ? allocations[i] : 0), 0);
  return { partial: true, amount, travelers: selected, remaining };
}
