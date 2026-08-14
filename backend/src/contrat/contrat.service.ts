import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contrat, ContratDocument } from './schemas/contrat.schema';
import { Car, CarDocument } from '../car/schemas/car.schema';
import { Client, ClientDocument } from '../client/schemas/client.schema';
import {
  Reservation,
  ReservationDocument,
} from '../reservation/schemas/reservation.schema';
import { Depense, DepenseDocument } from '../depense/schemas/depense.schema';

import { JourneeService } from '../journee/journee.service';
import { BookingConflictService } from '../shared/booking-conflict.service';
import { SettingService } from '../setting/setting.service';
import { LogService } from '../log/log.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ContratService implements OnModuleInit {
  constructor(
    @InjectModel(Contrat.name) private contratModel: Model<ContratDocument>,
    @InjectModel(Car.name) private carModel: Model<CarDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectModel(Reservation.name)
    private reservationModel: Model<ReservationDocument>,
    @InjectModel(Depense.name) private depenseModel: Model<DepenseDocument>,
    private journeeService: JourneeService,
    private bookingConflictService: BookingConflictService,
    private settingService: SettingService,
    private logService: LogService,
    private eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    try {
      await this.contratModel
        .updateMany(
          { carburantLevel: { $exists: false } },
          { $set: { carburantLevel: 50 } },
        )
        .exec();
      await this.contratModel
        .updateMany(
          { lieuDepart: { $exists: false } },
          { $set: { lieuDepart: 'Djerba' } },
        )
        .exec();
      await this.contratModel
        .updateMany(
          { lieuRetour: { $exists: false } },
          { $set: { lieuRetour: 'Djerba' } },
        )
        .exec();
    } catch (err) {
      console.error('Error auto-migrating contrat fields on module init:', err);
    }
  }

  private generateReference(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `CTR-${today}-${random}`;
  }

  async create(
    createContratDto: any,
    actor?: any,
  ): Promise<ContratDocument> {
    const car = await this.carModel.findById(createContratDto.car).exec();
    if (!car) throw new NotFoundException('Car not found');

    if (createContratDto.clients && createContratDto.clients.length > 2) {
      throw new BadRequestException(
        'A contract can have a maximum of 2 clients.',
      );
    }

    const start = new Date(createContratDto.startDate);
    const end = new Date(createContratDto.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const settings = await this.settingService.getSettings();
    const dailyRate =
      createContratDto.carDailyRate !== undefined
        ? createContratDto.carDailyRate
        : car.dailyRate || 0;
    createContratDto.carDailyRate = dailyRate;

    const baseAmount = diffDays * dailyRate;
    let taxAmount = 0;
    let tvaAmount = 0;

    // Use DTO values if provided (manual override), otherwise use settings
    const currentTaxValue =
      createContratDto.contractTaxValue !== undefined
        ? createContratDto.contractTaxValue
        : settings.contractTaxValue;

    const currentTvaValue =
      createContratDto.tvaValue !== undefined
        ? createContratDto.tvaValue
        : settings.tvaValue;

    // The client pays only Base + TVA (on Base only)
    if (settings.tvaEnabled) {
      tvaAmount = baseAmount * (currentTvaValue / 100);
    }

    createContratDto.totalAmount =
      Math.round((baseAmount + tvaAmount) * 100) / 100;

    // Tax is now an internal expense (Depense), client doesn't pay it
    if (settings.contractTaxEnabled) {
      taxAmount = currentTaxValue || 0;
    }

    createContratDto.contractTaxValue = taxAmount;
    createContratDto.tvaValue = currentTvaValue;
    createContratDto.createdBy = actor?.id;

    if (!createContratDto.reference) {
      createContratDto.reference = this.generateReference();
    }

    if (!createContratDto.startMileage) {
      createContratDto.startMileage = car.mileage || 0;
    }

    // Conflict Check (Overlapping confirmed reservations OR other contracts)
    const conflicts = await this.bookingConflictService.findConflicts(
      createContratDto.car,
      start,
      end,
      createContratDto.reservation, // Exclude the reservation being converted
    );

    if (conflicts.hasConflicts && createContratDto.force !== true) {
      throw new ConflictException({
        message: 'CAR_RESERVED_CONFLICT',
        conflicts: {
          reservations: conflicts.reservations,
          contracts: conflicts.contracts,
        },
      });
    }

    if (createContratDto.force && conflicts.reservations.length > 0) {
      // Return conflicting reservations to planning (pending)
      await this.reservationModel
        .updateMany(
          { _id: { $in: conflicts.reservations.map((c) => c._id) } },
          { status: 'pending' },
        )
        .exec();
    }
    // Decide status and car availability based on start date
    const now = new Date();
    const isFuture = start > now;
    createContratDto.status = isFuture ? 'soon' : 'active';

    const createdContrat = new this.contratModel(
      createContratDto,
    ) as ContratDocument;

    // Link to reservation if provided
    if (createContratDto.reservation) {
      createdContrat.reservation = createContratDto.reservation;
    }

    const savedContrat = await createdContrat.save();

    // Auto-update car's dailyRate to match the contract's rate
    if (dailyRate > 0 && dailyRate !== car.dailyRate) {
      await this.carModel.findByIdAndUpdate(car._id, { dailyRate }).exec();
    }

    // Auto-update car's mileage with the contract's start mileage
    if (createContratDto.startMileage > (car.mileage || 0)) {
      await this.carModel
        .findByIdAndUpdate(car._id, { mileage: createContratDto.startMileage })
        .exec();
    }

    // Create a Depense (Expense) for the contract fee if it exists
    if (taxAmount > 0) {
      await new this.depenseModel({
        car: car._id,
        date: new Date(),
        amount: taxAmount,
        category: 'Frais sur contrat',
        description: `Taxe/Frais pour le contrat ${savedContrat.reference}`,
      }).save();
    }

    // If linked to reservation, update reservation status and link
    if (createContratDto.reservation) {
      await this.reservationModel
        .findByIdAndUpdate(createContratDto.reservation, {
          status: 'confirmed',
          contrat: savedContrat._id,
        })
        .exec();
    }

    // Log to Journee
    await this.journeeService.addEntry(
      'CONTRAT_OUVERT',
      `Ouverture du contrat ${savedContrat.reference} (${car.brand} ${car.model})`,
      savedContrat.totalAmount || 0,
      savedContrat.reference,
    );

    await this.logService.add({
      action: 'CONTRAT_CREATED',
      actorId: actor?.id,
      actorName: actor?.name,
      role: actor?.role,
      detail: `Création du contrat ${savedContrat.reference} (${car.brand} ${car.model}) — montant ${savedContrat.totalAmount} TND`,
    });

    // Mark car as unavailable ONLY if the contract is active today
    if (savedContrat.status === 'active') {
      await this.carModel
        .findByIdAndUpdate(car._id, { isAvailable: false })
        .exec();
    }

    // Increment totalRents for all clients in this contract
    if (createContratDto.clients && createContratDto.clients.length > 0) {
      await this.clientModel
        .updateMany(
          { _id: { $in: createContratDto.clients } },
          { $inc: { totalRents: 1 } },
        )
        .exec();
    }

    this.eventsGateway.broadcastDataChange('contract:change', {
      action: 'created',
      reference: savedContrat.reference,
    });

    return savedContrat;
  }

  async findAll(filters: any = {}): Promise<ContratDocument[]> {
    const now = new Date();

    // Auto-activate 'soon' contracts whose start time has passed
    const toActivate = await this.contratModel
      .find({
        status: 'soon',
        startDate: { $lte: now },
      })
      .exec();

    if (toActivate.length > 0) {
      for (const contrat of toActivate) {
        contrat.status = 'active';
        await (contrat as any).save();
        await this.carModel
          .findByIdAndUpdate(contrat.car, { isAvailable: false })
          .exec();
      }
    }

    // Auto-terminate 'active' contracts whose end date has passed
    const toTerminate = await this.contratModel
      .find({
        status: 'active',
        endDate: { $lte: now },
      })
      .exec();

    if (toTerminate.length > 0) {
      for (const contrat of toTerminate) {
        contrat.status = 'terminé';
        await (contrat as any).save();
        await this.carModel
          .findByIdAndUpdate(contrat.car, { isAvailable: true })
          .exec();
      }
    }

    const query: any = {};
    if (filters.status) query['status'] = filters.status;
    if (filters.carId) query['car'] = filters.carId;
    if (filters.clientId) {
      query['$or'] = [
        { clients: filters.clientId },
        { client: filters.clientId },
      ];
    }

    return this.contratModel
      .find(query)
      .populate('car')
      .populate({ path: 'clients', model: 'Client' })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<ContratDocument> {
    const contrat = await this.contratModel
      .findById(id)
      .populate('car')
      .populate({ path: 'clients', model: 'Client' })
      .populate('createdBy', 'firstName lastName')
      .exec();
    if (!contrat)
      throw new NotFoundException(`Contract with ID ${id} not found`);

    // Safety check for client population
    if (!contrat.clients) {
      (contrat as any).clients = [];
    }

    return contrat;
  }

  async close(
    id: string,
    closureData: any,
    actor?: any,
  ): Promise<ContratDocument> {
    const contrat = await this.findOne(id);
    if (contrat.status !== 'active' && contrat.status !== 'terminé') {
      throw new BadRequestException(
        'Seuls les contrats actifs ou terminés peuvent être clôturés',
      );
    }

    // Determine status based on closureType
    contrat.status =
      closureData.closureType === 'terminé' ? 'terminé' : 'clôturé';
    contrat.returnMileage = closureData.returnMileage;
    contrat.carStateAtReturn = closureData.carStateAtReturn;
    contrat.closureType = closureData.closureType;
    contrat.closureNotes = closureData.closureNotes;
    contrat.isPaid = closureData.isPaid;

    await contrat.save();

    // Restore car availability and update mileage
    const carUpdate: any = {
      isAvailable: closureData.carStateAtReturn === 'disponible',
      mileage: closureData.returnMileage,
    };
    await this.carModel.findByIdAndUpdate(contrat.car, carUpdate).exec();

    await this.logService.add({
      action: 'CONTRAT_CLOSED',
      actorId: actor?.id,
      actorName: actor?.name,
      role: actor?.role,
      detail: `Clôture du contrat ${contrat.reference} — statut: ${contrat.status}, kilométrage retour: ${closureData.returnMileage} km`,
    });

    this.eventsGateway.broadcastDataChange('contract:change', {
      action: 'closed',
      reference: contrat.reference,
    });

    return contrat;
  }

  async cancel(id: string, actor?: any): Promise<ContratDocument> {
    const contrat = await this.findOne(id);
    if (contrat.status !== 'active' && contrat.status !== 'soon') {
      throw new BadRequestException(
        'Only active or upcoming contracts can be cancelled',
      );
    }

    contrat.status = 'cancelled';
    await (contrat as any).save();

    // Restore car availability
    await this.carModel
      .findByIdAndUpdate(contrat.car, { isAvailable: true })
      .exec();

    await this.logService.add({
      action: 'CONTRAT_CANCELLED',
      actorId: actor?.id,
      actorName: actor?.name,
      role: actor?.role,
      detail: `Annulation du contrat ${contrat.reference}`,
    });

    this.eventsGateway.broadcastDataChange('contract:change', {
      action: 'cancelled',
      reference: contrat.reference,
    });

    return contrat;
  }

  async update(
    id: string,
    updateContratDto: any,
    actor?: any,
  ): Promise<ContratDocument> {
    const contrat = await this.contratModel.findById(id).exec();
    if (!contrat)
      throw new NotFoundException(`Contract with ID ${id} not found`);

    const startDate = updateContratDto.startDate
      ? new Date(updateContratDto.startDate)
      : contrat.startDate;
    const endDate = updateContratDto.endDate
      ? new Date(updateContratDto.endDate)
      : contrat.endDate;
    const carId =
      updateContratDto.car || (contrat.car ? contrat.car.toString() : null);

    if (!carId) throw new BadRequestException('Contract has no car assigned.');

    const car = await this.carModel.findById(carId).exec();
    if (!car) throw new NotFoundException('Car not found');

    if (updateContratDto.clients && updateContratDto.clients.length > 2) {
      throw new BadRequestException(
        'A contract can have a maximum of 2 clients.',
      );
    }

    // Check conflict if car or dates changed (60s tolerance to handle timezone/rounding)
    const TOLERANCE_MS = 60 * 1000;
    const datesChanged =
      (updateContratDto.startDate &&
        Math.abs(
          new Date(updateContratDto.startDate).getTime() -
            new Date(contrat.startDate).getTime(),
        ) > TOLERANCE_MS) ||
      (updateContratDto.endDate &&
        Math.abs(
          new Date(updateContratDto.endDate).getTime() -
            new Date(contrat.endDate).getTime(),
        ) > TOLERANCE_MS);
    const carChanged =
      updateContratDto.car &&
      updateContratDto.car.toString() !== contrat.car.toString();

    if (datesChanged || carChanged) {
      const conflicts = await this.bookingConflictService.findConflicts(
        carId,
        startDate,
        endDate,
        undefined,
        contrat._id.toString(),
      );

      if (conflicts.hasConflicts && updateContratDto.force !== true) {
        throw new ConflictException({
          message: 'CAR_RESERVED_CONFLICT',
          conflicts: {
            reservations: conflicts.reservations,
            contracts: conflicts.contracts,
          },
        });
      }

      if (updateContratDto.force && conflicts.reservations.length > 0) {
        await this.reservationModel
          .updateMany(
            { _id: { $in: conflicts.reservations.map((c) => c._id) } },
            { status: 'pending' },
          )
          .exec();
      }
    }

    // Recalculate amount if dates or car or rates changed, and if not manually specified in the update DTO
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const settings = await this.settingService.getSettings();
    const dailyRate =
      updateContratDto.carDailyRate !== undefined
        ? updateContratDto.carDailyRate
        : contrat.carDailyRate !== undefined
          ? contrat.carDailyRate
          : car.dailyRate || 0;

    const baseAmount = diffDays * dailyRate;

    const currentTaxValue =
      updateContratDto.contractTaxValue !== undefined
        ? updateContratDto.contractTaxValue
        : contrat.contractTaxValue;

    const currentTvaValue =
      updateContratDto.tvaValue !== undefined
        ? updateContratDto.tvaValue
        : contrat.tvaValue;

    let tvaAmount = 0;
    if (settings.tvaEnabled) {
      tvaAmount = baseAmount * (currentTvaValue / 100);
    }

    const totalAmount =
      updateContratDto.totalAmount !== undefined
        ? updateContratDto.totalAmount
        : Math.round((baseAmount + tvaAmount) * 100) / 100;

    // Handle car availability if car changed or status changed
    const oldCarId = contrat.car ? contrat.car.toString() : null;
    const oldStatus = contrat.status;
    const newStatus = updateContratDto.status || contrat.status;

    // Handle client count adjustments if clients changed
    if (updateContratDto.clients) {
      const oldClients = contrat.clients
        ? contrat.clients.map((c) => c.toString())
        : [];
      const newClients = updateContratDto.clients.map((c: any) => c.toString());

      const addedClients = newClients.filter(
        (c: any) => !oldClients.includes(c),
      );
      const removedClients = oldClients.filter(
        (c: any) => !newClients.includes(c),
      );

      if (addedClients.length > 0) {
        await this.clientModel
          .updateMany(
            { _id: { $in: addedClients } },
            { $inc: { totalRents: 1 } },
          )
          .exec();
      }
      if (removedClients.length > 0) {
        await this.clientModel
          .updateMany(
            { _id: { $in: removedClients } },
            { $inc: { totalRents: -1 } },
          )
          .exec();
      }
    }

    // Apply all updates directly to the document
    contrat.car = carId;
    contrat.startDate = startDate;
    contrat.endDate = endDate;
    contrat.carDailyRate = dailyRate;
    contrat.totalAmount = totalAmount;
    contrat.contractTaxValue = currentTaxValue;
    contrat.tvaValue = currentTvaValue;

    if (updateContratDto.clients !== undefined)
      contrat.clients = updateContratDto.clients;
    if (updateContratDto.depositAmount !== undefined)
      contrat.depositAmount = Number(updateContratDto.depositAmount);
    if (updateContratDto.status !== undefined)
      contrat.status = updateContratDto.status;
    if (updateContratDto.paymentMethod !== undefined)
      contrat.paymentMethod = updateContratDto.paymentMethod;
    if (updateContratDto.chequeNumber !== undefined)
      contrat.chequeNumber = updateContratDto.chequeNumber;
    if (updateContratDto.bankName !== undefined)
      contrat.bankName = updateContratDto.bankName;
    if (updateContratDto.notes !== undefined)
      contrat.notes = updateContratDto.notes;
    if (updateContratDto.agency !== undefined)
      contrat.agency = updateContratDto.agency;
    if (
      updateContratDto.carburantLevel !== undefined &&
      updateContratDto.carburantLevel !== null
    ) {
      contrat.carburantLevel = Number(updateContratDto.carburantLevel);
    }
    if (updateContratDto.lieuDepart !== undefined) {
      contrat.lieuDepart = String(updateContratDto.lieuDepart).trim();
    }
    if (updateContratDto.lieuRetour !== undefined) {
      contrat.lieuRetour = String(updateContratDto.lieuRetour).trim();
    }

    await contrat.save();

    // Auto-update car's dailyRate if the contract rate changed
    if (dailyRate > 0 && dailyRate !== car.dailyRate) {
      await this.carModel.findByIdAndUpdate(carId, { dailyRate }).exec();
    }

    // Manage availability
    if (carChanged || oldStatus !== newStatus) {
      if (oldCarId && oldStatus === 'active') {
        await this.carModel
          .findByIdAndUpdate(oldCarId, { isAvailable: true })
          .exec();
      }
      if (newStatus === 'active') {
        await this.carModel
          .findByIdAndUpdate(carId, { isAvailable: false })
          .exec();
      }
    }

    await this.logService.add({
      action: 'CONTRAT_UPDATED',
      actorId: actor?.id,
      actorName: actor?.name,
      role: actor?.role,
      detail: `Modification du contrat ${contrat.reference} — statut: ${newStatus}`,
    });

    this.eventsGateway.broadcastDataChange('contract:change', {
      action: 'updated',
      reference: contrat.reference,
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<any> {
    const contrat = await this.findOne(id);

    // If the contract is active, we should make the car available again
    if (contrat.status === 'active') {
      await this.carModel
        .findByIdAndUpdate(contrat.car, { isAvailable: true })
        .exec();
    }

    const result = await this.contratModel.findByIdAndDelete(id).exec();
    this.eventsGateway.broadcastDataChange('contract:change', {
      action: 'removed',
      id,
    });
    return result;
  }
}
