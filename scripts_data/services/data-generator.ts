import { config } from 'dotenv';
import { resolve } from 'node:path';
import { prisma } from '../../packages/database/src/index';

config({ path: resolve(__dirname, '../../.env'), quiet: true });

export interface GenerateScenarioOptions {
  tourMode: 'existing' | 'new';
  tourId?: number;
  newTour?: {
    name: string;
    description?: string;
    duration_days: number;
    duration_nights: number;
    base_price: number;
    departure_location: number;
    transport_id: number;
  };
  year: number;
  month: number; // 1 - 12
  departureCount: number;
  seatsPerSchedule: number;
  bookingCount: number;
  completedRatio: number; // e.g. 80 (%)
  pendingRatio: number;   // e.g. 15 (%)
  cancelledRatio: number; // e.g. 5 (%)
  includeReviews: boolean;
  includeReviewImages?: boolean;
  includeAdminReplies?: boolean;
  includePayments: boolean;
  batchTag?: string;
}

export interface GeneratorLog {
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  timestamp: string;
}

const VIETNAMESE_LAST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const VIETNAMESE_MIDDLE_NAMES = ['Văn', 'Thị', 'Minh', 'Hải', 'Thùy', 'Đức', 'Mai', 'Thanh', 'Quốc', 'Phương', 'Hoàng', 'Thu', 'Tuấn', 'Ngọc'];
const VIETNAMESE_FIRST_NAMES = ['Anh', 'Bình', 'Cường', 'Dung', 'Đăng', 'Hương', 'Huy', 'Hà', 'Kiên', 'Linh', 'Nam', 'Ngọc', 'Phong', 'Quân', 'Thảo', 'Tùng', 'Vy', 'Ánh', 'Duy', 'Phúc', 'Tâm', 'Trang'];

