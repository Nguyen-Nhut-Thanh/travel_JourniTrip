import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards } from '@nestjs/common';
import type { TourAdminPayload } from 'shared';
import { UseImageUpload } from '../../common/decorators/use-image-upload.decorator';
import { uploadToFolder } from '../../common/decorators/use-folder-upload';
import { CloudinaryService } from '../../infrastructure/storage/cloudinary.service';
import { AdminAuthGuard } from '../auth/admin.guard';
import { ToursAdminService } from './tours-admin.service';
@Controller()
@UseGuards(AdminAuthGuard)
export class ToursAdminController {
    constructor(
        private readonly toursAdminService: ToursAdminService,
        private readonly cloudinaryService: CloudinaryService,
    ) { }
    @Post('admin/tours/upload-image')
    @UseImageUpload()
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        return uploadToFolder(this.cloudinaryService, file, 'JourniTrip/tours');
    }
    @Get('admin/tours')
    list(
    @Query('search')
    search?: string,
    @Query('status')
    status?: string) {
        return this.toursAdminService.list({ search, status });
    }
    @Post('admin/tours')
    create(
    @Body()
    body: TourAdminPayload) {
        return this.toursAdminService.create(body);
    }
    @Get('admin/tours/:id')
    detail(
    @Param('id', ParseIntPipe)
    id: number) {
        return this.toursAdminService.detail(id);
    }
    @Patch('admin/tours/:id')
    update(
    @Param('id', ParseIntPipe)
    id: number,
    @Body()
    body: TourAdminPayload) {
        return this.toursAdminService.update(id, body);
    }
    @Patch('admin/tours/:id/status')
    toggleStatus(
    @Param('id', ParseIntPipe)
    id: number) {
        return this.toursAdminService.toggleStatus(id);
    }
    @Delete('admin/tours/:id')
    deleteTour(
    @Param('id', ParseIntPipe)
    id: number) {
        return this.toursAdminService.deleteTour(id);
    }
}
