import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Presence {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop()
  name: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: Date.now })
  lastSeen: Date;
}

export type PresenceDocument = Presence & Document;
export const PresenceSchema = SchemaFactory.createForClass(Presence);

PresenceSchema.index({ lastSeen: -1 });
