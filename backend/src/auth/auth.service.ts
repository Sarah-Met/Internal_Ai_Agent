import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, SessionLog, AIQuery, ReportLog } from './employee.schema';
import * as bcrypt from 'bcrypt';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(SessionLog.name) private sessionLogModel: Model<SessionLog>,
    @InjectModel(AIQuery.name) private aiQueryModel: Model<AIQuery>,
    @InjectModel(ReportLog.name) private reportLogModel: Model<ReportLog>,
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

  async logQuery(question: string) {
    if (!question) return;
    const queryLog = new this.aiQueryModel({ question });
    await queryLog.save();
  }

  async logReport(reportType: string) {
    if (!reportType) return;
    const reportLog = new this.reportLogModel({ reportType });
    await reportLog.save();
  }

  async getMetrics() {
    const totalEmployees = await this.employeeModel.countDocuments().exec();

    // Get today's start in UTC+3 (Cairo time zone offset is +3 hours)
    const now = new Date();
    const cairoOffsetMs = 3 * 60 * 60 * 1000;
    const todayCairoStart = new Date(Math.floor((now.getTime() + cairoOffsetMs) / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000) - cairoOffsetMs);

    const aiQueriesToday = await this.aiQueryModel.countDocuments({
      createdAt: { $gte: todayCairoStart },
    }).exec();

    // Get month's start in UTC+3 (Cairo time)
    const cairoTime = new Date(now.getTime() + cairoOffsetMs);
    const startOfMonthCairo = new Date(Date.UTC(cairoTime.getUTCFullYear(), cairoTime.getUTCMonth(), 1) - cairoOffsetMs);

    const reportsGenerated = await this.reportLogModel.countDocuments({
      createdAt: { $gte: startOfMonthCairo },
    }).exec();

    return {
      totalEmployees,
      aiQueriesToday,
      reportsGenerated,
    };
  }

  async getFaqs() {
    let list: any[] = [];
    try {
      const response = await axios.get('http://localhost:5678/webhook/get-all-faqs');
      const data = response.data;
      let temp: any = [];
      if (Array.isArray(data)) {
        temp = data;
      } else if (data && Array.isArray(data.data)) {
        temp = data.data;
      } else if (data && typeof data === 'object') {
        if (data.Question || data.text || data.id) {
          temp = [data];
        } else if (data.data && (data.data.question || data.data.text || data.data.id)) {
          temp = [data.data];
        }
      }
      list = temp;
    } catch (err) {
      console.warn('n8n webhook unreachable, falling back to direct DB read:', err.message);
    }

    // Fallback: If n8n returns an empty list, a single item, or not a proper array, retrieve from MongoDB FAQNEW directly if it has more items
    if (!Array.isArray(list) || list.length <= 1) {
      try {
        const client = this.employeeModel.db.getClient();
        const collection = client.db('FAQNEW').collection('FAQNEW');
        const dbList = await collection.find({}).toArray();
        if (Array.isArray(dbList) && (list.length === 0 || dbList.length > list.length)) {
          list = dbList;
        }
      } catch (err) {
        console.error('Error fetching FAQs directly from MongoDB:', err.message);
        if (!list) list = [];
      }
    }

    if (!Array.isArray(list)) {
      list = [];
    }

    return list
      .filter(item => item !== null && item !== undefined)
      .map(item => ({
        _id: item.ID || item._id || (item.id !== undefined && item.id !== null ? String(item.id) : ''),
        text: item.Question ? `${item.Question}\n\n${item.Answer}` : (item.data?.question && item.data?.answer ? `${item.data.question}\n\n${item.data.answer}` : (item.text || '')),
        data: {
          id: item.ID || item.id || item.data?.id || '',
          question: item.Question || item.data?.question || (item.text ? item.text.split('\n\n')[0] : ''),
          answer: item.Answer || item.data?.answer || (item.text ? item.text.split('\n\n')[1] || item.text : ''),
          category: item.Category || item.data?.category || 'General',
          tags: item.Tags || item.data?.tags || '',
          lastUpdated: item['Last Updated'] || item.data?.lastUpdated || ''
        }
      }));
  }

  async updateFaq(id: string, question: string, answer: string, category: string, tags: string) {
    const numericId = isNaN(Number(id)) ? id : Number(id);
    
    // 1. Call n8n webhook (asynchronous / best effort)
    try {
      await axios.put('http://localhost:5678/webhook/update-faq', {
        id: numericId,
        question,
        answer,
        category,
        tags
      });
    } catch (err) {
      console.warn('n8n update webhook failed:', err.message);
    }

    // 2. Always apply to MongoDB FAQNEW непосредственно
    try {
      const client = this.employeeModel.db.getClient();
      const collection = client.db('FAQNEW').collection('FAQNEW');
      const { ObjectId } = require('mongodb');
      let filter = {};
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { _id: id };
      }
      
      const text = `${question}\n\n${answer}`;
      const formattedDate = new Date().toLocaleDateString('en-US');
      await collection.updateOne(filter, {
        $set: {
          text,
          'data.question': question,
          'data.answer': answer,
          'data.category': category,
          'data.tags': tags,
          'data.lastUpdated': formattedDate,
          updatedAt: new Date()
        }
      });
    } catch (err) {
      console.error('Failed to update FAQ in database:', err.message);
      throw new BadRequestException('Failed to update FAQ in database.');
    }

    return { success: true };
  }

  async createFaq(question: string, answer: string, category: string, tags: string) {
    let nextId = 1;
    
    // 1. Calculate next ID directly from DB
    try {
      const client = this.employeeModel.db.getClient();
      const collection = client.db('FAQNEW').collection('FAQNEW');
      const maxDoc = await collection.find({}).sort({ 'data.id': -1 }).limit(1).toArray();
      if (maxDoc.length > 0 && maxDoc[0].data && maxDoc[0].data.id) {
        nextId = Number(maxDoc[0].data.id) + 1;
      }
    } catch (e) {
      console.warn('Failed to calculate next ID from DB, defaulting to 1:', e.message);
    }

    // 2. Call n8n webhook (best effort)
    try {
      await axios.post('http://localhost:5678/webhook/add-faq', {
        id: nextId,
        question,
        answer,
        category,
        tags
      });
    } catch (err) {
      console.warn('n8n add webhook failed:', err.message);
    }

    // 3. Always insert directly to MongoDB
    try {
      const client = this.employeeModel.db.getClient();
      const collection = client.db('FAQNEW').collection('FAQNEW');
      const text = `${question}\n\n${answer}`;
      const formattedDate = new Date().toLocaleDateString('en-US');
      await collection.insertOne({
        text,
        source: 'blob',
        blobType: 'text/plain',
        data: {
          id: nextId,
          question,
          answer,
          category: category || 'General',
          frequency: '',
          tags: tags || '',
          lastUpdated: formattedDate
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      console.error('Failed to create FAQ in database:', err.message);
      throw new BadRequestException('Failed to create FAQ in database.');
    }

    return { success: true };
  }

  async deleteFaq(id: string) {
    const numericId = isNaN(Number(id)) ? id : Number(id);
    
    // 1. Call n8n webhook (best effort)
    try {
      await axios.delete('http://localhost:5678/webhook/delete-faq', {
        data: { id: numericId }
      });
    } catch (err) {
      console.warn('n8n delete webhook failed:', err.message);
    }

    // 2. Always delete directly from MongoDB
    try {
      const client = this.employeeModel.db.getClient();
      const collection = client.db('FAQNEW').collection('FAQNEW');
      const { ObjectId } = require('mongodb');
      let filter = {};
      try {
        filter = { _id: new ObjectId(id) };
      } catch (e) {
        filter = { _id: id };
      }
      await collection.deleteOne(filter);
    } catch (err) {
      console.error('Failed to delete FAQ from database:', err.message);
      throw new BadRequestException('Failed to delete FAQ from database.');
    }

    return { success: true };
  }
}
