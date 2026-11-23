import {
  BadRequestException, Injectable, Logger, ServiceUnavailableException,
} from "@nestjs/common";
import { tourIntentSchema, voucherAudienceLabel } from "shared";
import type { AiChatResponse, AiChatTour, AiChatTourReference, TourIntent } from "shared";
import type { Party } from "../bookings/helpers/booking-tour-price";
import { VouchersService } from "../vouchers/vouchers.service";
import { AiChatDto } from "./ai-chat.dto";
import { AiChatTours, vnd } from "./ai-chat-tours.service";

const directIntent: TourIntent = {
  intent: "offers",
  topic: "overview",
  policy_key: null,
  destination: null,
  departure: null,
  tour_name: null,
  themes: [],
  departure_from: null,
  departure_until: null,
  duration_days: null,
  max_per_person: null,
  max_total: null,
  target_budget: null,
  budget_type: null,
  off_topic_subject: null,
  adults: null,
  children: null,
  infants: null,
  voucher_code: null,
  tour_position: null,
  use_selected_tour: true,
  change_departure: false,
};

export function parsePartyFromText(text: string): Party | undefined {
  const norm = text.toLowerCase().normalize("NFC");

  let adults: number | null = null;
  let children = 0;
  let infants = 0;

  // 1. Adults: "1 người lớn", "2 ng lớn", "2 lớn", "2 adults", "2 adult", "2 nguoi lon"
  const adultMatch = norm.match(/(?:^|\D)(\d+)\s*(?:người\s*lớn|ng\s*lớn|nguoi\s*lon|lớn|adults?)(?:\D|$)/);
  if (adultMatch) {
    adults = parseInt(adultMatch[1], 10);
  }

  // 2. Children: "1 trẻ em", "1 trẻ nhỏ", "1 trẻ", "1 tre em", "1 children", "1 child", "1 nhỏ"
  const childMatch = norm.match(/(?:^|\D)(\d+)\s*(?:trẻ\s*em|tre\s*em|trẻ\s*nhỏ|tre\s*nho|trẻ|tre|nhỏ|children|child)(?:\D|$)/);
  if (childMatch) {
    children = parseInt(childMatch[1], 10);
  }

  // 3. Infants: "1 em bé", "1 em be", "1 bé", "1 infants", "1 infant"
  const infantMatch = norm.match(/(?:^|\D)(\d+)\s*(?:em\s*bé|em\s*be|bé|infants?)(?:\D|$)/);
  if (infantMatch) {
    infants = parseInt(infantMatch[1], 10);
  }

  // 4. Fallback if no explicit breakdown: "vợ chồng", "cặp đôi", or general "2 khách", "2 người"
  if (adults === null) {
    if (/(?:vợ\s*chồng|cặp\s*đôi|hai\s*vợ\s*chồng)/.test(norm)) {
      adults = 2;
    } else {
      const guestMatch = norm.match(/(?:^|\D)(\d+)\s*(?:người|khách|nguoi|khach|pax)(?!\s*(?:lớn|trẻ|nhỏ|em|bé|ngày|đêm|triệu|k\b|tr\b))(?:\D|$)/);
      if (guestMatch) {
        adults = parseInt(guestMatch[1], 10);
      }
    }
  }

  if (adults != null && adults > 0) {
    return { adults, children, infants };
  }
  return undefined;
}

function referenceFor(card: AiChatTour): AiChatTourReference {
  return { tourId: card.id, scheduleId: card.schedule_id };
}

function asResponse(reply: string, tours: AiChatTour[] = [], tourReference?: AiChatTourReference): AiChatResponse {
  return { reply, tours, tourReference };
}

