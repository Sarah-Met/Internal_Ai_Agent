import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ITTask, ITTaskSchema } from './it-task.schema';
import { ItTasksService } from './it-tasks.service';
import { ItTasksController } from './it-tasks.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ITTask.name, schema: ITTaskSchema },
    ]),
  ],
  controllers: [ItTasksController],
  providers: [ItTasksService],
  exports: [ItTasksService],
})
export class ItTasksModule {}
