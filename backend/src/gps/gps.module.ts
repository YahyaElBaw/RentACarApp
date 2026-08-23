import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GpsController } from './gps.controller';
import { GpsService } from './gps.service';
import { TraciPollerService } from './traci-poller.service';
import { WinnouPollerService } from './winnou-poller.service';
import { CarModule } from '../car/car.module';
import {
  CarPosition,
  CarPositionSchema,
} from './schemas/car-position.schema';
import { Contrat, ContratSchema } from '../contrat/schemas/contrat.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CarPosition.name, schema: CarPositionSchema },
      { name: Contrat.name, schema: ContratSchema },
    ]),
    CarModule,
  ],
  controllers: [GpsController],
  providers: [GpsService, TraciPollerService, WinnouPollerService],
})
export class GpsModule {}
