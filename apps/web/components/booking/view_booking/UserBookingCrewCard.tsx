import { Mail, Phone, UsersRound } from "lucide-react";
import { CREW_ROLES, type BookingDetail } from "shared";

export function BookingCrewCard({ booking }: { booking: BookingDetail }) {
  if (!["paid", "completed"].includes(booking.status)) return null;
  const snapshot = booking.tour_schedules?.crew_snapshot;

  return (
    <section className="rounded-[14px] border border-[#e1edfc] bg-white p-4 shadow-sm space-y-3 min-w-0" aria-label="Người phụ trách chuyến đi">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#edf2fb]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#075bff]">
            <UsersRound size={20} />
          </div>
          <div>
            <h2 className="text-[16px] font-[750] leading-[1.5] text-[#0b1747]">
              Người phụ trách chuyến đi
            </h2>
            <p className="text-[12px] leading-[1.5] text-[#7387aa]">
              Đội ngũ hướng dẫn viên & điều hành đồng hành cùng chuyến đi
            </p>
          </div>
        </div>
        {snapshot && (
          <span className="text-[11px] font-medium text-slate-400">
            Cập nhật{" "}
            {new Date(snapshot.published_at).toLocaleString("vi-VN", {
              timeZone: "Asia/Bangkok",
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </header>

      {!snapshot ? (
        <p className="text-xs leading-5 text-slate-500">
          Đội ngũ phụ trách đang được hoàn tất. Bạn sẽ nhận thông báo khi danh
          sách được xác nhận.
        </p>
      ) : (
        <>
          {!booking.tour_schedules?.crew_locked_at && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-700 border border-amber-200">
              Danh sách đang được cập nhật. Bên dưới là thông tin đã công bố gần
              nhất; thông báo mới sẽ được gửi sau khi xác nhận thay đổi.
            </p>
          )}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {snapshot.members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-start gap-3 rounded-xl border border-[#edf2fb] bg-slate-50/70 p-3 hover:bg-slate-50 hover:border-blue-100 transition-colors"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#075bff] border border-blue-100">
                  {member.full_name
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((word) => word[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#0b1747] text-[13px]">
                    {member.full_name}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {member.roles
                      .map((role) => CREW_ROLES[role])
                      .join(" kiêm ")}
                  </p>
                  <div className="mt-2 flex flex-col gap-1 text-xs">
                    {member.phone ? (
                      <a
                        href={`tel:${member.phone.replace(/[^\d+]/g, "")}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#075bff] hover:underline"
                        title="Gọi điện"
                      >
                        <Phone size={13} className="shrink-0 text-[#075bff]" />
                        <span>{member.phone}</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Phone size={13} className="shrink-0 text-slate-300" />
                        <span>Chưa cập nhật SĐT</span>
                      </span>
                    )}

                    {member.email ? (
                      <a
                        href={`mailto:${member.email}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[#075bff] hover:underline truncate"
                        title="Gửi email"
                      >
                        <Mail size={13} className="shrink-0 text-[#075bff]" />
                        <span className="truncate">{member.email}</span>
                      </a>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-400">
                        <Mail size={13} className="shrink-0 text-slate-300" />
                        <span>Chưa cập nhật email</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
