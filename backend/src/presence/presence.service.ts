import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Presence, PresenceDocument } from './presence.schema';

export const ONLINE_THRESHOLD_MS = 90_000;

@Injectable()
export class PresenceService {
  constructor(
    @InjectModel(Presence.name) private presenceModel: Model<PresenceDocument>,
  ) {}

  async heartbeat(userId: string, name: string, role: string): Promise<void> {
    await this.presenceModel.updateOne(
      { userId },
      { $set: { userId, name, role, lastSeen: new Date() } },
      { upsert: true },
    );
  }

  async getOnline(): Promise<{ count: number; users: PresenceDocument[] }> {
    const since = new Date(Date.now() - ONLINE_THRESHOLD_MS);
    const users = await this.presenceModel
      .find({ lastSeen: { $gte: since } })
      .sort({ lastSeen: -1 })
      .lean()
      .exec();
    return { count: users.length, users };
  }

  async remove(userId: string): Promise<void> {
    await this.presenceModel.deleteOne({ userId });
  }

  async cleanup(): Promise<void> {
    const since = new Date(Date.now() - ONLINE_THRESHOLD_MS);
    await this.presenceModel.deleteMany({ lastSeen: { $lt: since } });
  }
}
