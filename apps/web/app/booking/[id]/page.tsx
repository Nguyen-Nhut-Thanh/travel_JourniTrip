"use client";

import { BookingDetailView } from "@/components/booking/view_booking/UserBookingDetailView";
import { getBookingDetail } from "@/lib/booking/client/api";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { BookingDetail } from "shared";

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setBooking(null);
    if (!Number.isSafeInteger(id) || id <= 0) {
      setError("Mã booking không hợp lệ.");
      setLoading(false);
      return;
    }
    getBookingDetail(id, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          if (data) setBooking(data);
          else
            setError(
              "Không tìm thấy booking hoặc bạn không có quyền xem đơn này.",
            );
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Không thể tải booking.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id, attempt]);

  if (loading || error || !booking)
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-blue-50 px-5">
        <div
          role={error ? "alert" : "status"}
          className="max-w-md w-full rounded-[14px] border border-[#e1edfc] bg-white p-8 text-center shadow-sm"
        >
          {loading ? (
            <>
              <Loader2
                className="mx-auto mb-4 animate-spin text-[#075bff]"
                size={36}
              />
              <p className="text-sm font-semibold text-slate-700">Đang tải chi tiết booking...</p>
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto mb-4 text-rose-500" size={36} />
              <h1 className="text-lg font-bold text-[#07123e]">Chưa thể hiển thị booking</h1>
              <p className="my-3 text-xs leading-relaxed text-slate-500">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="mb-4 inline-flex items-center justify-center rounded-[12px] bg-[#075bff] px-5 py-2 text-xs font-[650] text-white hover:bg-[#064ddd] transition-colors shadow-xs cursor-pointer"
              >
                Thử lại
              </button>
              <div>
                <Link
                  href="/account/bookings"
                  className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-[#075bff] hover:underline"
                >
                  <ArrowLeft size={15} />
                  Lịch sử đặt tour
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );

  return <BookingDetailView booking={booking} />;
}
