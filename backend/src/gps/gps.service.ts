import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Car, CarDocument } from '../car/schemas/car.schema';
import {
  CarPosition,
  CarPositionDocument,
} from './schemas/car-position.schema';
import {
  SpeedAlert,
  SpeedAlertDocument,
} from './schemas/speed-alert.schema';
import {
  CarKmDay,
  CarKmDayDocument,
} from './schemas/car-km-day.schema';
import {
  MileageAlert,
  MileageAlertDocument,
} from './schemas/mileage-alert.schema';
import { Contrat, ContratDocument } from '../contrat/schemas/contrat.schema';
import { Setting, SettingDocument } from '../setting/schemas/setting.schema';
import { EventsGateway } from '../events/events.gateway';

const normalizePlate = (plate: string) =>
  String(plate || '')
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');

// Default speed alert threshold (can be changed from Settings)
export const SPEED_ALERT_THRESHOLD_KMH = 130;
const SPEED_ALERT_COOLDOWN_MS = 5 * 60 * 1000; // one alert per car per 5 minutes
const SPEED_LIMIT_CACHE_TTL_MS = 30 * 1000;
// Default daily mileage alert threshold (can be changed from Settings)
export const KM_PER_DAY_LIMIT_DEFAULT = 200;
const KM_LIMIT_CACHE_TTL_MS = 30 * 1000;
// GPS jitter filters: ignore tiny jumps (stationary noise) and impossible ones
const KM_DELTA_MIN_METERS = 30;
const KM_MAX_IMPLIED_SPEED_KMH = 200;

