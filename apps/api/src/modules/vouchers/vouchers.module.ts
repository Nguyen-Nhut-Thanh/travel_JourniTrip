import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../../infrastructure/storage/cloudinary.module';
import { VouchersAdminController } from './vouchers-admin.controller';
import { VouchersPublicController } from './vouchers-public.controller';
import { VouchersService } from './vouchers.service';
@Module({
    imports: [CloudinaryModule],
    controllers: [VouchersPublicController, VouchersAdminController],
    providers: [VouchersService],
    exports: [VouchersService],
})
export class VouchersModule {
}
