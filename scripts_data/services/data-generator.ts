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
  reviewDensity?: 'standard' | 'high' | 'all';
  reviewsPerBooking?: number;
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

// Kho nội dung đánh giá chân thực, phong phú (40 mẫu) bao phủ trọn vẹn các trải nghiệm tour tại Việt Nam
export const REALISTIC_REVIEWS = [
  // --- 5 SAO: HÀI LÒNG TUYỆT ĐỐI, KHEN NGỢI HDV, KHÁCH SẠN, ĂN UỐNG & TRẢI NGHIỆM ---
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
    rating: 5,
    title: 'Chụp được cả nghìn tấm ảnh sống ảo mê ly',
    comment: 'Lần đầu đi tour ghép nhưng gặp cả đoàn toàn người dễ mến, hướng dẫn viên nhiệt tình chụp ảnh có tâm cho từng người một. Về mở máy ra toàn ảnh đẹp để sống ảo. 10/10 điểm cho chất lượng dịch vụ của công ty!'
  },
  {
    rating: 5,
    title: 'Thời tiết đợt này đẹp mê hồn, biển xanh cát trắng',
    comment: 'Thời tiết đợt này rất đẹp, trời trong xanh chụp ảnh lên màu mê ly. Dịch vụ ăn uống phong phú, nếm được đủ các món đặc sản địa phương. Các cô chú trong đoàn ai cũng khen nức nở.'
  },
  {
    rating: 5,
    title: 'Từ tư vấn đến kết thúc tour đều rất chu đáo',
    comment: 'Từ khâu tư vấn cọc tiền đến khi kết thúc chuyến đi đều được chăm sóc rất tận tình. Có hợp đồng và bảo hiểm du lịch rõ ràng nên gia đình mình rất yên tâm. Sẽ giới thiệu cho bạn bè và đồng nghiệp công ty.'
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
  },
  {
    rating: 5,
    title: 'Tây Bắc mùa săn mây đẹp tựa chốn bồng lai',
    comment: 'Cung đường đèo uốn lượn hùng vĩ, mây bồng bềnh ngay dưới chân. Bác tài xế tay lái lụa cực kỳ yên tâm, HDV người bản địa chia sẻ nhiều câu chuyện văn hóa vùng cao rất cuốn hút. Tối ăn lẩu gà đen và xôi nếp nương ấm cúng vô cùng.'
  },
  {
    rating: 5,
    title: 'Trải nghiệm du thuyền ngắm vịnh trên cả tuyệt vời',
    comment: 'Phòng ban công riêng view trọn vịnh đảo đá vôi, sundeck ngắm hoàng hôn chill hết nấc. Tiệc tối buffet hải sản ngập tràn tôm cua tươi rói. Các hoạt động chèo kayak và tắm biển rất vui, đội ngũ nhân viên du thuyền lịch sự và chu đáo.'
  },
  {
    rating: 5,
    title: 'Hội An về đêm lung linh, ẩm thực đỉnh cao',
    comment: 'Lịch trình ghé Hội An vào buổi chiều tà, vừa kịp ngắm hoàng hôn bên sông Hoài rồi thả hoa đăng lung linh. Được HDV dẫn đi ăn cao lầu và bánh mì chuẩn vị địa phương ngon mê ly. Mọi thứ được sắp xếp rất nhịp nhàng.'
  },
  {
    rating: 5,
    title: 'Kỳ nghỉ trăng mật ngọt ngào và lãng mạn',
    comment: 'Hai vợ chồng mình chọn tour để đi honeymoon, công ty đã chuẩn bị hoa tươi và bánh kem chúc mừng tại phòng khách sạn rất bất ngờ. View phòng nhìn thẳng ra biển ngắm bình minh tuyệt đẹp. Cảm ơn JourniTrip rất nhiều!'
  },
  {
    rating: 5,
    title: 'Bác tài xế lái xe cẩn thận, xe Limousine êm ái',
    comment: 'Mình là người hay bị say xe nhưng chuyến này ngồi xe Limousine ghế massage êm ru, bác tài chạy cực kỳ từ tốn, không phanh gấp hay lạng lách. Cả chuyến đi người khỏe khoắn, chơi hết mình.'
  },
  {
    rating: 5,
    title: 'Tour miền Tây sông nước mộc mạc và thân thương',
    comment: 'Chợ nổi Cái Răng tấp nập thuyền bè buôn bán trái cây, được uống cà phê sáng và ăn tô bún nước lèo nóng hổi ngay trên xuồng. Người dân miền Tây hào sảng, hiếu khách, về mà còn quyến luyến mãi không muốn về.'
  },
  {
    rating: 5,
    title: 'Chuyến teambuilding công ty bùng nổ năng lượng',
    comment: 'Công ty mình đi đoàn hơn 30 người, các hoạt động teambuilding bãi biển do JourniTrip tổ chức cực kỳ sôi nổi và gắn kết. Khâu âm thanh, MC và chụp ảnh flycam chuyên nghiệp vượt mong đợi. Sếp mình rất hài lòng!'
  },
  {
    rating: 5,
    title: 'Khách sạn trung tâm tiện lợi, hồ bơi vô cực view xịn',
    comment: 'Vị trí khách sạn rất đẹp, chỉ vài bước chân là ra đến bãi biển và khu chợ đêm sầm uất. Bể bơi vô cực trên tầng thượng ngắm toàn cảnh thành phố lung linh về đêm. Dịch vụ dọn phòng sạch sẽ, đồ ăn sáng đổi món mỗi ngày.'
  },
  {
    rating: 5,
    title: 'Hướng dẫn viên xứng đáng 10 sao nhiệt tình',
    comment: 'Bạn HDV cực kỳ có tâm, kiên nhẫn đợi đoàn chụp ảnh, chủ động xách hành lý giúp các cô bác lớn tuổi. Kiến thức lịch sử và văn hóa địa phương sâu rộng, thuyết minh nghe say sưa không dứt. Rất quý bạn ấy!'
  },
  {
    rating: 5,
    title: 'Biển đảo trong vắt nhìn thấy cả rạn san hô',
    comment: 'Nước biển xanh ngọc bích trong veo, cano đưa đoàn ra các hòn đảo hoang sơ lặn ngắm san hô nhiều màu sắc và quay clip dưới nước miễn phí. Hải sản ăn trưa trên đảo tươi rói, tôm hùm và mực nhảy ngon ngọt tự nhiên.'
  },
  {
    rating: 5,
    title: 'Lịch trình thiết kế khoa học, không bị dồn dập',
    comment: 'Điều mình thích nhất ở JourniTrip là lịch trình phân bổ thời gian rất hợp lý. Không có cảm giác bị hối hả chạy sô như những tour khác mà có đủ thời gian để nghỉ ngơi, cà phê và tự do dạo phố chụp ảnh.'
  },
  {
    rating: 5,
    title: 'Thủ tục đăng ký và xuất hóa đơn VAT nhanh gọn',
    comment: 'Đặt tour online rất tiện lợi, nhận xác nhận qua email và tin nhắn ngay lập tức. Sau khi tour kết thúc công ty xuất hóa đơn điện tử cho doanh nghiệp rất nhanh và chuẩn xác. Quy trình làm việc rất chuyên nghiệp.'
  },
  {
    rating: 5,
    title: 'Mê đắm vẻ đẹp cổ kính của Cố đô Huế',
    comment: 'Thăm Đại Nội và các lăng tẩm triều Nguyễn trong một buổi sáng mát mẻ, nghe HDV kể chuyện hậu cung cung đình triều Nguyễn mà say mê. Buổi tối đi nghe ca Huế trên sông Hương thả hoa đăng cầu bình an thật sự thanh tịnh.'
  },
  {
    rating: 5,
    title: 'Chuyến đi nghỉ dưỡng phục hồi năng lượng tuyệt vời',
    comment: 'Sau chuỗi ngày làm việc căng thẳng, chuyến đi này đã giúp mình tái tạo năng lượng hoàn toàn. Không khí trong lành, cảnh đẹp hoang sơ, đồ ăn thanh đạm ngon miệng. Chắc chắn sẽ còn quay lại nhiều lần.'
  },
  {
    rating: 5,
    title: 'Đoàn gia đình 3 thế hệ ai cũng tấm tắc khen',
    comment: 'Nhà mình có cả ông bà ngoài 70 tuổi và các cháu nhỏ 4-5 tuổi. Đơn vị tổ chức đã rất tinh tế khi chuẩn bị xe đẩy và ưu tiên bàn ăn gần lối đi cho ông bà. Một kỳ nghỉ gia đình ngập tràn tiếng cười và kỷ niệm.'
  },
  {
    rating: 5,
    title: 'Bữa tối Gala Dinner ấm cúng và đầy ắp tiếng cười',
    comment: 'Đêm tiệc Gala Dinner tổ chức rất chu đáo với sân khấu âm thanh ánh sáng bài bản. MC dẫn chương trình dí dỏm, các trò chơi gắn kết làm cả đoàn cười nghiêng ngả. Món ăn lên nóng hổi và rất vừa miệng.'
  },
  {
    rating: 5,
    title: 'Cực kỳ ưng ý với gói bảo hiểm và sự an toàn của tour',
    comment: 'Trước ngày đi thời tiết có chút mưa gió nhẹ, bên công ty đã chủ động gọi điện cập nhật tình hình và có phương án dự phòng chu đáo cho khách. Sự tận tâm và trách nhiệm này khiến mình hoàn toàn tin tưởng.'
  },
  {
    rating: 5,
    title: 'Hành trình khám phá văn hóa bản địa chân thực',
    comment: 'Được trải nghiệm dệt thổ cẩm, giã bánh dày và thưởng thức rượu cần cùng đồng bào miền núi. Một chuyến đi không chỉ đơn thuần là ngắm cảnh mà còn mở mang thêm rất nhiều vốn sống và sự hiểu biết.'
  },
  {
    rating: 5,
    title: 'Chuyến đi đầu tiên cùng người yêu ngập tràn khoảnh khắc đẹp',
    comment: 'Nhờ sự gợi ý của HDV mà hai đứa mình đã ghé được những góc ngắm hoàng hôn vắng vẻ và cực kỳ lãng mạn. Ảnh chụp đôi đẹp như ảnh tạp chí. Cảm ơn JourniTrip đã đồng hành cùng kỷ niệm tình yêu của chúng mình!'
  },
  {
    rating: 5,
    title: 'Giá tour trọn gói cực tốt, không phát sinh phụ phí',
    comment: 'Giá tour đã bao gồm vé máy bay khứ hồi, khách sạn, toàn bộ vé tham quan và các bữa ăn chính. Đi suốt chuyến không hề phải móc ví chi trả thêm bất kỳ khoản phụ thu vô lý nào. Rất minh bạch và uy tín!'
  },
  {
    rating: 5,
    title: 'Đà Nẵng mùa lễ hội pháo hoa rực rỡ sắc màu',
    comment: 'Vị trí xem pháo hoa quốc tế được công ty đặt trước ở khán đài trung tâm, góc nhìn bao quát toàn sông Hàn. Lịch trình kết hợp đi Bà Nà Hills và bán đảo Sơn Trà rất khoa học. Kỳ nghỉ hè tuyệt vời cho gia đình!'
  },
  {
    rating: 5,
    title: 'Trekking rừng nguyên sinh và cắm trại ngắm sao băng',
    comment: 'Cung đường trekking rợp bóng cây cổ thụ, tắm suối mát lạnh và dựng lều cắm trại giữa thiên nhiên bao la. Đội ngũ porter và hướng dẫn viên lo chu đáo từng bữa ăn nóng hổi giữa rừng sâu. Trải nghiệm khó quên trong đời!'
  },

  // --- 4 SAO: ĐÁNH GIÁ CHÂN THỰC, KHÁCH QUAN, GÓP Ý THỰC TẾ ---
  {
    rating: 4,
    title: 'Cảnh đẹp xuất sắc, đồ ăn hơi cay so với khẩu vị miền Bắc',
    comment: 'Cảnh sắc thiên nhiên đẹp ngoài sức tưởng tượng! Điểm trừ nhỏ là buổi trưa ngày thứ 2 quán ăn hơi đông khách nên phải đợi một chút, khẩu vị hơi cay so với người miền Bắc tụi mình, nhưng bù lại đồ ăn tươi và hướng dẫn viên xử lý khéo léo. Tổng thể rất đáng tiền.'
  },
  {
    rating: 4,
    title: 'Lịch trình hay, điểm tham quan mùa này hơi đông khách',
    comment: 'Tour chuẩn chỉnh từng giờ giấc, ăn ngon ngủ kỹ, không phát sinh thêm chi phí ẩn nào ngoài chương trình. Điểm tham quan hơi đông một xíu do mùa cao điểm du lịch nhưng bác tài và HDV điều phối rất linh hoạt.'
  },
  {
    rating: 4,
    title: 'Khách sạn đẹp nhưng wifi ở tầng cao hơi chập chờn',
    comment: 'Khách sạn view biển tuyệt vời, buffet sáng nhiều món ngon. Chỉ có điểm trừ nhỏ là sóng wifi ở tầng cao đôi lúc hơi yếu vào ban đêm. May mắn là lịch trình đi chơi suốt ngày nên không ảnh hưởng nhiều. Cho 4 sao vì sự nhiệt tình của HDV!'
  },
  {
    rating: 4,
    title: 'Chuyến đi vui vẻ, thời tiết hơi nắng một chút',
    comment: 'Thời tiết miền Trung mùa hè khá nắng nóng, may nhờ có xe du lịch máy lạnh phà phà và HDV luôn chuẩn bị sẵn nước suối mát lạnh và khăn lạnh cho cả đoàn. Lịch trình hợp lý, điểm đến nào cũng có nét đặc sắc riêng.'
  },
  {
    rating: 4,
    title: 'Dịch vụ tốt, mong công ty bổ sung thêm thời gian tự do mua sắm',
    comment: 'Mọi dịch vụ từ xe cộ, ăn uống đến khách sạn đều chuẩn chỉ. Mình chỉ góp ý nhỏ là buổi tối nên tăng thêm thời gian để khách tự do lượn chợ đêm mua sắm quà lưu niệm thoải mái hơn. Lần sau sẽ tiếp tục ủng hộ.'
  },
  {
    rating: 4,
    title: 'Chất lượng tour xứng đáng với tầm giá',
    comment: 'Đồ ăn các bữa phong phú, hợp vệ sinh. Lái xe cẩn thận, đón trả đúng giờ hẹn. Đánh giá 4 sao và hy vọng JourniTrip sẽ mở thêm nhiều tuyến tour mới lạ ở các tỉnh Tây Nguyên để mình tiếp tục khám phá.'
  },
  {
    rating: 4,
    title: 'Hướng dẫn viên vui tính, thủ tục check-in sân bay nhanh',
    comment: 'Đoàn được hướng dẫn check-in online trước nên ra sân bay làm thủ tục rất nhanh chóng, không phải xếp hàng chờ đợi lâu. Điểm tham quan đẹp, đồ ăn ngon. Nếu khách sạn nâng cấp thêm nệm êm hơn nữa thì tuyệt đối 5 sao.'
  },
  {
    rating: 4,
    title: 'Trải nghiệm chèo kayak thú vị, cảnh sắc hùng vĩ',
    comment: 'Hoạt động chèo kayak giữa vịnh là trải nghiệm đáng giá nhất chuyến đi. Nước biển mát lạnh, không khí trong lành. Điểm ăn trưa hơi đông khách một chút do cùng giờ cao điểm, nhưng nhân viên phục vụ rất nhanh nhẹn.'
  },
  {
    rating: 4,
    title: 'Tour phù hợp cho gia đình có người lớn tuổi',
    comment: 'Bố mẹ mình đi tour về rất vui vẻ và không hề bị mệt mỏi. Các bữa ăn được dặn đầu bếp nấu nhạt bớt và mềm theo yêu cầu của gia đình. Rất cảm ơn bạn điều hành tour đã lắng nghe ý kiến khách hàng chu đáo.'
  },
  {
    rating: 4,
    title: 'Chuyến đi suôn sẻ, dịch vụ chăm sóc khách hàng phản hồi rất nhanh',
    comment: 'Mình có thắc mắc về hành lý ký gửi vào lúc 10h đêm trước ngày bay, các bạn tư vấn viên vẫn hỗ trợ nhiệt tình qua Zalo. Chuyến đi diễn ra tốt đẹp, cảnh đẹp và người dân địa phương thân thiện mến khách.'
  }
];

