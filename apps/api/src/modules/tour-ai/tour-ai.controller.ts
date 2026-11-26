import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import type { AuthenticatedUser } from "../../common/auth/authenticated-request";
import { OptionalJwtAuthGuard } from "../auth/optional-jwt.guard";
import { TourCompareDto } from "./dto/tour-compare.dto";
import { TourRecommendationsDto } from "./dto/tour-recommendations.dto";
import { VirtualTryOnDto } from "./dto/tour-tryon.dto";
import { TourCompareService } from "./tour-compare.service";
import { TourRecommendationsService } from "./tour-recommendations.service";
import { TourTryOnService } from "./tour-tryon.service";

@Controller("ai")
export class TourAiController {
  constructor(
    private readonly compareService: TourCompareService,
    private readonly recommendationsService: TourRecommendationsService,
    private readonly tryonService: TourTryOnService,
  ) {}

  @Post("compare-tours")
  @HttpCode(200)
  async compareTours(@Body() body: TourCompareDto) {
    return this.compareService.compare(body.tourIds);
  }

  @Post("recommendations")
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  async getRecommendations(
    @Body() body: TourRecommendationsDto,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return this.recommendationsService.getRecommendations(body, request.user?.accountId);
  }

  @Get("tours/:tourId/costumes")
  async getTourCostumes(@Param("tourId", ParseIntPipe) tourId: number) {
    return this.tryonService.getCostumesByTour(tourId);
  }

  @Post("virtual-tryon")
  @HttpCode(200)
  @UseGuards(OptionalJwtAuthGuard)
  async virtualTryOn(
    @Body() body: VirtualTryOnDto,
    @Req() request: Request & { user?: AuthenticatedUser },
  ) {
    return this.tryonService.processTryOn(body, request.user?.accountId);
  }
}
