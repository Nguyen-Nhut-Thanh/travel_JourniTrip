import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { BookingPayload } from "shared";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { BookingsService } from "./bookings.service";
@UseGuards(JwtAuthGuard)
@Controller("bookings")
export class BookingsController {
  constructor(private readonly service: BookingsService) {}
  @Post("check-conflicts")
  checkConflicts(
    @Body()
    dto: {
      tour_schedule_id: number;
      travelers: Array<{ fullName: string; idNumber?: string }>;
    },
    @Req()
    req: any,
  ) {
    return this.service.checkScheduleConflictsForAccount(
      req.user?.accountId,
      dto.tour_schedule_id,
      dto.travelers || [],
    );
  }
  @Post()
  create(
    @Body()
    dto: BookingPayload,
    @Req()
    req: any,
  ) {
    return this.service.createForAccount(req.user.accountId, dto);
  }
  @Get("my")
  list(
    @Req()
    req: any,
  ) {
    return this.service.listForAccount(req.user.accountId);
  }
  @Get("stats")
  stats(
    @Req()
    req: any,
  ) {
    return this.service.statsForAccount(req.user.accountId);
  }
  @Post(":id/cancel-request")
  cancel(
    @Param("id", ParseIntPipe)
    id: number,
    @Body()
    dto: {
      reason?: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountName?: string;
      estimatedRefundAmount?: number;
      travelerIds?: number[];
    },
    @Req()
    req: any,
  ) {
    return this.service.cancelForAccount(id, req.user.accountId, dto);
  }
  @Post(":id/resolve-proposal")
  resolveProposal(
    @Param("id", ParseIntPipe)
    id: number,
    @Body()
    dto: {
      decision: "full_refund" | "reschedule";
      proposalId: string;
      bankName?: string;
      bankAccountNumber?: string;
      bankAccountName?: string;
      supportNote?: string;
    },
    @Req()
    req: any,
  ) {
    return this.service.resolveProposalForAccount(id, req.user.accountId, dto);
  }

  @Post(":id/refund-bank")
  updateRefundBank(@Param("id", ParseIntPipe) id: number, @Body() dto: any, @Req() req: any) {
    return this.service.updateRefundBankForAccount(id, req.user.accountId, dto);
  }
  @Post(":id/withdraw-cancel")
  withdrawCancel(@Param("id", ParseIntPipe) id: number, @Req() req: any) {
    return this.service.withdrawCancelForAccount(id, req.user.accountId);
  }

  @Get(":id")
  detail(
    @Param("id", ParseIntPipe)
    id: number,
    @Req()
    req: any,
  ) {
    return this.service.detailForAccount(id, req.user.accountId);
  }
}
