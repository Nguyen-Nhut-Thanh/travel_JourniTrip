import { requestAdminJson } from "@/lib/http/requestAdminJson";
import type { MembershipAdminList, MembershipSummary, MembershipTier, MembershipRewardItem } from "shared";

export function getAdminMembership(page = 1, search = "", tier = "all", limit = 20) {
  const query = new URLSearchParams({ page: String(page), search, tier, limit: String(limit) });
  return requestAdminJson<MembershipAdminList>(
    `/admin/membership?${query}`,
    { method: "GET", cache: "no-store" },
    "Không thể tải hạng thành viên.",
  );
}
export function getMemberDetails(userId: number) {
  return requestAdminJson<MembershipSummary>(`/admin/membership/customers/${userId}`, { method: "GET", cache: "no-store" }, "Không thể tải chi tiết thành viên.");
}
export function saveMembershipSettings(tiers: MembershipTier[], version: number) {
  return requestAdminJson<MembershipTier[]>(
    "/admin/membership/settings",
    { method: "PATCH", body: JSON.stringify({ tiers, version }) },
    "Không thể lưu cấu hình hạng thành viên.",
  );
}
export function adjustMembershipPoints(userId: number, points: number, reason: string, requestId: string) {
  return requestAdminJson<MembershipSummary>(`/admin/membership/customers/${userId}/points`, { method: 'POST', body: JSON.stringify({ points, reason, requestId }) }, 'Không thể điều chỉnh điểm.');
}
export function createMembershipReward(reward: Omit<MembershipRewardItem, 'id' | 'imageUrl' | 'category'>, requestId: string) {
  return requestAdminJson<MembershipRewardItem>('/admin/membership/rewards', { method: 'POST', body: JSON.stringify({ reward, requestId }) }, 'Không thể thêm voucher đổi điểm.');
}
