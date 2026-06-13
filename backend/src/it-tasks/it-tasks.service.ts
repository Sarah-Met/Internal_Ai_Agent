import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ITTask } from './it-task.schema';

@Injectable()
export class ItTasksService {
  constructor(
    @InjectModel(ITTask.name) private readonly itTaskModel: Model<ITTask>,
  ) {}

  async findAll(): Promise<ITTask[]> {
    return this.itTaskModel.find().sort({ dueDate: 1 }).exec();
  }

  async findOne(id: string): Promise<ITTask> {
    const task = await this.itTaskModel.findById(id).exec();
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return task;
  }

  async create(taskData: Partial<ITTask>): Promise<ITTask> {
    const task = new this.itTaskModel(taskData);
    return task.save();
  }

  async update(id: string, updateData: Partial<ITTask>): Promise<ITTask> {
    // If setting to done, automatically fill completedDate if not present
    if (updateData.status === 'done' && !updateData.completedDate) {
      updateData.completedDate = new Date();
    } else if (updateData.status && updateData.status !== 'done') {
      updateData.completedDate = null;
    }

    const updatedTask = await this.itTaskModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return updatedTask;
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const result = await this.itTaskModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }
    return { success: true };
  }
}
