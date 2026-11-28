import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import {
  HomeVoucherCampaignSchema,
  UpdateVoucherPayloadSchema,
  VoucherPayloadSchema,
  type HomeVoucherCampaignInput,
  type UpdateVoucherInput,
  type VoucherInput,
} from 'shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UseImageUpload } from '../../common/decorators/use-image-upload.decorator';
import { uploadToFolder } from '../../common/decorators/use-folder-upload';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { AdminAuthGuard } from '../auth/admin.guard';
import { VouchersService } from './vouchers.service';

@Controller()
@UseGuards(AdminAuthGuard)
export class VouchersAdminController {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('admin/marketing/vouchers/upload-image')
  @UseImageUpload()
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return uploadToFolder(this.cloudinaryService, file, 'JourniTrip/vouchers');
  }

  @Get('admin/marketing/vouchers')
  async findAll() {
    return this.vouchersService.findAll();
  }

  @Get('admin/marketing/vouchers/home-campaign')
  async getHomeCampaign() {
    return this.vouchersService.getHomeVoucherConfig();
  }

  @Post('admin/marketing/vouchers/home-campaign')
  @UsePipes(new ZodValidationPipe(HomeVoucherCampaignSchema))
  async updateHomeCampaign(@Body() data: HomeVoucherCampaignInput) {
    return this.vouchersService.updateHomeVoucherConfig(data);
  }

  @Get('admin/marketing/vouchers/:id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.findOne(id);
  }

  @Post('admin/marketing/vouchers')
  @UsePipes(new ZodValidationPipe(VoucherPayloadSchema))
  async create(@Body() data: VoucherInput) {
    return this.vouchersService.create(data as any);
  }

  @Patch('admin/marketing/vouchers/:id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateVoucherPayloadSchema)) data: UpdateVoucherInput,
  ) {
    return this.vouchersService.update(id, data as any);
  }

  @Delete('admin/marketing/vouchers/:id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.remove(id);
  }
}