type SearchResult = Awaited<ReturnType<AiChatTours["find"]>>[number];

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(private readonly tours: AiChatTours, private readonly vouchers: VouchersService) {}

  async ask(body: AiChatDto, accountId?: number): Promise<AiChatResponse> {
    const message = body.message.trim();
    if (!message) throw new BadRequestException("Bạn hãy nhập câu hỏi về tour.");

    const partyFromText = parsePartyFromText(message);
    const recent = body.recentTours ?? [];
    const selected = body.tourReference ?? (recent.length === 1 ? recent[0] : undefined);

    let intent: TourIntent;
    if (body.action === "quote" && selected) {
      intent = {
        ...directIntent,
        intent: "quote",
        adults: partyFromText?.adults ?? null,
        children: partyFromText?.children ?? null,
        infants: partyFromText?.infants ?? null,
        use_selected_tour: true,
      };
    } else if (body.action === "offers" && !message) {
      intent = { ...directIntent, intent: "offers" };
    } else if (body.action === "advice" && selected) {
      intent = { ...directIntent, intent: "advice", use_selected_tour: true };
    } else {
      intent = await this.interpret(message, body.previousQuestions ?? [], recent.length, Boolean(selected));
      if (body.action) {
        intent.intent = body.action;
      }
    }

    if (partyFromText && selected && (intent.intent === "other" || intent.intent === "greeting" || intent.intent === "search") && !intent.destination && !intent.tour_name) {
      intent.intent = "quote";
      intent.use_selected_tour = true;
    }

    if (intent.intent === "greeting") {
      return asResponse("Dạ chào bạn! Mình là trợ lý ảo của JourniTrip ✈️. Mình có thể hỗ trợ bạn tìm tour du lịch, xem lịch trình, tính giá vé hoặc săn voucher ưu đãi. Bạn đang quan tâm đến chuyến đi nào ạ?");
    }
    if (intent.intent === "other") {
      const subject = intent.off_topic_subject ? `"${intent.off_topic_subject}"` : "vấn đề này";
      return asResponse(
        `Dạ, mình là trợ lý ảo chuyên hỗ trợ thông tin du lịch và đặt tour tại JourniTrip. Về ${subject} thì hiện tại mình chưa thể hỗ trợ bạn được rồi ạ 😊.\n\nMình có thể giúp bạn tìm tour du lịch phù hợp, tư vấn lịch trình hoặc tính giá vé. Nếu bạn có kế hoạch đi du lịch ở đâu thì nhắn mình hỗ trợ nhé!`,
      );
    }
    if (intent.departure_from && intent.departure_until && intent.departure_from > intent.departure_until) {
      return asResponse("Bạn kiểm tra lại khoảng ngày khởi hành giúp mình nhé.");
    }

    const reference = intent.tour_position
      ? recent[intent.tour_position - 1]
      : intent.use_selected_tour ? selected : undefined;
    if (intent.tour_position && !reference) {
      return asResponse("Mình chưa thấy tour ở vị trí đó trong danh sách gần nhất. Bạn cho mình tên hoặc mã tour nhé.");
    }

    const wantsQuote = intent.intent === "quote" || Boolean(intent.voucher_code);
    const party: Party | undefined = (partyFromText && partyFromText.adults > 0)
      ? partyFromText
      : (intent.adults ? { adults: intent.adults, children: intent.children ?? 0, infants: intent.infants ?? 0 } : undefined);
    if (intent.max_total != null && !party) {
      return asResponse("Ngân sách này dành cho cả nhóm. Bạn cho mình số người lớn, trẻ em và em bé để lọc tour nhé.", [], reference);
    }
    if (party && party.adults + party.children + party.infants > 100) {
      return asResponse("Nhóm trên 100 khách vui lòng liên hệ tư vấn viên để kiểm tra số chỗ và giá đoàn.");
    }

    const hasTourQuery = Boolean(reference || intent.tour_name || intent.destination ||
      intent.departure || intent.departure_from || intent.departure_until);
    if (intent.intent === "advice" && intent.topic !== "overview" && !hasTourQuery) {
      return asResponse("Bạn muốn xem thông tin của tour nào? Gửi mình tên hoặc mã tour nhé.");
    }
    if (wantsQuote && !hasTourQuery) {
      return asResponse("Bạn gửi tên, mã hoặc điểm đến của tour cần tính giá nhé. Nếu có ngày khởi hành và số khách, bạn gửi kèm giúp mình.");
    }

    const found = await this.tours.find(intent, reference, party);
    const cards = found.map((item) => item.card);
    const match = found.length === 1 ? found[0] : undefined;
    if (intent.intent === "offers" && !intent.voucher_code) {
      return this.listOffers(found, hasTourQuery);
    }
    if (!found.length) {
      return asResponse("Mình chưa tìm thấy tour còn đủ chỗ và phù hợp với các điều kiện này. Bạn thử đổi ngày, điểm khởi hành hoặc ngân sách nhé.", [], reference);
    }

    if (wantsQuote) {
      if (!match) {
        return asResponse("Mình tìm được vài tour. Bạn cho mình biết tour nào cần tính giá hoặc chọn Tính giá ở thẻ tour bên dưới.", cards);
      }
      if (!party) {
        const voucherHint = intent.voucher_code ? ` để kiểm tra mã ${intent.voucher_code}` : "";
        return asResponse(
          `Bạn cho mình số người lớn, trẻ em và em bé${voucherHint} nhé. Ví dụ: 2 người lớn, 1 trẻ em, không có em bé.`,
          cards, referenceFor(match.card),
        );
      }
      return this.quote(match, party, intent.voucher_code, accountId);
    }

    const target = match ? referenceFor(match.card) : undefined;

    if (intent.intent === "advice" && match) {
      const tourTarget = referenceFor(match.card);
      return asResponse(await this.tours.advise(tourTarget, intent.topic, intent.policy_key), cards, tourTarget);
    }

    let intro = "";
    if (intent.target_budget || (intent.budget_type === "around" && intent.max_per_person)) {
      const bVal = intent.target_budget ?? intent.max_per_person;
      intro = `Dạ, với ngân sách khoảng ${vnd.format(bVal!)}/khách, mình gợi ý cho bạn ${cards.length === 1 ? "tour" : `${cards.length} hành trình`} phù hợp nhất sau nhé:`;
    } else if (intent.max_per_person) {
      intro = `Dạ, với ngân sách dưới ${vnd.format(intent.max_per_person)}/khách, mình tìm thấy ${cards.length} tour phù hợp sau:`;
    } else if (intent.destination) {
      intro = `Dạ, mình tìm thấy ${cards.length === 1 ? "tour" : `${cards.length} tour`} khám phá ${intent.destination} phù hợp với yêu cầu của bạn:`;
    } else {
      intro = `Dạ, mình tìm thấy ${cards.length === 1 ? "hành trình" : `${cards.length} hành trình`} nổi bật sau nhé:`;
    }

    const summaries = cards.slice(0, 3).map((c, i) => {
      const details = [
        c.duration,
        c.transport ? `Di chuyển: ${c.transport}` : "",
        c.departure_date ? `Khởi hành: ${new Date(c.departure_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : "",
      ].filter(Boolean).join(" • ");
      const discountText = c.original_price && c.price != null && c.original_price > c.price
        ? ` (tiết kiệm ${vnd.format(c.original_price - c.price)})`
        : "";
      const priceText = c.price != null ? vnd.format(c.price) : "Liên hệ";
      return `${i + 1}. **${c.title}** (${details})\n   👉 Giá từ: **${priceText} / khách**${discountText}`;
    });

    const outro = `Bạn có thể bấm vào nút **...** trên thẻ tour bên dưới để chọn **Tư vấn** hoặc **Tính giá** nhanh nhé!`;
    const replyText = `${intro}\n\n${summaries.join("\n\n")}\n\n${outro}`;

    return asResponse(replyText, cards, target);
  }

  private async interpret(message: string, previousQuestions: string[], recentTourCount: number, hasSelectedTour: boolean) {
    const origin = process.env.AI_SERVICE_URL?.trim().replace(/\/+$/, "");
    const token = process.env.AI_SERVICE_TOKEN?.trim();
    if (!origin || !token) {
      throw new ServiceUnavailableException("Chatbot AI chưa được cấu hình.");
    }
    try {
      const response = await fetch(`${origin}/internal/interpret`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, previousQuestions, recentTourCount, hasSelectedTour }),
        signal: AbortSignal.timeout(19_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return tourIntentSchema.parse(await response.json());
    } catch (error) {
      this.logger.warn(`AI interpretation failed (${error instanceof Error && /^HTTP \d+$/.test(error.message) ? error.message : "request or schema error"})`);
      throw new ServiceUnavailableException("Chatbot đang bận hoặc mất kết nối. Bạn thử lại sau nhé.");
    }
  }

  private async quote(match: SearchResult, party: Party, code: string | null, accountId?: number) {
    const { pricing, card } = match;
    const target = referenceFor(card);
    const hasEstimate = pricing.hasPriceEstimate;
    const pieces: string[] = [];

    if (hasEstimate) {
      const missingGroups: string[] = [];
      if (pricing.missingChildPrice) missingGroups.push("trẻ em");
      if (pricing.missingInfantPrice) missingGroups.push("em bé");
      pieces.push(
        `Lưu ý: Lịch khởi hành này hiện chưa có giá công bố chính thức cho ${missingGroups.join(" và ")} (chi tiết tour đang để "Liên hệ"). Thông thường giá trẻ em khoảng 50% giá người lớn và em bé được miễn phí.`,
      );
    }

    pieces.push(`Người lớn: ${party.adults} × ${vnd.format(pricing.adultPrice)}`);

    if (party.children) {
      if (pricing.missingChildPrice) {
        pieces.push(
          `Trẻ em: ${party.children} × ${vnd.format(pricing.estimatedChildPrice)} (tạm tính 50% giá người lớn)`,
        );
      } else {
        pieces.push(`Trẻ em: ${party.children} × ${vnd.format(pricing.childPrice)}`);
      }
    }

    if (party.infants) {
      if (pricing.missingInfantPrice) {
        pieces.push(`Em bé: ${party.infants} × 0 đ (tạm tính miễn phí)`);
      } else {
        pieces.push(`Em bé: ${party.infants} × ${vnd.format(pricing.infantPrice)}`);
      }
    }

    if (pricing.appliedPromoTitle) {
      pieces.push(`Đã tính ưu đãi: ${pricing.appliedPromoTitle}.`);
    }
    if (pricing.appliedGiftDescription) {
      pieces.push(`Quà tặng: ${pricing.appliedGiftDescription}.`);
    }

    let total = pricing.estimatedSubtotal;
    if (code) {
      try {
        const amount = String(pricing.estimatedSubtotal);
        const result = accountId
          ? await this.vouchers.validateForAccount(accountId, code, amount, card.id)
          : await this.vouchers.validatePublicVoucher(code, amount, undefined, card.id);
        total = result.final_amount;
        pieces.push(`Voucher ${result.code} giảm ${vnd.format(result.discount_amount)}.`);
      } catch (error) {
        if (!(error instanceof BadRequestException)) throw error;
        pieces.push(`Chưa áp dụng mã ${code.toUpperCase()}. ${error.message}`);
      }
    }

    const date = card.departure_date
      ? new Date(card.departure_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
      : "";

    const lines = [
      `${card.title} — khởi hành ${date} từ ${match.departure}`,
      ...pieces,
      `Tiền tour dự kiến: ${vnd.format(total)}${hasEstimate ? " (tạm tính)" : ""}.`,
      hasEstimate
        ? "Để biết thêm thông tin chính xác vui lòng liên hệ nhân viên hỗ trợ."
        : "Phụ thu phòng đơn, dịch vụ thêm và giảm theo hạng thành viên sẽ được tính ở bước đặt tour.",
    ];

    return asResponse(lines.join("\n"), [card], target);
  }

  private async listOffers(found: SearchResult[], hasTourQuery: boolean) {
    const { vouchers } = await this.vouchers.getPublicHomeVouchers();
    const publicCodes = vouchers.filter((voucher) =>
      voucher.used_count < voucher.usage_limit &&
      (!hasTourQuery || found.some(({ card, tourType }) => {
        if (voucher.applicable_scope === "specific_tours" && voucher.applicable_tour_ids?.length) {
          return voucher.applicable_tour_ids.includes(card.id);
        }
        if (voucher.applicable_scope === "tour_type" && voucher.applicable_tour_types?.length) {
          return voucher.applicable_tour_types.includes(tourType);
        }
        return true;
      })));
    const offers = publicCodes.slice(0, 4).map((voucher) => {
      const amount = voucher.discount_type === "percentage"
        ? `${Number(voucher.discount_value)}%`
        : vnd.format(Number(voucher.discount_value));
      const cap = voucher.discount_type === "percentage" && voucher.max_discount_amount != null
        ? `, tối đa ${vnd.format(Number(voucher.max_discount_amount))}`
        : "";
      const scope = voucher.applicable_scope && voucher.applicable_scope !== "all" ? ", giới hạn theo tour" : "";
      const expiry = new Date(voucher.expiry_date).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      return `${voucher.code}: giảm ${amount}${cap}, đơn từ ${vnd.format(Number(voucher.min_order_value))}${scope}. Hạn ${expiry}. ${voucherAudienceLabel(voucher.eligible_tiers)}.`;
    });
    const cards = found.filter((item) => item.pricing.appliedPromoType).map((item) => item.card);
    const lines = [
      cards.length ? "Các thẻ bên dưới có ưu đãi theo lịch khởi hành." : "",
      ...offers,
      offers.length ? "Gửi mã, tên tour và số khách để mình kiểm tra điều kiện cho chuyến đi của bạn." : "",
    ].filter(Boolean);
    return asResponse(lines.join("\n") || "Mình chưa thấy ưu đãi công khai đang áp dụng cho yêu cầu này.", cards, found.length === 1 ? referenceFor(found[0].card) : undefined);
  }
}

