import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GpsService } from './gps.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('gps')
export class GpsController {
  constructor(
    private readonly gpsService: GpsService,
    private readonly configService: ConfigService,
  ) {}

  // Ingestion endpoint for external GPS platforms (traci.tn, winnou.tn, ...)
  @Post('webhook')
  async webhook(@Req() req: any, @Body() body: any) {
    const expectedKey = this.configService.get<string>('GPS_API_KEY');
    if (!expectedKey || req.headers['x-gps-key'] !== expectedKey) {
      throw new ForbiddenException('Clé GPS invalide.');
    }

    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { accepted: false, reason: 'lat/lng manquants' };
    }

    return this.gpsService.ingest({
      imei: body?.imei ? String(body.imei) : undefined,
      plate: body?.plate || body?.matricule || undefined,
      provider: body?.provider || undefined,
      lat,
      lng,
      speed: Number(body?.speed) || 0,
      at: body?.at,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('positions')
  getPositions() {
    return this.gpsService.getPositions();
  }

  @UseGuards(JwtAuthGuard)
  @Get('speed-alerts')
  getSpeedAlerts(@Query('limit') limit?: string) {
    return this.gpsService.getSpeedAlerts(Number(limit) || 50);
  }
}
