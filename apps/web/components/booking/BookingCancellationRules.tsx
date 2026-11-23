import { DEFAULT_CANCELLATION_TIERS } from "shared";

export function BookingCancellationRules() {
  return <div className="space-y-3 text-sm text-slate-700">
    <p>Phí hủy được tính theo thời gian thực từ lúc hệ thống nhận yêu cầu hủy đến giờ khởi hành. Đặt tour sát ngày rồi hủy ngay vẫn có thể phát sinh phí.</p>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs">
      <thead><tr className="border-b"><th className="p-2">Thời gian trước khởi hành</th><th className="p-2">Phí hủy</th><th className="p-2">Hoàn dự kiến</th></tr></thead>
      <tbody>{DEFAULT_CANCELLATION_TIERS.map(tier => <tr key={tier.id} className="border-b"><td className="p-2">{tier.title}</td><td className="p-2">{tier.penaltyPercent}%</td><td className="p-2">{tier.refundPercent}%</td></tr>)}</tbody>
    </table></div>
    <p>Hủy một phần tính trên giá vé thực trả của hành khách được hủy; phòng và dịch vụ dùng chung còn giữ cho đoàn được thể hiện riêng khi xác nhận.</p>
    <p>Nếu công ty không thể tổ chức chuyến đi, khách được chọn hoàn tiền hoặc thỏa thuận đổi lịch cùng tour. Lịch mới có giá cao hơn thì nộp thêm; giá thấp hơn thì công ty hoàn chênh lệch.</p>
  </div>;
}
