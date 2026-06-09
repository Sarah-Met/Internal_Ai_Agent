import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'employees', timestamps: true })
export class Employee extends Document {
  @Prop({ required: true })
  employee_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  department: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, default: 4 })
  role: number; // 1 = admin, 2 = hr, 3 = IT, 4 = other

  @Prop({ required: true, default: true })
  needs_password_change: boolean;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

@Schema({ collection: 'session_logs' })
export class SessionLog extends Document {
  @Prop({ required: true })
  employee_id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, default: Date.now })
  login_time: Date;

  @Prop()
  logout_time: Date;

  @Prop()
  duration_minutes: number;
}

export const SessionLogSchema = SchemaFactory.createForClass(SessionLog);

@Schema({ collection: 'ai_queries', timestamps: true })
export class AIQuery extends Document {
  @Prop({ required: true })
  question: string;
}

export const AIQuerySchema = SchemaFactory.createForClass(AIQuery);

@Schema({ collection: 'report_logs', timestamps: true })
export class ReportLog extends Document {
  @Prop({ required: true })
  reportType: string;
}

export const ReportLogSchema = SchemaFactory.createForClass(ReportLog);

