import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CarModule } from './car/car.module';
import { ClientModule } from './client/client.module';
import { ContratModule } from './contrat/contrat.module';
import { ReservationModule } from './reservation/reservation.module';
import { VisiteModule } from './visite/visite.module';
import { VidangeModule } from './vidange/vidange.module';
import { DepenseModule } from './depense/depense.module';
import { DashboardModule } from './dashboard/dashboard.module';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { UploadModule } from './upload/upload.module';
import { JourneeModule } from './journee/journee.module';
import { SharedModule } from './shared/shared.module';
import { SettingModule } from './setting/setting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGODB_URI!, { serverSelectionTimeoutMS: 15000, connectionTimeoutMS: 15000 }),
    SharedModule,
    CarModule,
    ClientModule,
    ContratModule,
    ReservationModule,
    VisiteModule,
    VidangeModule,
    DepenseModule,
    DashboardModule,
    AuthModule,
    UsersModule,
    UploadModule,
    JourneeModule,
    SettingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