// Kho 24 ảnh check-in du lịch cảnh sắc và ẩm thực Việt Nam chân thực
export const TRAVEL_IMAGES = [
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80', // Vịnh Hạ Long
  'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80', // Phố cổ Hội An
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', // Biển xanh
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // Núi non hùng vĩ
  'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80', // Hoàng hôn trên biển
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', // Ẩm thực tươi ngon
  'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=800&q=80', // Chợ nổi Mekong
  'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=80', // Đèn lồng đêm
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', // Resort nghỉ dưỡng
  'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=80', // Ruộng bậc thang Tây Bắc
  'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80', // Thuyền nan Tràng An
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80', // Biển đảo Phú Quốc
  'https://images.unsplash.com/photo-1563897539633-7374c276c212?auto=format&fit=crop&w=800&q=80', // Chùa chiền cổ kính
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80', // Rạn san hô đảo
  'https://images.unsplash.com/photo-1505881502353-a1986add3762?auto=format&fit=crop&w=800&q=80', // Cầu Vàng Bà Nà
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80', // Thác nước thiên nhiên
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=800&q=80', // Chèo thuyền ngắm cảnh
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', // Tiệc nướng hải sản
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', // Hồ bơi vô cực view biển
  'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80', // Đồi cát Mũi Né
  'https://images.unsplash.com/photo-1509233725247-49e657c54213?auto=format&fit=crop&w=800&q=80', // Sóng biển trong vắt
  'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=800&q=80', // Suối nước trong rừng
  'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80', // Săn mây đỉnh núi
  'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80'  // Cà phê view ngắm thung lũng
];