/** Haversine distance in meters */
function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Day key YYYY-MM-DD in Tunisia local time (UTC+1, no DST) */
function tunisiaDayKey(d: Date): string {
  const shifted = new Date(d.getTime() + 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);
  private speedLimitCache: { value: number; loadedAt: number } = {
    value: SPEED_ALERT_THRESHOLD_KMH,
    loadedAt: 0,
  };
  private kmLimitCache: { value: number; loadedAt: number } = {
    value: KM_PER_DAY_LIMIT_DEFAULT,
    loadedAt: 0,
  };

  constructor(
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    @InjectModel(CarPosition.name)
    private carPositionModel: Model<CarPositionDocument>,
    @InjectModel(SpeedAlert.name)
    private speedAlertModel: Model<SpeedAlertDocument>,
    @InjectModel(CarKmDay.name)
    private carKmDayModel: Model<CarKmDayDocument>,
    @InjectModel(MileageAlert.name)
    private mileageAlertModel: Model<MileageAlertDocument>,
    @InjectModel(Contrat.name)
    private contratModel: Model<ContratDocument>,
    @InjectModel(Setting.name)
    private settingModel: Model<SettingDocument>,
    private eventsGateway: EventsGateway,
  ) {}

  /** Configurable alert threshold (floating number) with a short cache */
  private async getSpeedAlertLimit(): Promise<number> {
    if (Date.now() - this.speedLimitCache.loadedAt < SPEED_LIMIT_CACHE_TTL_MS) {
      return this.speedLimitCache.value;
    }
    try {
      const settings = await this.settingModel
        .findOne()
        .select('speedAlertLimit')
        .lean()
        .exec();
      const value = Number((settings as any)?.speedAlertLimit);
      if (Number.isFinite(value) && value > 0) {
        this.speedLimitCache.value = value;
      }
      this.speedLimitCache.loadedAt = Date.now();
    } catch (err) {
      this.logger.warn(`Failed to load speed limit setting: ${String(err)}`);
      this.speedLimitCache.loadedAt = Date.now();
    }
    return this.speedLimitCache.value;
  }

  /** Configurable daily mileage limit with a short cache */
  private async getKmPerDayLimit(): Promise<number> {
    if (Date.now() - this.kmLimitCache.loadedAt < KM_LIMIT_CACHE_TTL_MS) {
      return this.kmLimitCache.value;
    }
    try {
      const settings = await this.settingModel
        .findOne()
        .select('kmPerDayLimit')
        .lean()
        .exec();
      const value = Number((settings as any)?.kmPerDayLimit);
      if (Number.isFinite(value) && value > 0) {
        this.kmLimitCache.value = value;
      }
      this.kmLimitCache.loadedAt = Date.now();
    } catch (err) {
      this.logger.warn(`Failed to load km/day limit setting: ${String(err)}`);
      this.kmLimitCache.loadedAt = Date.now();
    }
    return this.kmLimitCache.value;
  }

  /** True when the car currently has an active/soon contract spanning now */
  private async isCarRented(carId: Types.ObjectId): Promise<boolean> {
    try {
      const now = new Date();
      const count = await this.contratModel
        .countDocuments({
          status: { $in: ['active', 'soon'] },
          startDate: { $lte: now },
          endDate: { $gte: now },
          car: { $in: [carId, String(carId)] },
        })
        .exec();
      return count > 0;
    } catch (err) {
      this.logger.warn(`Rental check failed: ${String(err)}`);
      return false;
    }
  }

  /**
   * Accumulates distance traveled per car per day from consecutive GPS fixes
   * and fires a one-shot notification when a rented car crosses the km/day limit.
   */
  private async trackDailyKm(
    car: CarDocument,
    dto: { lat: number; lng: number; provider?: string },
    positionAt: Date,
  ): Promise<void> {
    try {
      const day = tunisiaDayKey(positionAt);
      const prev = await this.carKmDayModel
        .findOneAndUpdate(
          { carId: car._id, day },
          { $setOnInsert: { km: 0, alertSent: false } },
          { upsert: true, new: false },
        )
        .exec();

      // First fix of the day: just anchor the starting point.
      if (!prev || prev.lastLat == null || prev.lastLng == null) {
        await this.carKmDayModel.updateOne(
          { carId: car._id, day },
          {
            $set: {
              lastLat: dto.lat,
              lastLng: dto.lng,
              lastFixAt: positionAt,
            },
          },
        ).exec();
        return;
      }

      const meters = haversineMeters(
        prev.lastLat,
        prev.lastLng,
        dto.lat,
        dto.lng,
      );
      const dtHours =
        (positionAt.getTime() -
          (prev.lastFixAt ? new Date(prev.lastFixAt).getTime() : positionAt.getTime())) /
        3600000;

      let deltaKm = 0;
      const impliedSpeed = dtHours > 0 ? meters / 1000 / dtHours : 0;
      const plausible =
        meters >= KM_DELTA_MIN_METERS &&
        impliedSpeed <= KM_MAX_IMPLIED_SPEED_KMH;
      if (plausible && prev.lastFixAt && dtHours > 0) {
        deltaKm = meters / 1000;
      }

      const totalKm = Number(prev.km || 0) + deltaKm;

      const update: any = {
        lastLat: dto.lat,
        lastLng: dto.lng,
        lastFixAt: positionAt,
      };
      if (deltaKm > 0) update.$inc = { km: deltaKm };

      await this.carKmDayModel
        .updateOne({ _id: (prev as any)._id }, update)
        .exec();

      if (!prev.alertSent && totalKm >= (await this.getKmPerDayLimit())) {
        void this.recordMileageAlert(car, totalKm, dto, positionAt, day);
      }
    } catch (err) {
      this.logger.error(`Failed to track daily km: ${String(err)}`);
    }
  }

  private async recordMileageAlert(
    car: CarDocument,
    kmToday: number,
    dto: { provider?: string },
    positionAt: Date,
    day: string,
  ): Promise<void> {
    try {
      // Only rented cars trigger the notification.
      if (!(await this.isCarRented(car._id))) return;

      const limit = await this.getKmPerDayLimit();
      const alert = await this.mileageAlertModel.create({
        carId: car._id,
        matricule: car.matricule || '',
        brand: car.brand || '',
        model: car.model || '',
        kmToday: Math.round(kmToday * 10) / 10,
        limit,
        provider: dto.provider || '',
        alertAt: positionAt,
      });

      await this.carKmDayModel
        .updateOne({ carId: car._id, day }, { $set: { alertSent: true } })
        .exec();

      this.logger.warn(
        `KM ALERT: ${car.brand} ${car.model} (${car.matricule}) traveled ${alert.kmToday} km today (limit ${limit})`,
      );

      this.eventsGateway.broadcastDataChange('gps:km-alert', {
        _id: String(alert._id),
        carId: String(car._id),
        matricule: car.matricule || '',
        brand: car.brand || '',
        model: car.model || '',
        kmToday: alert.kmToday,
        limit,
        provider: dto.provider || '',
        alertAt: positionAt.toISOString(),
      });
    } catch (err) {
      this.logger.error(`Failed to record mileage alert: ${String(err)}`);
    }
  }

  async ingest(dto: {
    imei?: string;
    plate?: string;
    provider?: string;
    lat: number;
    lng: number;
    speed?: number;
    at?: string | Date;
  }) {
    let car: CarDocument | null = null;

    if (dto.imei) {
      car = await this.carModel.findOne({ gpsImei: String(dto.imei).trim() });
    }
    if (!car && dto.plate) {
      const wanted = normalizePlate(dto.plate);
      const allCars = await this.carModel.find().exec();
      car = allCars.find((c) => normalizePlate(c.matricule) === wanted) ?? null;
    }
    if (!car) {
      this.logger.warn(
        `GPS fix for unknown device (imei=${dto.imei ?? '-'} plate=${dto.plate ?? '-'})`,
      );
      return { accepted: false };
    }

    const positionAt = dto.at ? new Date(dto.at) : new Date();
    await this.carPositionModel.updateOne(
      { carId: car._id },
      {
        $set: {
          lat: dto.lat,
          lng: dto.lng,
          speed: dto.speed ?? 0,
          provider: dto.provider ?? '',
          imei: dto.imei ?? '',
          positionAt,
        },
      },
      { upsert: true },
    );

    if ((dto.speed ?? 0) >= (await this.getSpeedAlertLimit())) {
      void this.recordSpeedAlert(car, dto, positionAt);
    }

    void this.trackDailyKm(car, dto, positionAt);

    return { accepted: true };
  }

  private async recordSpeedAlert(
    car: CarDocument,
    dto: { lat: number; lng: number; speed?: number; provider?: string },
    positionAt: Date,
  ): Promise<void> {
    try {
      const limit = await this.getSpeedAlertLimit();
      const lastAlert = await this.speedAlertModel
        .findOne({ carId: car._id })
        .sort({ alertAt: -1 })
        .exec();

      if (
        lastAlert &&
        positionAt.getTime() - new Date(lastAlert.alertAt).getTime() <
          SPEED_ALERT_COOLDOWN_MS
      ) {
        return;
      }

      const alert = await this.speedAlertModel.create({
        carId: car._id,
        matricule: car.matricule || '',
        brand: car.brand || '',
        model: car.model || '',
        speed: dto.speed ?? 0,
        lat: dto.lat,
        lng: dto.lng,
        provider: dto.provider || '',
        alertAt: positionAt,
      });

      this.logger.warn(
        `SPEED ALERT: ${car.brand} ${car.model} (${car.matricule}) at ${dto.speed} km/h (limit ${limit})`,
      );

      this.eventsGateway.broadcastDataChange('gps:speed-alert', {
        _id: String(alert._id),
        carId: String(car._id),
        matricule: car.matricule || '',
        brand: car.brand || '',
        model: car.model || '',
        speed: dto.speed ?? 0,
        limit,
        lat: dto.lat,
        lng: dto.lng,
        provider: dto.provider || '',
        alertAt: positionAt.toISOString(),
      });
    } catch (err) {
      this.logger.error(`Failed to record speed alert: ${String(err)}`);
    }
  }

  async getSpeedAlerts(limit = 50): Promise<SpeedAlertDocument[]> {
    return this.speedAlertModel
      .find()
      .sort({ alertAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .exec();
  }

  async getMileageAlerts(limit = 50): Promise<MileageAlertDocument[]> {
    return this.mileageAlertModel
      .find()
      .sort({ alertAt: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .exec();
  }

  async getPositions() {
    const positions = await this.carPositionModel
      .find()
      .populate('carId', 'matricule brand model color isAvailable')
      .exec();

    const carIds = positions
      .map((p: any) => p.carId?._id)
      .filter((id: any) => id);
    const activeByCar = new Map<string, any>();
    if (carIds.length > 0) {
      const now = new Date();
      // `car` can be stored as ObjectId OR as plain string in existing data,
      // so match both variants.
      const idVariants = [...carIds, ...carIds.map(String)];
      const contrats = await this.contratModel
        .find({
          status: { $in: ['active', 'soon'] },
          startDate: { $lte: now },
          endDate: { $gte: now },
          car: { $in: idVariants },
        })
        .sort({ startDate: -1 })
        .populate({
          path: 'clients',
          model: 'Client',
          select:
            '_id firstName lastName phone phoneCountryCode cin email address',
        })
        .exec();
      for (const c of contrats) {
        const key = String((c as any).car);
        if (!activeByCar.has(key)) {
          activeByCar.set(key, {
            _id: String(c._id),
            reference: c.reference,
            startDate: c.startDate,
            endDate: c.endDate,
            totalAmount: c.totalAmount,
            depositAmount: c.depositAmount,
            carDailyRate: c.carDailyRate,
            paymentMethod: c.paymentMethod,
            lieuDepart: c.lieuDepart,
            lieuRetour: c.lieuRetour,
            isPaid: c.isPaid,
            clients: ((c.clients as any[]) || []).map((cl) => ({
              _id: cl?._id ? String(cl._id) : undefined,
              firstName: cl.firstName,
              lastName: cl.lastName,
              phone: cl.phone,
              phoneCountryCode: cl.phoneCountryCode,
              cin: cl.cin,
              email: cl.email,
              address: cl.address,
            })),
          });
        }
      }
    }

    return positions
      .filter((p) => p.carId)
      .map((p: any) => ({
        _id: p._id,
        carId: p.carId?._id ?? p.carId,
        matricule: p.carId?.matricule ?? '',
        brand: p.carId?.brand ?? '',
        model: p.carId?.model ?? '',
        carColor: p.carId?.color ?? '',
        isAvailable: p.carId?.isAvailable ?? true,
        rental: activeByCar.get(String(p.carId?._id)) ?? null,
        lat: p.lat,
        lng: p.lng,
        speed: p.speed,
        provider: p.provider,
        imei: p.imei,
        positionAt: p.positionAt,
      }))
      .sort((a, b) => a.matricule.localeCompare(b.matricule));
  }
}
