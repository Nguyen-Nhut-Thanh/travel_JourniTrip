import { Module } from "@nestjs/common";
import { TourAiController } from "./tour-ai.controller";
import { TourCompareService } from "./tour-compare.service";
import { TourRecommendationsService } from "./tour-recommendations.service";
import { TourTryOnService } from "./tour-tryon.service";

@Module({
  controllers: [TourAiController],
  providers: [TourCompareService, TourRecommendationsService, TourTryOnService],
  exports: [TourCompareService, TourRecommendationsService, TourTryOnService],
})
export class TourAiModule {}

