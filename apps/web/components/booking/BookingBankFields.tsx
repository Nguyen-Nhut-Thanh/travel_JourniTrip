"use client";

import { POPULAR_VIETNAMESE_BANKS, type BookingBankAccount } from "shared";
import { useId } from "react";

export const emptyBookingBank: BookingBankAccount = { bankName: "", bankAccountNumber: "", bankAccountName: "" };

export function BookingBankFields({ value, onChange, label, disabled = false, required = true }: {
  value: BookingBankAccount; onChange: (value: BookingBankAccount) => void; label: string; disabled?: boolean; required?: boolean;
}) {
  const banksId = useId();
  return <fieldset disabled={disabled} className="space-y-2 rounded-xl border border-blue-100 bg-white p-3">
    <legend className="px-1 text-sm font-semibold text-slate-800">{label}</legend>
    <label className="block text-xs text-slate-600">Ngân hàng
      <input required={required} maxLength={100} list={banksId} value={value.bankName} onChange={e => onChange({ ...value, bankName: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="VD: Vietcombank" />
    </label>
    <datalist id={banksId}>{POPULAR_VIETNAMESE_BANKS.filter(b => b !== "Khác").map(b => <option key={b} value={b} />)}</datalist>
    <label className="block text-xs text-slate-600">Số tài khoản
      <input required={required} inputMode="numeric" pattern="[0-9]{4,30}" minLength={4} maxLength={30} value={value.bankAccountNumber} onChange={e => onChange({ ...value, bankAccountNumber: e.target.value.replace(/\D/g, "") })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" />
    </label>
    <label className="block text-xs text-slate-600">Tên chủ tài khoản
      <input required={required} minLength={2} maxLength={150} value={value.bankAccountName} onChange={e => onChange({ ...value, bankAccountName: e.target.value.toUpperCase() })} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Tên chủ tài khoản nhận chuyển khoản" />
    </label>
  </fieldset>;
}