// Kho nội dung đánh giá chân thực, đa dạng theo đúng văn phong du khách Việt Nam
const REALISTIC_REVIEWS = [
  {
    rating: 5,
    title: 'Chuyến đi 4 ngày 3 đêm rất trọn vẹn và ý nghĩa!',
    comment: 'Chuyến đi cùng JourniTrip thực sự là kỷ niệm đẹp của cả gia đình. Hướng dẫn viên cực kỳ am hiểu lịch sử, kể chuyện duyên dáng và chăm sóc các bác lớn tuổi trong đoàn rất chu đáo. Bữa ăn các bữa đều tươi ngon, đặc biệt là hải sản. Đánh giá 5 sao!'
  },
  {
    rating: 5,
    title: 'Dịch vụ chuyên nghiệp, hướng dẫn viên nhiệt tình vui vẻ',
    comment: 'Lúc đầu đi tour cũng hơi ngại việc bị ép đi shopping, nhưng tour bên mình lịch trình rất thoáng, chủ yếu thời gian cho khách tự do trải nghiệm và chụp ảnh. Khách sạn tiêu chuẩn sạch sẽ, hồ bơi đẹp. Lần sau đi tour chắc chắn sẽ chọn tiếp!'
  },
  {
    rating: 5,
    title: 'Cả gia đình mình đều rất hài lòng!',
    comment: 'Đoàn mình 6 người lớn và 2 bé nhỏ, ban đầu sợ các bé mệt nhưng lịch trình sắp xếp giãn cách rất vừa sức. Xe du lịch đời mới, bác tài lái cẩn thận và êm ru. Cảm ơn các bạn nhân viên tư vấn đã hỗ trợ đổi giờ bay thuận tiện.'
  },
  {
    rating: 4,
    title: 'Cảnh đẹp xuất sắc, đồ ăn hơi cay so với khẩu vị',
    comment: 'Cảnh sắc thiên nhiên đẹp ngoài sức tưởng tượng! Điểm trừ nhỏ là buổi trưa ngày thứ 2 quán ăn hơi đông khách nên phải đợi một chút, khẩu vị hơi cay so với người miền Bắc tụi mình, nhưng bù lại đồ ăn tươi và hướng dẫn viên xử lý khéo léo. Tổng thể rất đáng tiền.'
  },
  {
    rating: 5,
    title: 'Chụp được cả nghìn tấm ảnh sống ảo mê ly',
    comment: 'Lần đầu đi tour ghép nhưng gặp cả đoàn toàn người dễ mến, hướng dẫn viên nhiệt tình chụp ảnh có tâm cho từng người một. Về mở máy ra toàn ảnh đẹp để sống ảo. 10/10 điểm cho chất lượng dịch vụ của công ty!'
  },
  {
    rating: 5,
    title: 'Thời tiết đợt tháng 8 đẹp mê hồn, biển xanh cát trắng',
    comment: 'Thời tiết đợt này rất đẹp, trời trong xanh chụp ảnh lên màu mê ly. Dịch vụ ăn uống phong phú, nếm được đủ các món đặc sản địa phương. Các cô chú trong đoàn ai cũng khen nức nở.'
  },
  {
    rating: 5,
    title: 'Từ tư vấn đến kết thúc tour đều rất chu đáo',
    comment: 'Từ khâu tư vấn cọc tiền đến khi kết thúc chuyến đi đều được chăm sóc rất tận tình. Có hợp đồng và bảo hiểm du lịch rõ ràng nên gia đình mình rất yên tâm. Sẽ giới thiệu cho bạn bè và đồng nghiệp công ty.'
  },
  {
    rating: 4,
    title: 'Lịch trình hay, điểm tham quan mùa này hơi đông',
    comment: 'Tour chuẩn chỉnh từng giờ giấc, ăn ngon ngủ kỹ, không phát sinh thêm chi phí ẩn nào ngoài chương trình. Điểm tham quan hơi đông một xíu do mùa cao điểm hè nhưng bác tài và HDV điều phối rất tốt.'
  },
  {
    rating: 5,
    title: 'Chuyến du lịch hè đáng nhớ nhất từ trước đến nay',
    comment: 'Khách sạn view đẹp ngắm trọn hoàng hôn. Các bữa tiệc BBQ hải sản ăn rất đã miệng. Đội ngũ nhân viên tận tâm từ A đến Z, nhất định sẽ ủng hộ JourniTrip dài dài!'
  },
  {
    rating: 5,
    title: 'Đáng từng đồng tiền bát gạo',
    comment: 'Giá cả quá hợp lý so với dịch vụ nhận lại. Phòng ốc khách sạn 4 sao sạch sẽ, tiện nghi, ăn sáng buffet đa dạng. Cảm ơn JourniTrip đã mang lại một kỳ nghỉ tuyệt vời!'
  }
];

// Ảnh check-in du lịch chất lượng cao
const TRAVEL_IMAGES = [
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80'
];

const ADMIN_REPLY_TEMPLATES = [
  'Dạ JourniTrip xin chân thành cảm ơn anh/chị {name} đã dành thời gian chia sẻ những phản hồi quý báu này! Sự hài lòng của anh/chị là niềm vui và động lực to lớn của cả đội ngũ hướng dẫn viên và điều hành. Kính chúc anh/chị và gia đình luôn dồi dào sức khỏe, hy vọng sớm được đồng hành cùng anh/chị trong các chuyến vi vu tiếp theo ạ! 🥰✨',
  'Dạ cảm ơn anh/chị {name} đã tin tưởng lựa chọn dịch vụ của JourniTrip! Đội ngũ xin ghi nhận những chia sẻ của anh/chị để ngày càng hoàn thiện chất lượng dịch vụ tốt hơn nữa. Chúc anh/chị luôn tràn đầy năng lượng và có thật nhiều chuyến du lịch ý nghĩa! 🌸',
  'JourniTrip xin cảm ơn lời khen và đánh giá dễ thương của anh/chị {name} ạ! Rất vui vì cả đoàn đã có những kỷ niệm đẹp và những bức ảnh sống ảo tuyệt vời. Hẹn gặp lại anh/chị ở những hành trình mới cùng JourniTrip nhé! ✈️💖'
];

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomSubarray<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateVietnameseName(): string {
  const last = getRandomItem(VIETNAMESE_LAST_NAMES);
  const middle = getRandomItem(VIETNAMESE_MIDDLE_NAMES);
  const first = getRandomItem(VIETNAMESE_FIRST_NAMES);
  return `${last} ${middle} ${first}`;
}

