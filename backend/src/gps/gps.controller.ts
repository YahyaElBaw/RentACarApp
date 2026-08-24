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

import { TraciPollerService } from './traci-poller.service';
import { WinnouPollerService } from './winnou-poller.service';

@Controller('gps')
export class GpsController {
  private lastPollAt = 0;
  private pollPromise: Promise<any> | null = null;

  constructor(
    private readonly gpsService: GpsService,
    private readonly configService: ConfigService,
    private readonly traciPoller: TraciPollerService,
    private readonly winnouPoller: WinnouPollerService,
  ) {}

  /**
   * On serverless platforms (like Vercel), background intervals get frozen.
   * This on-demand poll triggers Winnou & Traci fetches whenever a user requests positions,
   * throttled to at most once every 2 seconds.
   */
  private async triggerPollIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastPollAt < 2000) {
      return;
    }
    if (this.pollPromise) {
      await this.pollPromise;
      return;
    }
    this.lastPollAt = now;
    this.pollPromise = Promise.allSettled([
      this.traciPoller.poll(),
      this.winnouPoller.poll(),
    ]).finally(() => {
      this.pollPromise = null;
    });
    await this.pollPromise;
  }

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
  async getPositions() {
    await this.triggerPollIfNeeded();
    return this.gpsService.getPositions();
  }

  @UseGuards(JwtAuthGuard)
  @Get('speed-alerts')
  getSpeedAlerts(@Query('limit') limit?: string) {
    return this.gpsService.getSpeedAlerts(Number(limit) || 50);
  }

  @UseGuards(JwtAuthGuard)
  @Get('km-alerts')
  getMileageAlerts(@Query('limit') limit?: string) {
    return this.gpsService.getMileageAlerts(Number(limit) || 50);
  }

  @UseGuards(JwtAuthGuard)
  @Get('km-today')
  getKmToday() {
    return this.gpsService.getKmToday();
  }

  // Sync endpoint for external cron jobs or Vercel Crons
  @Get('sync')
  async syncGps() {
    await Promise.allSettled([
      this.traciPoller.poll(),
      this.winnouPoller.poll(),
    ]);
    return {
      ok: true,
      timestamp: new Date().toISOString(),
      traci: this.traciPoller.status,
      winnou: this.winnouPoller.status,
    };
  }
}
