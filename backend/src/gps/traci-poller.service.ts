import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { GpsService } from './gps.service';

interface TraciVehicle {
  idDevice: number;
  matricule: string | null;
  markBoitier?: string | null;
}

interface TraciRealTimeRecord {
  idDevice: number;
  recordTime: number;
  coordinate?: { lat?: number; lng?: number };
  speed?: number;
  validity?: boolean;
}

@Injectable()
export class TraciPollerService implements OnModuleInit, OnModuleDestroy {
  private static readonly POLL_INTERVAL_MS = 1_000;
  private static readonly BASE_PATH = '/ws_rimtrack_all';

  private readonly logger = new Logger(TraciPollerService.name);
  private readonly baseUrl = (
    process.env.TRACI_URL || 'https://traci.tn'
  ).replace(/\/+$/, '');
  private readonly username = process.env.TRACI_USER || '';
  private readonly password = process.env.TRACI_PASS || '';

  private token: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private readonly allowedPlates: Set<string>;

  constructor(private readonly gpsService: GpsService) {
    this.allowedPlates = new Set(
      (process.env.TRACI_PLATES || '')
        .split(',')
        .map((p) => p.trim().toUpperCase().replace(/[\s\-_.]/g, ''))
        .filter(Boolean),
    );
  }

  onModuleInit() {
    if (!this.username || !this.password) {
      this.logger.log('TRACI_USER/TRACI_PASS not set - poller disabled');
      return;
    }
    this.startupTimer = setTimeout(() => {
      void this.poll();
      this.timer = setInterval(
        () => void this.poll(),
        TraciPollerService.POLL_INTERVAL_MS,
      );
    }, 5_000);
    this.logger.log(`Traci poller scheduled (${this.baseUrl})`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
  }

  private async login(): Promise<string | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}${TraciPollerService.BASE_PATH}/signin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: this.username,
            password: this.password,
          }),
        },
      );
      if (!res.ok) {
        this.logger.error(`Traci signin failed (${res.status})`);
        return null;
      }
      const data = (await res.json()) as { token?: string };
      this.token = data.token ?? null;
      return this.token;
    } catch (err) {
      this.logger.error(`Traci signin error: ${String(err)}`);
      return null;
    }
  }

  private async authorizedFetch(path: string): Promise<Response | null> {
    if (!this.token) await this.login();
    if (!this.token) return null;
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (res.status === 401) {
      this.token = null;
      if (await this.login()) {
        return fetch(`${this.baseUrl}${path}`, {
          headers: { Authorization: `Bearer ${this.token}` },
        });
      }
      return null;
    }
    return res;
  }

  async poll(): Promise<void> {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      const vehRes = await this.authorizedFetch(
        `${TraciPollerService.BASE_PATH}/vehicules/minify`,
      );
      if (!vehRes || !vehRes.ok) {
        this.logger.warn(
          `Traci vehicules fetch failed (${vehRes?.status ?? 'no response'})`,
        );
        return;
      }
      const vehicles = (await vehRes.json()) as TraciVehicle[];
      const plateByDevice = new Map<number, { plate: string; imei?: string }>();
      for (const v of vehicles) {
        if (v.idDevice == null || !v.matricule) continue;
        const normalized = v.matricule
          .trim()
          .toUpperCase()
          .replace(/[\s\-_.]/g, '');
        if (
          this.allowedPlates.size > 0 &&
          !this.allowedPlates.has(normalized)
        ) {
          continue;
        }
        const imeiMatch = /IMEI[:\s]*(\d+)/i.exec(v.markBoitier || '');
        plateByDevice.set(v.idDevice, {
          plate: v.matricule,
          imei: imeiMatch ? imeiMatch[1] : undefined,
        });
      }

      const rtRes = await this.authorizedFetch(
        `${TraciPollerService.BASE_PATH}/realTimeRecords`,
      );
      if (!rtRes || !rtRes.ok) {
        this.logger.warn(
          `Traci realtime fetch failed (${rtRes?.status ?? 'no response'})`,
        );
        return;
      }
      const records = (await rtRes.json()) as TraciRealTimeRecord[];
      let accepted = 0;
      let unknown = 0;
      let filtered = records.filter((r) => plateByDevice.has(r.idDevice))
        .length;
      for (const rec of records) {
        const lat = rec.coordinate?.lat;
        const lng = rec.coordinate?.lng;
        if (typeof lat !== 'number' || typeof lng !== 'number') continue;
        const vehicle = plateByDevice.get(rec.idDevice);
        if (!vehicle) continue;
        const result = await this.gpsService.ingest({
          imei: vehicle.imei,
          plate: vehicle.plate,
          provider: 'traci',
          lat,
          lng,
          speed: typeof rec.speed === 'number' ? rec.speed : 0,
          at: rec.recordTime ? new Date(rec.recordTime) : undefined,
        });
        if (result.accepted) accepted += 1;
        else unknown += 1;
      }
      if (filtered > 0 || unknown > 0) {
        this.logger.log(
          `Traci poll ok: ${accepted} matched, ${unknown} unknown of ${filtered}`,
        );
      }
    } catch (err) {
      this.logger.error(`Traci poll error: ${String(err)}`);
    } finally {
      this.inFlight = false;
    }
  }
}