export async function getMetadata() {
  const [tours, locations, transports] = await Promise.all([
    prisma.tours.findMany({
      select: {
        tour_id: true,
        name: true,
        code: true,
        base_price: true,
        duration_days: true,
        duration_nights: true,
        departure_location: true
      },
      orderBy: { tour_id: 'desc' }
    }),
    prisma.locations.findMany({
      select: { location_id: true, name: true },
      orderBy: { name: 'asc' }
    }),
    prisma.transports.findMany({
      select: { transport_id: true, name: true },
      orderBy: { transport_id: 'asc' }
    })
  ]);

  return { tours, locations, transports };
}

export async function generateScenario(
  options: GenerateScenarioOptions,
  onLog?: (log: GeneratorLog) => void
) {
  const logs: GeneratorLog[] = [];
  const log = (level: GeneratorLog['level'], message: string) => {
    const item: GeneratorLog = { level, message, timestamp: new Date().toLocaleTimeString('vi-VN') };
    logs.push(item);
    if (onLog) onLog(item);
    console.log(`[${item.timestamp}] [${level.toUpperCase()}] ${message}`);
  };

  const batchTag = options.batchTag || `BATCH_${options.year}_${String(options.month).padStart(2, '0')}_${Date.now()}`;
  log('info', `Bắt đầu sinh dữ liệu mẫu với Mã đợt (Batch Tag): ${batchTag}`);

  // Tìm một tài khoản staff/admin để phục vụ việc trả lời review CSKH
  const staffUser = await prisma.users.findFirst({
    where: { is_staff: true },
    select: { user_id: true, full_name: true }
  }) || await prisma.users.findFirst({
    select: { user_id: true, full_name: true }
  });

  // 1. Xác định Tour
  let tour: {
    tour_id: number;
    name: string;
    code: string;
    base_price: any;
    duration_days: number;
    duration_nights: number;
    departure_location: number;
  };

  if (options.tourMode === 'existing' && options.tourId) {
    const existing = await prisma.tours.findUnique({
      where: { tour_id: options.tourId }
    });
    if (!existing) {
      throw new Error(`Không tìm thấy tour với ID ${options.tourId}`);
    }
    tour = existing;
    log('success', `Đã chọn Tour có sẵn: [${tour.code}] ${tour.name}`);
  } else if (options.newTour) {
    const code = `TOUR-MOCK-${options.year}${String(options.month).padStart(2, '0')}-${getRandomInt(100, 999)}`;
    const createdTour = await prisma.tours.create({
      data: {
        code,
        name: options.newTour.name,
        description: options.newTour.description || `Tour mẫu sinh tự động cho đợt tháng ${options.month}/${options.year}. Lịch trình hấp dẫn, trải nghiệm văn hóa và ẩm thực phong phú.`,
        duration_days: options.newTour.duration_days,
        duration_nights: options.newTour.duration_nights,
        base_price: options.newTour.base_price,
        departure_location: options.newTour.departure_location,
        transport_id: options.newTour.transport_id,
        status: 1
      }
    });
    tour = createdTour;
    log('success', `Đã tạo Tour mới: [${tour.code}] ${tour.name} (Giá gốc: ${Number(tour.base_price).toLocaleString('vi-VN')} đ)`);
  } else {
    throw new Error('Vui lòng chọn tour có sẵn hoặc nhập thông tin tạo tour mới.');
  }

  // 2. Tạo các Lịch khởi hành (Schedules) trong tháng chỉ định
  const schedulesCreated: any[] = [];
  const daysInMonth = new Date(options.year, options.month, 0).getDate();
  const stepDays = Math.max(1, Math.floor(daysInMonth / (options.departureCount + 1)));

  log('info', `Đang tạo ${options.departureCount} đợt khởi hành trong tháng ${options.month}/${options.year}...`);

  for (let i = 1; i <= options.departureCount; i++) {
    const departureDay = Math.min(daysInMonth - 1, i * stepDays);
    const startDate = new Date(options.year, options.month - 1, departureDay, 7, 0, 0);
    const endDate = new Date(startDate.getTime() + (tour.duration_days - 1) * 24 * 60 * 60 * 1000);
    endDate.setHours(18, 0, 0, 0);

    const price = Number(tour.base_price);
    const schedule = await prisma.tour_schedules.create({
      data: {
        tour_id: tour.tour_id,
        departure_location_id: tour.departure_location,
        start_date: startDate,
        end_date: endDate,
        price,
        quota: options.seatsPerSchedule,
        booked_count: 0,
        status: 1
      }
    });

    // Tạo bảng giá theo lứa tuổi
    await prisma.tour_schedule_prices.createMany({
      data: [
        { tour_schedule_id: schedule.tour_schedule_id, passenger_type: 'adult', price: price, currency: 'VND' },
        { tour_schedule_id: schedule.tour_schedule_id, passenger_type: 'child', price: Math.round(price * 0.75), currency: 'VND' },
        { tour_schedule_id: schedule.tour_schedule_id, passenger_type: 'infant', price: Math.round(price * 0.2), currency: 'VND' }
      ]
    });

    schedulesCreated.push(schedule);
    log('info', `+ Đợt ${i}: Khởi hành ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')} (Chỗ: ${options.seatsPerSchedule})`);
  }

  log('success', `Đã tạo ${schedulesCreated.length} đợt khởi hành thành công kèm bảng giá.`);

  // 3. Tạo Khách hàng & Bookings
  log('info', `Đang sinh ${options.bookingCount} đơn booking và người dùng tương ứng...`);

  let totalRevenue = 0;
  let completedCount = 0;
  let pendingCount = 0;
  let cancelledCount = 0;
  let reviewsCount = 0;
  let repliesCount = 0;

  for (let bIndex = 1; bIndex <= options.bookingCount; bIndex++) {
    const targetSchedule = getRandomItem(schedulesCreated);
    const scheduleStartDate = new Date(targetSchedule.start_date);

    // Ngày đặt đơn: trước ngày khởi hành 3 - 25 ngày
    const daysBefore = getRandomInt(3, 25);
    const bookingDate = new Date(scheduleStartDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);
    bookingDate.setHours(getRandomInt(8, 20), getRandomInt(0, 59), getRandomInt(0, 59));

    // Xác định trạng thái đơn theo tỷ lệ
    const rand = Math.random() * 100;
    let status: 'completed' | 'pending' | 'cancelled' = 'completed';
    if (rand < options.cancelledRatio) {
      status = 'cancelled';
      cancelledCount++;
    } else if (rand < options.cancelledRatio + options.pendingRatio) {
      status = 'pending';
      pendingCount++;
    } else {
      status = 'completed';
      completedCount++;
    }

    // Tạo thông tin User
    const fullName = generateVietnameseName();
    const phone = `09${getRandomInt(10000000, 99999999)}`;
    const email = `mock_${batchTag.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${bIndex}_${getRandomInt(100, 999)}@journitrip.mock`;

    const account = await prisma.accounts.create({
      data: {
        email,
        password_hash: '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890dummyhash',
        status: 1,
        email_verified: true,
        email_verified_at: bookingDate,
        created_at: bookingDate
      }
    });

    const user = await prisma.users.create({
      data: {
        account_id: account.account_id,
        full_name: fullName,
        phone,
        created_at: bookingDate,
        profile_completed: true
      }
    });

    // Số lượng khách
    const adultCount = getRandomInt(1, 3);
    const childCount = Math.random() < 0.35 ? 1 : 0;
    const infantCount = Math.random() < 0.1 ? 1 : 0;

    const adultPrice = Number(targetSchedule.price);
    const childPrice = Math.round(adultPrice * 0.75);
    const infantPrice = Math.round(adultPrice * 0.2);

    const totalAmount = (adultCount * adultPrice) + (childCount * childPrice) + (infantCount * infantPrice);

    // Tạo booking
    const booking = await prisma.bookings.create({
      data: {
        user_id: user.user_id,
        tour_schedule_id: targetSchedule.tour_schedule_id,
        contact_name: fullName,
        contact_phone: phone,
        contact_email: email,
        adult_count: adultCount,
        child_count: childCount,
        infant_count: infantCount,
        adult_unit_price: adultPrice,
        child_unit_price: childPrice,
        infant_unit_price: infantPrice,
        total_amount: totalAmount,
        status,
        note: `[MOCK_DATA] Batch: ${batchTag} | Khách: ${fullName}`,
        created_at: bookingDate
      }
    });

    // Tạo danh sách hành khách đi kèm
    const travelersData = [];
    for (let a = 1; a <= adultCount; a++) {
      travelersData.push({
        booking_id: booking.booking_id,
        full_name: a === 1 ? fullName : generateVietnameseName(),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        traveler_type: 'adult',
        created_at: bookingDate
      });
    }
    for (let c = 1; c <= childCount; c++) {
      travelersData.push({
        booking_id: booking.booking_id,
        full_name: generateVietnameseName(),
        gender: Math.random() > 0.5 ? 'male' : 'female',
        traveler_type: 'child',
        created_at: bookingDate
      });
    }
    if (travelersData.length > 0) {
      await prisma.booking_travelers.createMany({ data: travelersData });
    }

    // Tạo thanh toán (nếu là đơn completed hoặc confirmed)
    if (status === 'completed' && options.includePayments) {
      totalRevenue += totalAmount;
      const methods = ['vnpay', 'momo', 'bank'];
      const method = getRandomItem(methods);
      const paidDate = new Date(bookingDate.getTime() + getRandomInt(5, 30) * 60 * 1000);

      await prisma.payments.create({
        data: {
          booking_id: booking.booking_id,
          method,
          amount: totalAmount,
          status: 'success',
          transaction_code: `${method.toUpperCase()}${Date.now()}${getRandomInt(100, 999)}`,
          paid_at: paidDate,
          created_at: paidDate
        }
      });
    }

    // Tạo review mẫu CHÂN THỰC (Đánh giá, bình luận dài, ảnh check-in, lượt like, phản hồi CSKH)
    if (status === 'completed' && options.includeReviews && Math.random() < 0.75) {
      reviewsCount++;
      const reviewDate = new Date(targetSchedule.end_date.getTime() + getRandomInt(1, 4) * 24 * 60 * 60 * 1000);
      const template = getRandomItem(REALISTIC_REVIEWS);

      // Ảnh check-in đính kèm (65% có từ 1-3 ảnh)
      let reviewImages: string[] = [];
      if (options.includeReviewImages !== false && Math.random() < 0.7) {
        reviewImages = getRandomSubarray(TRAVEL_IMAGES, getRandomInt(1, 3));
      }

      const review = await prisma.reviews.create({
        data: {
          tour_id: tour.tour_id,
          user_id: user.user_id,
          booking_id: booking.booking_id,
          rating: template.rating,
          title: template.title,
          comment: template.comment,
          images: reviewImages.length > 0 ? reviewImages : undefined,
          likes_count: getRandomInt(2, 16),
          status: 1, // Đã duyệt / Approved
          created_at: reviewDate,
          updated_at: reviewDate
        }
      });

      // Tạo phản hồi từ CSKH/Admin (Replies) nếu bật tùy chọn và có tài khoản quản lý
      if (options.includeAdminReplies !== false && staffUser && Math.random() < 0.7) {
        repliesCount++;
        const replyDate = new Date(reviewDate.getTime() + getRandomInt(2, 18) * 60 * 60 * 1000);
        const replyContent = getRandomItem(ADMIN_REPLY_TEMPLATES).replace('{name}', fullName);

        await prisma.review_replies.create({
          data: {
            review_id: review.review_id,
            user_id: staffUser.user_id,
            content: replyContent,
            status: 1,
            created_at: replyDate,
            updated_at: replyDate
          }
        });
      }
    }

    // Cập nhật số ghế booked trên schedule (chỉ tính đơn hợp lệ)
    if (status !== 'cancelled') {
      await prisma.tour_schedules.update({
        where: { tour_schedule_id: targetSchedule.tour_schedule_id },
        data: {
          booked_count: { increment: adultCount + childCount }
        }
      });
    }
  }

  // Cập nhật lại rating trung bình và tổng số đánh giá trên Tour
  const allTourReviews = await prisma.reviews.findMany({
    where: { tour_id: tour.tour_id, status: 1 },
    select: { rating: true }
  });

  if (allTourReviews.length > 0) {
    const avgRating = allTourReviews.reduce((sum, r) => sum + r.rating, 0) / allTourReviews.length;
    await prisma.tours.update({
      where: { tour_id: tour.tour_id },
      data: {
        rating_avg: Number(avgRating.toFixed(2)),
        rating_count: allTourReviews.length
      }
    });
    log('info', `Đã cập nhật xếp hạng Tour: ${avgRating.toFixed(1)} ⭐ (${allTourReviews.length} lượt đánh giá)`);
  }

  log('success', `Đã tạo xong ${options.bookingCount} bookings:`);
  log('info', `  • Hoàn thành (Thanh toán thành công): ${completedCount} đơn`);
  log('info', `  • Chờ thanh toán (Pending): ${pendingCount} đơn`);
  log('info', `  • Đã hủy (Cancelled): ${cancelledCount} đơn`);
  log('info', `  • Đánh giá đã sinh: ${reviewsCount} reviews chân thực kèm ảnh check-in`);
  if (repliesCount > 0) {
    log('info', `  • Phản hồi từ CSKH đã tạo: ${repliesCount} lượt phản hồi (Replies)`);
  }
  log('success', `🎉 Tổng doanh thu giả lập đưa vào hệ thống: ${totalRevenue.toLocaleString('vi-VN')} VNĐ`);

  return {
    success: true,
    batchTag,
    tour: { id: tour.tour_id, code: tour.code, name: tour.name },
    schedulesCreated: schedulesCreated.length,
    bookingCount: options.bookingCount,
    completedCount,
    pendingCount,
    cancelledCount,
    totalRevenue,
    reviewsCount,
    repliesCount,
    logs
  };
}

