import { Controller, Get, Post, Put, Delete, Body, Param, HttpStatus, HttpCode } from '@nestjs/common';
import { ItTasksService } from './it-tasks.service';
import { ITTask } from './it-task.schema';

@Controller('it-tasks')
export class ItTasksController {
  constructor(private readonly itTasksService: ItTasksService) {}

  @Get()
  async findAll(): Promise<ITTask[]> {
    return this.itTasksService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ITTask> {
    return this.itTasksService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() taskData: Partial<ITTask>): Promise<ITTask> {
    return this.itTasksService.create(taskData);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateData: Partial<ITTask>): Promise<ITTask> {
    return this.itTasksService.update(id, updateData);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.itTasksService.delete(id);
  }
}
