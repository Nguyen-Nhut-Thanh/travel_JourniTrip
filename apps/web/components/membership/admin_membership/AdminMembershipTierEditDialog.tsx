"use client";

import { useState } from "react";
import { Check, Plus, Trash2, X } from "lucide-react";
import type { MembershipTier } from "shared";
import { formatVND } from "@/lib/utils/currency";

export function AdminMembershipTierEditDialog({
  tier,
  onClose,
  onSave,
}: {
  tier: MembershipTier;
  onClose: () => void;
  onSave: (updated: MembershipTier) => void;
}) {
  const [formData, setFormData] = useState<MembershipTier>({
    ...tier,
    benefits: [...(tier.benefits || [])],
  });
  const [newBenefit, setNewBenefit] = useState("");

  const isBronze = tier.id === "bronze";

  const handleAddBenefit = () => {
    if (!newBenefit.trim()) return;
    setFormData((prev) => ({
      ...prev,
      benefits: [...prev.benefits, newBenefit.trim()],
    }));
    setNewBenefit("");
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tier-edit-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-[16px] border border-[#d6e7fb] bg-white p-6 shadow-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#075bff] mb-0.5">
              Cấu hình thông số hạng
            </div>
            <h2
              id="tier-edit-dialog-title"
              className="text-xl font-extrabold text-[#07123e]"
            >
              Chỉnh Sửa Hạng: {tier.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng dialog"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tên Hạng */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tên hiển thị
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-[#075bff] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Ngưỡng chi tiêu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngưỡng chi tiêu kích hoạt
                {isBronze && (
                  <span className="text-[10px] text-slate-400 ml-1 font-normal">
                    (Mặc định 0đ cho hạng Member)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  disabled={isBronze}
                  value={formData.threshold.toLocaleString("vi-VN")}
                  onChange={(e) => {
                    const val = Number(e.target.value.replace(/\D/g, ""));
                    if (Number.isFinite(val)) {
                      setFormData((prev) => ({ ...prev, threshold: val }));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-slate-900 outline-none focus:border-[#075bff] focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  đ
                </span>
              </div>
            </div>

            {/* Giảm giá tour */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giảm giá tour trực tiếp
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={formData.tourDiscountPercent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      tourDiscountPercent: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-slate-900 outline-none focus:border-[#075bff] focus:ring-2 focus:ring-blue-100"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  %
                </span>
              </div>
            </div>

            {/* Hệ số tích điểm */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hệ số tích điểm (Multiplier)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={0.1}
                  value={formData.pointMultiplier}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      pointMultiplier: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-slate-900 outline-none focus:border-[#075bff] focus:ring-2 focus:ring-blue-100"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  × Pts
                </span>
              </div>
            </div>

            {/* Voucher sinh nhật */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Voucher chúc mừng sinh nhật
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.birthdayVoucherAmount.toLocaleString("vi-VN")}
                  onChange={(e) => {
                    const val = Number(e.target.value.replace(/\D/g, ""));
                    if (Number.isFinite(val)) {
                      setFormData((prev) => ({
                        ...prev,
                        birthdayVoucherAmount: val,
                      }));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-slate-900 outline-none focus:border-[#075bff] focus:ring-2 focus:ring-blue-100"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  đ
                </span>
              </div>
            </div>

            {/* Giảm dịch vụ đi kèm */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Giảm giá dịch vụ đi kèm
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.serviceDiscountPercent}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      serviceDiscountPercent: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 pr-8 text-xs font-semibold text-slate-900 outline-none focus:border-[#075bff] focus:ring-2 focus:ring-blue-100"
                />
                <span className="absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-400">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Ưu tiên giữ chỗ */}
          <label className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={formData.priorityReservation}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  priorityReservation: e.target.checked,
                }))
              }
              className="size-4 accent-[#075bff]"
            />
            <div>
              <span className="text-xs font-bold text-slate-800">
                Ưu tiên xử lý giữ chỗ (Priority Reservation)
              </span>
              <p className="text-[11px] text-slate-500">
                Đánh dấu đơn đặt của hội viên hạng này lên đầu danh sách chờ xác nhận.
              </p>
            </div>
          </label>

          {/* Danh sách đặc quyền (Benefits) */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-bold text-slate-800">
              Danh sách quyền lợi tiêu biểu ({formData.benefits.length})
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {formData.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2 text-slate-700 min-w-0">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span className="truncate">{benefit}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveBenefit(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 shrink-0 transition-colors"
                    aria-label={`Xóa quyền lợi ${benefit}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Thêm quyền lợi mới */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Nhập nội dung đặc quyền mới..."
                value={newBenefit}
                onChange={(e) => setNewBenefit(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddBenefit();
                  }
                }}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-[#075bff]"
              />
              <button
                type="button"
                onClick={handleAddBenefit}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors shrink-0"
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#075bff] px-5 py-2 text-xs font-bold text-white hover:bg-[#064ddd] shadow-sm transition-colors cursor-pointer"
            >
              Cập nhật cấu hình
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

