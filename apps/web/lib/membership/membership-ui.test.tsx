import React from 'react';
import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MEMBERSHIP_TIERS, type MembershipSummary } from 'shared';
import { UserMembershipTierGrid } from '@/components/membership/customer_membership/UserMembershipTierGrid';
import { UserMembershipComparisonTable } from '@/components/membership/customer_membership/UserMembershipComparisonTable';
import { UserMembershipPointsSimulator } from '@/components/membership/customer_membership/UserMembershipPointsSimulator';
import { UserMembershipCard3D } from '@/components/membership/customer_membership/UserMembershipCard3D';
import { MembershipTierPreview } from '@/components/membership/admin_membership/AdminMembershipTierPreview';
import { MembershipPointHistory } from '@/components/membership/MembershipPointHistory';
import { UserBookingPointsPayment } from '@/components/booking/create_booking/UserBookingPointsPayment';
import { AdminMembershipLuxuryConsole } from '@/components/membership/admin_membership/AdminMembershipLuxuryConsole';
import { AdminMembershipRewardDialog } from '@/components/membership/admin_membership/AdminMembershipRewardDialog';
Object.assign(globalThis, { React });
test('admin retains the original dark luxury header and all six navigation tabs', () => {
  const html = renderToStaticMarkup(<AdminMembershipLuxuryConsole />);
  assert.match(html,/bg-\[#0B0F17\]/);
  for (const label of ['ADMIN PORTAL','Tổng Quan','Cấu Hình 5 Hạng Thẻ','Kho Quà Đổi Điểm','Ma Trận Quyền Lợi','Sổ Điểm Hội Viên','Quy Định']) assert.ok(html.includes(label),label);
  assert.match(html,/card-gold/);
  assert.match(html,/Lưu thay đổi/); assert.match(html,/Thêm voucher đổi điểm/);
  assert.doesNotMatch(html,/Xuất Bản Cấu Hình/);
  assert.doesNotMatch(html,/4\.820\.500|186,4 Tỷ/);
});
test('admin reward form exposes the actual voucher conditions before saving', () => {
  const html = renderToStaticMarkup(<AdminMembershipRewardDialog onClose={()=>{}} onCreated={()=>{}} />);
  for (const label of ['Tên voucher','Điểm cần đổi','Giá trị giảm','Đơn tối thiểu','Hạn dùng','Mô tả']) assert.ok(html.includes(label),label);
  assert.match(html,/max="365"/);
});

const tiers = structuredClone(MEMBERSHIP_TIERS);
tiers[1] = { ...tiers[1], pointMultiplier: 1.8, tourDiscountPercent: 9, birthdayVoucherAmount: 123000, discountValue: 135000 };
test('user tier cards and admin preview render the same configured benefits without unimplemented perks', () => {
  const user = renderToStaticMarkup(<UserMembershipTierGrid tiers={tiers} currentTierId="silver" onPreviewTier={() => {}} />);
  const admin = renderToStaticMarkup(<MembershipTierPreview tier={tiers[1]} />);
  for (const html of [user,admin]) {
    assert.match(html,/Giảm 9% giá tour/); assert.match(html,/1,8/); assert.match(html,/123\.000/); assert.match(html,/135\.000/);
    assert.doesNotMatch(html,/Trip Shield|Mercedes|Suite|Concierge|Fast-track/);
  }
});
test('comparison, point simulation and 3D card read configured values instead of fixed tier multipliers', () => {
  const table = renderToStaticMarkup(<UserMembershipComparisonTable tiers={tiers} currentTierId="silver" />);
  const sim = renderToStaticMarkup(<UserMembershipPointsSimulator tiers={tiers} currentTierId="silver" />);
  const card = renderToStaticMarkup(<UserMembershipCard3D tiers={tiers} currentTierId="silver" />);
  assert.match(table,/135\.000/); assert.match(sim,/900/); assert.match(card,/1,8/);
});
test('wallet shows available, held, reversal debt and signed history in both views', () => {
  const summary = { pointsBalance: 0, pointsHeld: 100, pointsDebt: 20, pointTransactions: [{ id:1,bookingId:8,kind:'earn',points:-20,reserved:0,description:'Thu hồi điểm',createdAt:'2026-11-23T00:00:00Z' }] } as MembershipSummary;
  const user = renderToStaticMarkup(<MembershipPointHistory summary={summary} />);
  const admin = renderToStaticMarkup(<MembershipPointHistory summary={summary} admin />);
  for (const html of [user,admin]) { assert.match(html,/Cần bù 20 điểm/); assert.match(html,/-20 điểm/); assert.match(html,/100 điểm/); }
  assert.match(user,/href="\/booking\/8"/); assert.match(admin,/href="\/admin\/bookings\?search=8"/);
});
test('checkout makes the point limit, cash value and cancellation behavior reviewable', () => {
  const html = renderToStaticMarkup(<UserBookingPointsPayment balance={500} amount={999999} points={100} disabled={false} onChange={() => {}} />);
  assert.match(html,/max="299"/); assert.match(html,/100\.000/); assert.match(html,/30%/); assert.match(html,/thanh toán thành công/); assert.match(html,/công ty hủy toàn bộ/);
});