export async function getBatches() {
  const bookings = await prisma.bookings.findMany({
    where: {
      note: { contains: '[MOCK_DATA] Batch:' }
    },
    select: {
      booking_id: true,
      total_amount: true,
      status: true,
      note: true,
      created_at: true,
      tour_schedules: {
        select: {
          tour_schedule_id: true,
          start_date: true,
          tours: {
            select: { tour_id: true, name: true, code: true }
          }
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  const batchMap = new Map<string, any>();

  for (const b of bookings) {
    const match = b.note?.match(/Batch:\s*([^\s|]+)/);
    const batchTag = match ? match[1] : 'UNKNOWN_BATCH';

    if (!batchMap.has(batchTag)) {
      batchMap.set(batchTag, {
        batchTag,
        createdAt: b.created_at,
        tourName: b.tour_schedules?.tours?.name || 'N/A',
        tourCode: b.tour_schedules?.tours?.code || 'N/A',
        tourId: b.tour_schedules?.tours?.tour_id,
        scheduleCount: new Set<number>(),
        totalBookings: 0,
        completedBookings: 0,
        totalRevenue: 0
      });
    }

    const item = batchMap.get(batchTag);
    item.totalBookings++;
    if (b.tour_schedules) {
      item.scheduleCount.add(b.tour_schedules.tour_schedule_id);
    }
    if (b.status === 'completed') {
      item.completedBookings++;
      item.totalRevenue += Number(b.total_amount);
    }
  }

  return Array.from(batchMap.values()).map(b => ({
    ...b,
    scheduleCount: b.scheduleCount.size
  }));
}

export async function rollbackBatch(batchTag: string) {
  if (!batchTag) throw new Error('Vui lòng cung cấp Batch Tag cần xoá.');

  const bookings = await prisma.bookings.findMany({
    where: { note: { contains: `Batch: ${batchTag}` } },
    select: {
      booking_id: true,
      user_id: true,
      tour_schedule_id: true,
      adult_count: true,
      child_count: true,
      status: true,
      tour_schedules: {
        select: { tour_id: true }
      }
    }
  });

  if (bookings.length === 0) {
    return { success: false, message: `Không tìm thấy booking nào thuộc đợt ${batchTag}.` };
  }

  const bookingIds = bookings.map(b => b.booking_id);
  const userIds = Array.from(new Set(bookings.map(b => b.user_id)));
  const scheduleIds = Array.from(new Set(bookings.map(b => b.tour_schedule_id)));
  const tourId = bookings[0]?.tour_schedules?.tour_id;

  // 1. Xoá review_replies liên quan tới các reviews của bookings này
  const targetReviews = await prisma.reviews.findMany({
    where: { booking_id: { in: bookingIds } },
    select: { review_id: true }
  });
  const reviewIds = targetReviews.map(r => r.review_id);

  if (reviewIds.length > 0) {
    await prisma.review_replies.deleteMany({
      where: { review_id: { in: reviewIds } }
    });
  }

  // 2. Xoá reviews
  await prisma.reviews.deleteMany({
    where: { booking_id: { in: bookingIds } }
  });

  // 3. Xoá payments
  await prisma.payments.deleteMany({
    where: { booking_id: { in: bookingIds } }
  });

  // 4. Xoá booking_travelers
  await prisma.booking_travelers.deleteMany({
    where: { booking_id: { in: bookingIds } }
  });

  // 5. Xoá bookings
  await prisma.bookings.deleteMany({
    where: { booking_id: { in: bookingIds } }
  });

  // 6. Cập nhật lại số ghế booked_count trên schedules
  for (const sId of scheduleIds) {
    const remainingBookings = await prisma.bookings.findMany({
      where: { tour_schedule_id: sId, status: { not: 'cancelled' } },
      select: { adult_count: true, child_count: true }
    });

    const newBooked = remainingBookings.reduce((sum, b) => sum + b.adult_count + b.child_count, 0);

    await prisma.tour_schedules.update({
      where: { tour_schedule_id: sId },
      data: { booked_count: newBooked }
    });
  }

  // 7. Cập nhật lại rating của Tour nếu có tourId
  if (tourId) {
    const remainingReviews = await prisma.reviews.findMany({
      where: { tour_id: tourId, status: 1 },
      select: { rating: true }
    });
    const avg = remainingReviews.length > 0
      ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length
      : 0;
    await prisma.tours.update({
      where: { tour_id: tourId },
      data: {
        rating_avg: Number(avg.toFixed(2)),
        rating_count: remainingReviews.length
      }
    });
  }

  // 8. Xoá users & accounts mẫu
  for (const uId of userIds) {
    const user = await prisma.users.findUnique({
      where: { user_id: uId },
      select: { account_id: true }
    });
    if (user) {
      await prisma.users.delete({ where: { user_id: uId } }).catch(() => {});
      if (user.account_id) {
        await prisma.accounts.delete({ where: { account_id: user.account_id } }).catch(() => {});
      }
    }
  }

  return {
    success: true,
    message: `Đã dọn dẹp thành công đợt ${batchTag} (${bookingIds.length} bookings, ${userIds.length} users, ${reviewIds.length} reviews).`
  };
}
