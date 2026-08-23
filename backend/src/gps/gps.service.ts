import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Car, CarDocument } from '../car/schemas/car.schema';
import {
  CarPosition,
  CarPositionDocument,
} from './schemas/car-position.schema';
import { Contrat, ContratDocument } from '../contrat/schemas/contrat.schema';

const normalizePlate = (plate: string) =>
  String(plate || '')
    .toUpperCase()
    .replace(/[\s\-_.]/g, '');

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);

  constructor(
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    @InjectModel(CarPosition.name)
    private carPositionModel: Model<CarPositionDocument>,
    @InjectModel(Contrat.name)
    private contratModel: Model<ContratDocument>,
  ) {}

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
    return { accepted: true };
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
