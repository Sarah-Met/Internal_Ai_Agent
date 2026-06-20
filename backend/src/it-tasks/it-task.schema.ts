import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'it_tasks', timestamps: true })
export class ITTask extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ required: true, type: [String] })
  assigneeIds: string[]; // employee_ids of assigned employees

  @Prop({ required: true, type: [String] })
  assigneeNames: string[]; // names of assigned employees

  @Prop({ required: true, default: 'todo' })
  status: 'todo' | 'in-progress' | 'done';

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  dueDate: Date;

  @Prop({ default: true })
  startAllDay: boolean;

  @Prop({ default: true })
  dueAllDay: boolean;

  @Prop({ type: Date })
  completedDate?: Date | null;

  @Prop({ default: 0 })
  timeLoggedMinutes: number;

  @Prop()
  notes?: string;
}

export const ITTaskSchema = SchemaFactory.createForClass(ITTask);
