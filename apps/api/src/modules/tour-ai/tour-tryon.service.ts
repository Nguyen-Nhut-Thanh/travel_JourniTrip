import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "../../infrastructure/database/prisma.service";
import { VirtualTryOnDto } from "./dto/tour-tryon.dto";

@Injectable()
export class TourTryOnService {
  private readonly logger = new Logger(TourTryOnService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCostumesByTour(tourId: number) {
    return this.prisma.tour_costumes.findMany({
      where: { tour_id: tourId, is_active: true },
      orderBy: { costume_id: "asc" },
    });
  }

  async processTryOn(dto: VirtualTryOnDto, accountId?: number) {
    const costume = await this.prisma.tour_costumes.findUnique({
      where: { costume_id: dto.costumeId },
    });

    if (!costume || !costume.is_active) {
      throw new NotFoundException("Không tìm thấy trang phục đã chọn hoặc trang phục tạm ngưng áp dụng.");
    }

    const tour = await this.prisma.tours.findUnique({
      where: { tour_id: costume.tour_id },
      select: { tour_id: true, name: true },
    });

    let userId: number | null = null;
    if (accountId) {
      const user = await this.prisma.users.findUnique({
        where: { account_id: accountId },
        select: { user_id: true },
      });
      userId = user?.user_id ?? null;
    }

    // Call AI Service
    const origin = process.env.AI_SERVICE_URL?.trim().replace(/\/+$/, "") || "http://127.0.0.1:8000";
    const token = process.env.AI_SERVICE_TOKEN?.trim();

    const isBase64 = dto.userImage.startsWith("data:");
    const payload = {
      user_image_base64: isBase64 ? dto.userImage : null,
      user_image_url: !isBase64 ? dto.userImage : null,
      costume_id: costume.costume_id,
      costume_name: costume.name,
      costume_image_url: costume.image_url,
      costume_category: costume.category,
      costume_keywords: costume.prompt_keywords,
      gender: costume.gender,
      destination_backdrop: dto.destinationBackdrop || tour?.name || null,
      preserve_background: dto.preserveBackground ?? true,
    };

    try {
      this.logger.log(`Calling AI Virtual Try-On for costume #${costume.costume_id} (${costume.name})`);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${origin}/try-on/generate`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(65_000),
      });

      if (!res.ok) {
        const errorText = await res.text();
        this.logger.error(`AI Try-On failed with status ${res.status}: ${errorText}`);
        throw new Error(`AI Service returned ${res.status}`);
      }

      const data = (await res.json()) as {
        success: boolean;
        result_image_url: string;
        costume_id: number;
        message?: string;
      };

      // Save try-on log to database
      try {
        await this.prisma.user_costume_tryon_logs.create({
          data: {
            tour_id: costume.tour_id,
            costume_id: costume.costume_id,
            user_id: userId,
            original_image: dto.userImage.slice(0, 500),
            result_image: data.result_image_url.slice(0, 500),
            status: "success",
          },
        });
      } catch (dbError) {
        this.logger.warn(`Failed to save tryon log to DB: ${dbError}`);
      }

      return {
        success: true,
        resultImageUrl: data.result_image_url,
        costumeId: costume.costume_id,
        costumeName: costume.name,
        message: data.message || "Tạo ảnh thử đồ thành công!",
      };
    } catch (error) {
      this.logger.error("Virtual Try-On error: ", error);
      throw new ServiceUnavailableException(
        "Dịch vụ thử đồ AI hiện đang bận hoặc quá tải. Quý khách vui lòng thử lại sau giây lát!"
      );
    }
  }
}
