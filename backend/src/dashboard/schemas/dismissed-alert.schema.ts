import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class DismissedAlert {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  dismissedBy: Types.ObjectId;
}

export type DismissedAlertDocument = DismissedAlert & Document;
export const DismissedAlertSchema =
  SchemaFactory.createForClass(DismissedAlert);
