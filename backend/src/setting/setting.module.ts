import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SettingController } from './setting.controller';
import { SettingService } from './setting.service';
import { Setting, SettingSchema } from './schemas/setting.schema';
import { GpsModule } from '../gps/gps.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Setting.name, schema: SettingSchema }]),
    forwardRef(() => GpsModule),
  ],
  controllers: [SettingController],
  providers: [SettingService],
  exports: [SettingService],
})
export class SettingModule {}
