import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema, SessionLog, SessionLogSchema, AIQuery, AIQuerySchema, ReportLog, ReportLogSchema } from './employee.schema';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: SessionLog.name, schema: SessionLogSchema },
      { name: AIQuery.name, schema: AIQuerySchema },
      { name: ReportLog.name, schema: ReportLogSchema }
    ]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
