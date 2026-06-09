import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, SessionLog } from './employee.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(SessionLog.name) private sessionLogModel: Model<SessionLog>,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.employeeModel.findOne({ email }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Support both plaintext comparison (for existing users like '1234') and bcrypt hashing (for new/updated users)
    let isMatch = false;
    try {
      isMatch = (user.password === pass) || await bcrypt.compare(pass, user.password);
    } catch (error) {
      isMatch = user.password === pass;
    }

    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Create session log
    const session = new this.sessionLogModel({
      employee_id: user.employee_id,
      name: user.name,
      email: user.email,
      login_time: new Date(),
    });
    await session.save();

    return {
      employee_id: user.employee_id,
      name: user.name,
      department: user.department,
      email: user.email,
      role: user.role ?? 4,
      session_id: session._id,
      needs_password_change: user.needs_password_change !== false,
    };
  }

  async changePassword(email: string, newPass: string) {
    const user = await this.employeeModel.findOne({ email }).exec();
    if (!user) {
      throw new BadRequestException('Employee not found');
    }

    // Passwords must be at least 8 characters, and contain letters, numbers, and special characters
    const hasLetter = /[a-zA-Z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPass);

    if (newPass.length < 8 || !hasLetter || !hasNumber || !hasSpecial) {
      throw new BadRequestException(
        'Password must be at least 8 characters long, and contain letters, numbers, and at least one special character.',
      );
    }

    // Hash the new password and update record
    const hashedPass = await bcrypt.hash(newPass, 10);
    user.password = hashedPass;
    user.needs_password_change = false;
    await user.save();

    return { success: true };
  }

  async logout(sessionId: string) {
    try {
      const session = await this.sessionLogModel.findById(sessionId).exec();
      if (session && !session.logout_time) {
        session.logout_time = new Date();
        const diffMs = session.logout_time.getTime() - session.login_time.getTime();
        session.duration_minutes = Math.max(0, Math.round(diffMs / 60000));
        await session.save();
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSessionLogs() {
    return this.sessionLogModel.find().sort({ login_time: -1 }).exec();
  }
}