export const ADMIN_REPLY_TEMPLATES = [
  'Dạ JourniTrip xin chân thành cảm ơn anh/chị {name} đã dành thời gian chia sẻ những phản hồi quý báu này! Sự hài lòng của anh/chị là niềm vui và động lực to lớn của cả đội ngũ hướng dẫn viên và điều hành. Kính chúc anh/chị và gia đình luôn dồi dào sức khỏe, hy vọng sớm được đồng hành cùng anh/chị trong các chuyến vi vu tiếp theo ạ! 🥰✨',
  'Dạ cảm ơn anh/chị {name} đã tin tưởng lựa chọn dịch vụ của JourniTrip! Đội ngũ xin ghi nhận những chia sẻ của anh/chị để ngày càng hoàn thiện chất lượng dịch vụ tốt hơn nữa. Chúc anh/chị luôn tràn đầy năng lượng và có thật nhiều chuyến du lịch ý nghĩa! 🌸',
  'JourniTrip xin cảm ơn lời khen và đánh giá dễ thương của anh/chị {name} ạ! Rất vui vì cả đoàn đã có những kỷ niệm đẹp và những bức ảnh sống ảo tuyệt vời. Hẹn gặp lại anh/chị ở những hành trình mới cùng JourniTrip nhé! ✈️💖',
  'Dạ JourniTrip rất vui mừng khi nhận được đánh giá tích cực từ anh/chị {name}! Chúng em sẽ chuyển ngay lời khen của anh/chị đến bạn hướng dẫn viên và bác tài xế trong đoàn. Chúc anh/chị một tuần làm việc tràn đầy niềm vui và may mắn ạ! 🌟',
  'Cảm ơn anh/chị {name} đã luôn tin yêu và ủng hộ JourniTrip! Mỗi đánh giá hài lòng của khách hàng là món quà tinh thần quý giá nhất đối với chúng em. Mong rằng JourniTrip sẽ tiếp tục được phục vụ anh/chị ở những hành trình khám phá tiếp theo! 🏝️❤️',
  'Dạ JourniTrip cảm ơn anh/chị {name} rất nhiều ạ! Những góp ý chân thành và tinh tế của anh/chị sẽ giúp chúng em nâng cao chất lượng dịch vụ hơn nữa trong các tour tới. Kính chúc anh/chị vạn sự như ý và có thêm thật nhiều trải nghiệm đáng nhớ! 🌈',
  'Chào anh/chị {name}, JourniTrip cảm ơn những dòng cảm nhận tuyệt vời này! Nhìn thấy nụ cười và sự gắn kết của cả gia đình trong suốt chuyến đi là niềm hạnh phúc lớn nhất của toàn thể đội ngũ. Hẹn gặp lại gia đình mình ở những miền đất mới ạ! 👨‍👩‍👧‍👦🎉',
  'Dạ JourniTrip xin gửi lời cảm ơn sâu sắc đến anh/chị {name}! Thật tự hào khi được đồng hành cùng anh/chị trong kỳ nghỉ vừa qua. Đừng quên liên hệ hotline khi chuẩn bị cho chuyến đi tiếp theo để nhận ưu đãi tri ân thành viên thân thiết nhé ạ! 🎁✨'
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

async function createMockReview({
  tourId,
  userId,
  bookingId,
  userFullName,
  targetDate,
  options,
  staffUser,
  forcedRating
}: {
  tourId: number;
  userId: number;
  bookingId?: number;
  userFullName: string;
  targetDate: Date;
  options: {
    includeReviewImages?: boolean;
    includeAdminReplies?: boolean;
  };
  staffUser?: any;
  forcedRating?: number;
}) {
  let pool = REALISTIC_REVIEWS;
  if (forcedRating) {
    const filtered = REALISTIC_REVIEWS.filter(r => r.rating === forcedRating);
    if (filtered.length > 0) pool = filtered;
  }
  const template = getRandomItem(pool);
  const reviewDate = new Date(targetDate.getTime() + getRandomInt(1, 4) * 24 * 60 * 60 * 1000);

  // Ảnh check-in đính kèm (70% có từ 1-3 ảnh chân thực)
  let reviewImages: string[] = [];
  if (options.includeReviewImages !== false && Math.random() < 0.75) {
    reviewImages = getRandomSubarray(TRAVEL_IMAGES, getRandomInt(1, 3));
  }

  const review = await prisma.reviews.create({
    data: {
      tour_id: tourId,
      user_id: userId,
      booking_id: bookingId,
      rating: template.rating,
      title: template.title,
      comment: template.comment,
      images: reviewImages.length > 0 ? reviewImages : undefined,
      likes_count: getRandomInt(3, 25),
      status: 1, // Đã duyệt / Approved
      created_at: reviewDate,
      updated_at: reviewDate
    }
  });

  let hasReply = false;
  // Tạo phản hồi từ CSKH/Admin (Replies) nếu bật tùy chọn và có tài khoản quản lý
  if (options.includeAdminReplies !== false && staffUser && Math.random() < 0.75) {
    const replyDate = new Date(reviewDate.getTime() + getRandomInt(2, 18) * 60 * 60 * 1000);
    const replyContent = getRandomItem(ADMIN_REPLY_TEMPLATES).replace('{name}', userFullName);

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
    hasReply = true;
  }

  return { review, hasReply };
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
    const shouldReview = options.includeReviews && (
      options.reviewDensity === 'all'
        ? status !== 'cancelled'
        : status === 'completed'
    );

    if (shouldReview) {
      // 1. Review từ khách hàng đặt tour chính
      const res1 = await createMockReview({
        tourId: tour.tour_id,
        userId: user.user_id,
        bookingId: booking.booking_id,
        userFullName: fullName,
        targetDate: targetSchedule.end_date,
        options: {
          includeReviewImages: options.includeReviewImages,
          includeAdminReplies: options.includeAdminReplies
        },
        staffUser
      });
      reviewsCount++;
      if (res1.hasReply) repliesCount++;

      // 2. Mở rộng đánh giá từ người đi cùng (Companion Travelers) nếu bật chế độ 'high' hoặc số lượng review > 1
      const wantsMultiple = options.reviewDensity === 'high' || (options.reviewsPerBooking && options.reviewsPerBooking > 1);
      if (wantsMultiple && travelersData.length > 1) {
        const companionName = travelersData[1].full_name;
        const compPhone = `09${getRandomInt(10000000, 99999999)}`;
        const compEmail = `traveler_${Date.now()}_${getRandomInt(1000, 9999)}@mock.local`;

        const compAccount = await prisma.accounts.create({
          data: {
            email: compEmail,
            password_hash: '$2b$10$w0954pLskp5GzQ5wO3Z5EOGhR3GjDq5oJbT0eB/kRz7y5aK4y5K2K',
            status: 1
          }
        });

        const compUser = await prisma.users.create({
          data: {
            account_id: compAccount.account_id,
            full_name: companionName,
            phone: compPhone,
            profile_completed: true
          }
        });

        const res2 = await createMockReview({
          tourId: tour.tour_id,
          userId: compUser.user_id,
          bookingId: booking.booking_id,
          userFullName: companionName,
          targetDate: targetSchedule.end_date,
          options: {
            includeReviewImages: options.includeReviewImages,
            includeAdminReplies: options.includeAdminReplies
          },
          staffUser
        });
        reviewsCount++;
        if (res2.hasReply) repliesCount++;
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

export interface BoostReviewsOptions {
  tourId: number;
  count: number;
  ratingProfile?: 'all_five' | 'mostly_five' | 'natural_mix';
  includeImages?: boolean;
  includeReplies?: boolean;
  batchTag?: string;
}

export async function boostTourReviews(options: BoostReviewsOptions) {
  const logs: GeneratorLog[] = [];
  const log = (level: GeneratorLog['level'], message: string) => {
    logs.push({ level, message, timestamp: new Date().toLocaleTimeString('vi-VN') });
  };

  const { tourId, count = 10, ratingProfile = 'mostly_five', includeImages = true, includeReplies = true } = options;
  const batchTag = options.batchTag || `BOOST-${Date.now().toString(36).toUpperCase()}`;

  log('info', `Bắt đầu bơm ${count} đánh giá cho Tour ID #${tourId} (Batch: ${batchTag})...`);

  const tour = await prisma.tours.findUnique({
    where: { tour_id: tourId },
    include: {
      tour_schedules: {
        orderBy: { start_date: 'desc' },
        take: 3
      }
    }
  });

  if (!tour) {
    throw new Error(`Không tìm thấy tour với ID ${tourId}`);
  }

  // Lấy hoặc tạo tài khoản CSKH/Staff để trả lời phản hồi
  let staffUser = await prisma.users.findFirst({
    where: { is_staff: true },
    select: { user_id: true, full_name: true }
  });

  if (!staffUser) {
    const adminRole = await prisma.roles.findFirst({ where: { role_name: { in: ['admin', 'manager', 'staff'] } } });
    const staffAccount = await prisma.accounts.create({
      data: {
        email: `cskh.tour${Date.now()}@journitrip.local`,
        password_hash: '$2b$10$w0954pLskp5GzQ5wO3Z5EOGhR3GjDq5oJbT0eB/kRz7y5aK4y5K2K',
        status: 1,
        role_id: adminRole?.role_id
      }
    });
    staffUser = await prisma.users.create({
      data: {
        account_id: staffAccount.account_id,
        full_name: 'Ban Chăm Sóc Khách Hàng JourniTrip',
        phone: `09${getRandomInt(10000000, 99999999)}`,
        is_staff: true,
        profile_completed: true
      }
    });
  }

  // Lấy hoặc tạo lịch khởi hành (schedule) để liên kết booking
  let schedule = tour.tour_schedules[0];
  if (!schedule) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 20);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (tour.duration_days || 3));

    schedule = await prisma.tour_schedules.create({
      data: {
        tour_id: tour.tour_id,
        start_date: startDate,
        end_date: endDate,
        capacity: 100,
        booked_count: 0,
        status: 'available',
        price: tour.base_price || 2500000
      }
    });
  }

  let reviewsCreated = 0;
  let repliesCreated = 0;

  for (let i = 0; i < count; i++) {
    const reviewerName = generateVietnameseName();
    const phone = `09${getRandomInt(10000000, 99999999)}`;
    const email = `reviewer_${Date.now()}_${i}@mock.local`;

    // Tạo account + user cho khách đánh giá
    const account = await prisma.accounts.create({
      data: {
        email,
        password_hash: '$2b$10$w0954pLskp5GzQ5wO3Z5EOGhR3GjDq5oJbT0eB/kRz7y5aK4y5K2K',
        status: 1
      }
    });

    const user = await prisma.users.create({
      data: {
        account_id: account.account_id,
        full_name: reviewerName,
        phone,
        profile_completed: true
      }
    });

    // Tạo booking completed để đánh giá được xác thực ("Đã mua tour")
    const bookingDate = new Date(schedule.start_date.getTime() - getRandomInt(7, 20) * 24 * 60 * 60 * 1000);
    const booking = await prisma.bookings.create({
      data: {
        user_id: user.user_id,
        tour_schedule_id: schedule.tour_schedule_id,
        contact_name: reviewerName,
        contact_phone: phone,
        contact_email: email,
        adult_count: 2,
        child_count: 0,
        infant_count: 0,
        adult_unit_price: schedule.price,
        total_amount: Number(schedule.price) * 2,
        status: 'completed',
        note: `[REVIEW_BOOST] Batch: ${batchTag} | Khách: ${reviewerName}`,
        created_at: bookingDate
      }
    });

    // Xác định số sao theo cấu hình ratingProfile
    let targetRating = 5;
    if (ratingProfile === 'mostly_five') {
      targetRating = Math.random() < 0.8 ? 5 : 4;
    } else if (ratingProfile === 'natural_mix') {
      const rand = Math.random();
      targetRating = rand < 0.65 ? 5 : 4;
    }

    const { review, hasReply } = await createMockReview({
      tourId: tour.tour_id,
      userId: user.user_id,
      bookingId: booking.booking_id,
      userFullName: reviewerName,
      targetDate: schedule.end_date,
      options: {
        includeReviewImages: includeImages,
        includeAdminReplies: includeReplies
      },
      staffUser,
      forcedRating: targetRating
    });

    reviewsCreated++;
    if (hasReply) repliesCreated++;
  }

  // Cập nhật rating_avg & rating_count cho Tour
  const allTourReviews = await prisma.reviews.findMany({
    where: { tour_id: tour.tour_id, status: 1 },
    select: { rating: true }
  });

  let avgRating = 5;
  if (allTourReviews.length > 0) {
    avgRating = allTourReviews.reduce((sum, r) => sum + r.rating, 0) / allTourReviews.length;
    await prisma.tours.update({
      where: { tour_id: tour.tour_id },
      data: {
        rating_avg: Number(avgRating.toFixed(2)),
        rating_count: allTourReviews.length
      }
    });
  }

  log('success', `Đã bơm thành công ${reviewsCreated} đánh giá (${repliesCreated} phản hồi CSKH)!`);
  log('info', `Tour [${tour.code}] "${tour.name}" hiện có: ${avgRating.toFixed(1)} ⭐ (${allTourReviews.length} lượt đánh giá).`);

  return {
    success: true,
    batchTag,
    reviewsCreated,
    repliesCreated,
    ratingAvg: Number(avgRating.toFixed(2)),
    ratingCount: allTourReviews.length,
    tourId: tour.tour_id,
    tourName: tour.name,
    logs
  };
}
