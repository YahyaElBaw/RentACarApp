import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client } from './schemas/client.schema';
import { PdfService } from '../shared/pdf.service';

@Injectable()
export class ClientService implements OnModuleInit {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<Client>,
    private readonly pdfService: PdfService,
  ) {}

  async onModuleInit() {
    try {
      await this.clientModel.updateMany(
        { lieuNaissance: { $exists: false } },
        { $set: { lieuNaissance: '' } }
      ).exec();
      await this.clientModel.updateMany(
        { lieuPermis: { $exists: false } },
        { $set: { lieuPermis: '' } }
      ).exec();
      await this.clientModel.updateMany(
        { nationality: { $exists: false } },
        { $set: { nationality: '' } }
      ).exec();
    } catch (err) {
      console.error('Error auto-migrating client fields on module init:', err);
    }
  }

  private sanitizeClientDto(dto: any): any {
    const sanitized = { ...dto };
    ['birthday', 'cinDate', 'licenseDate'].forEach((dateKey) => {
      if (sanitized[dateKey] === '' || sanitized[dateKey] === null) {
        delete sanitized[dateKey];
      }
    });
    if (sanitized.lieuNaissance !== undefined && sanitized.lieuNaissance !== null) {
      sanitized.lieuNaissance = String(sanitized.lieuNaissance).trim();
    }
    if (sanitized.lieuPermis !== undefined && sanitized.lieuPermis !== null) {
      sanitized.lieuPermis = String(sanitized.lieuPermis).trim();
    }
    if (sanitized.nationality !== undefined && sanitized.nationality !== null) {
      sanitized.nationality = String(sanitized.nationality).trim();
    }
    return sanitized;
  }

  async create(createClientDto: any, userId?: string): Promise<Client> {
    try {
      const sanitizedDto = this.sanitizeClientDto(createClientDto);
      const createdClient = new this.clientModel({
        lieuNaissance: '',
        lieuPermis: '',
        nationality: '',
        ...sanitizedDto,
        addedBy: userId
      });
      return await createdClient.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('CIN or Driving License already exists');
      }
      throw error;
    }
  }

  async findAll(search?: string, disabled?: string): Promise<Client[]> {
    const showDisabled = disabled === 'true';
    const baseQuery: any = showDisabled ? { disabled: true } : { disabled: { $ne: true } };

    if (search && search.trim() !== '') {
      const searchTerms = search.trim().split(/\s+/);
      const andConditions = searchTerms.map(term => ({
        $or: [
          { firstName: { $regex: term, $options: 'i' } },
          { lastName: { $regex: term, $options: 'i' } },
          { cin: { $regex: term, $options: 'i' } },
          { phone: { $regex: term, $options: 'i' } },
        ]
      }));

      return this.clientModel
        .find({ ...baseQuery, $and: andConditions })
        .populate('addedBy', 'firstName lastName')
        .sort({ totalRents: -1, lastName: 1 })
        .exec();
    }
    return this.clientModel
      .find(baseQuery)
      .populate('addedBy', 'firstName lastName')
      .sort({ totalRents: -1, lastName: 1 })
      .exec();
  }


  async findOne(id: string): Promise<Client> {
    const client = await this.clientModel
      .findById(id)
      .populate('addedBy', 'firstName lastName')
      .exec();
    if (!client) throw new NotFoundException(`Client with ID ${id} not found`);
    return client;
  }

  async update(id: string, updateClientDto: any): Promise<Client> {
    const sanitizedDto = this.sanitizeClientDto(updateClientDto);
    console.log(`[ClientService] Updating client ${id} with:`, JSON.stringify(sanitizedDto, null, 2));
    const updatedClient = await this.clientModel
      .findByIdAndUpdate(id, { $set: sanitizedDto }, { new: true, runValidators: false })
      .populate('addedBy', 'firstName lastName')
      .exec();
    if (!updatedClient) {
        console.error(`[ClientService] Client ${id} NOT FOUND for update`);
        throw new NotFoundException(`Client with ID ${id} not found`);
    }
    console.log(`[ClientService] Client ${id} updated successfully`);
    return updatedClient;
  }
  async remove(id: string): Promise<any> {
    const result = await this.clientModel.findByIdAndUpdate(id, { disabled: true }, { new: true }).exec();
    if (!result) throw new NotFoundException(`Client with ID ${id} not found`);
    return result;
  }

  async generatePdf(id: string): Promise<Buffer> {
    const client = await this.findOne(id);
    return this.pdfService.generateClientPDF(client);
  }
}
