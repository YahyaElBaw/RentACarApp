import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { GpsService } from './gps.service';

interface WinnouPositionEntry {
  d?: Array<[string, string, string, string, string, string, number, unknown]>;
}

const normalizePlate = (plate: string) =>
  String(plate || '')
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');

@Injectable()
export class WinnouPollerService implements OnModuleInit, OnModuleDestroy {
  private static readonly POLL_INTERVAL_MS = 1_000;

  private readonly logger = new Logger(WinnouPollerService.name);
  private readonly baseUrl = (
    process.env.WINNOU_URL || 'http://www.winnou.tn'
  ).replace(/\/+$/, '');
  private readonly username = process.env.WINNOU_USER || '';
  private readonly password = process.env.WINNOU_PASS || '';

  private cookie: string | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private readonly allowedPlates: Set<string>;
  private plateByImei = new Map<string, string>();
  private lastPlateRefresh = 0;

  constructor(private readonly gpsService: GpsService) {
    this.allowedPlates = new Set(
      (process.env.WINNOU_PLATES || '')
        .split(',')
        .map((p) => normalizePlate(p))
        .filter(Boolean),
    );
  }

  onModuleInit() {
    if (!this.username || !this.password) {
      this.logger.log('WINNOU_USER/WINNOU_PASS not set - poller disabled');
      return;
    }
    this.startupTimer = setTimeout(() => {
      void this.poll();
      this.timer = setInterval(
        () => void this.poll(),
        WinnouPollerService.POLL_INTERVAL_MS,
      );
    }, 7_500);
    this.logger.log(`Winnou poller scheduled (${this.baseUrl})`);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.startupTimer) clearTimeout(this.startupTimer);
  }

  private async login(): Promise<boolean> {
    try {
      const body = new URLSearchParams({
        cmd: 'login',
        username: this.username,
        password: this.password,
        remember_me: 'false',
        mobile: 'false',
      });
      const res = await fetch(
        `${this.baseUrl}/func/fn_connect.php`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: body.toString(),
        },
      );
      const text = await res.text();
      const rawCookies =
        typeof (res.headers as any).getSetCookie === 'function'
          ? (res.headers as any).getSetCookie()
          : ([] as string[]);
      const session = rawCookies.length
        ? rawCookies.map((c: string) => c.split(';')[0]).join('; ')
        : res.headers.get('set-cookie')?.split(';')[0] || null;
      if ((text.includes('LOGIN_TRACKING') || text.includes('LOGIN_CPANEL')) && session) {
        this.cookie = session;
        return true;
      }
      this.logger.error(`Winnou login failed (${text.slice(0, 60)})`);
      this.cookie = null;
      return false;
    } catch (err) {
      this.logger.error(`Winnou login error: ${String(err)}`);
      this.cookie = null;
      return false;
    }
  }

  private async postForm(path: string, data: Record<string, string>) {
    const doFetch = () =>
      fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          ...(this.cookie ? { Cookie: this.cookie } : {}),
        },
        body: new URLSearchParams(data).toString(),
      });
    let res = await doFetch();
    if (res.status === 401 || res.status === 403) {
      if (await this.login()) res = await doFetch();
    }
    return res;
  }

  private async refreshPlates() {
    try {
      const res = await this.postForm('/func/fn_settings.objects.php', {
        cmd: 'load_object_data',
      });
      if (!res.ok) return;
      const data = (await res.json()) as Record<string, any[]>;
      for (const [imei, arr] of Object.entries(data)) {
        const plate = Array.isArray(arr) && arr.length > 4 ? String(arr[4] ?? '') : '';
        if (plate) this.plateByImei.set(imei, plate);
      }
      this.lastPlateRefresh = Date.now();
      this.logger.log(
        `Winnou plates refreshed: ${[...this.plateByImei.entries()]
          .map(([i, p]) => `${i}->${p}`)
          .join(', ')}`,
      );
    } catch (err) {
      this.logger.warn(`Winnou plate refresh failed: ${String(err)}`);
    }
  }

  private async poll() {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      if (!this.cookie && !(await this.login())) return;
      if (Date.now() - this.lastPlateRefresh > 10 * 60 * 1000) {
        void this.refreshPlates();
      }
      const res = await this.postForm('/func/fn_objects.php', {
        cmd: 'load_object_data',
      });
      if (!res.ok) {
        this.logger.warn(`Winnou realtime fetch failed (${res.status})`);
        return;
      }
      const text = await res.text();
      let records: Record<string, WinnouPositionEntry>;
      try {
        records = JSON.parse(text);
      } catch {
        this.cookie = null;
        this.logger.warn('Winnou returned non-JSON (session expired?) - relogin next poll');
        return;
      }
      let accepted = 0;
      let unknown = 0;
      let filtered = 0;
      for (const [imei, obj] of Object.entries(records)) {
        const entry = obj?.d?.[0];
        if (!entry) continue;
        const lat = Number(entry[2]);
        const lng = Number(entry[3]);
        const speed = Number(entry[6]) || 0;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        const plate = this.plateByImei.get(imei) ?? '';
        const normalized = normalizePlate(plate);
        if (this.allowedPlates.size > 0 && !this.allowedPlates.has(normalized)) {
          continue;
        }
        filtered += 1;
        const result = await this.gpsService.ingest({
          imei,
          plate: plate || undefined,
          provider: 'winnou',
          lat,
          lng,
          speed,
          at: entry[0],
        });
        if (result.accepted) accepted += 1;
        else unknown += 1;
      }
      if (filtered > 0 || unknown > 0) {
        this.logger.log(
          `Winnou poll ok: ${accepted} matched, ${unknown} unknown of ${filtered}`,
        );
      }
    } catch (err) {
      this.logger.error(`Winnou poll error: ${String(err)}`);
    } finally {
      this.inFlight = false;
    }
  }
}
