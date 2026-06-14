import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, SessionLog, AIQuery, ReportLog, PasswordResetRequest } from './employee.schema';
import * as bcrypt from 'bcrypt';
import axios from 'axios';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<Employee>,
    @InjectModel(SessionLog.name) private sessionLogModel: Model<SessionLog>,
    @InjectModel(AIQuery.name) private aiQueryModel: Model<AIQuery>,
    @InjectModel(ReportLog.name) private reportLogModel: Model<ReportLog>,
    @InjectModel(PasswordResetRequest.name) private pwdResetReqModel: Model<PasswordResetRequest>,
  ) {}

  private async callN8n(method: 'get' | 'post' | 'put' | 'delete', path: string, data?: any, responseType?: string): Promise<any> {
    const prodUrl = `http://localhost:5678/webhook${path}`;
    const testUrl = `http://localhost:5678/webhook-test${path}`;
    const config: any = { method };
    
    // For DELETE requests, pass data as query parameters instead of request body
    if (method === 'delete' && data) {
      config.params = data;
    } else if (data) {
      config.data = data;
    }
    
    if (responseType) {
      config.responseType = responseType;
    }
    try {
      return await axios({ url: prodUrl, ...config });
    } catch (errProd) {
      console.warn(`n8n prod webhook ${prodUrl} failed:`, errProd.message);
      try {
        console.log(`Trying n8n test webhook: ${testUrl}`);
        return await axios({ url: testUrl, ...config });
      } catch (errTest) {
        console.warn(`n8n test webhook ${testUrl} also failed:`, errTest.message);
        throw new Error('n8n webhook unreachable');
      }
    }
  }

  async login(email: string, pass: string) {
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + email + '$', 'i') }).exec();
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

  async changePassword(email: string, newPass: string, securityQuestion?: string, securityAnswer?: string) {
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + email + '$', 'i') }).exec();
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
    
    if (securityQuestion && securityAnswer) {
      user.security_question = securityQuestion;
      user.security_answer = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);
    }
    
    await user.save();

    return { success: true };
  }

  async getSecurityQuestion(email: string) {
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + email + '$', 'i') }).exec();
    if (!user) throw new BadRequestException('User not found');
    if (!user.security_question) throw new BadRequestException('No security question set for this user');
    return { question: user.security_question };
  }

  async verifySecurityAnswer(email: string, answer: string) {
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + email + '$', 'i') }).exec();
    if (!user) throw new BadRequestException('User not found');
    if (!user.security_answer) throw new BadRequestException('No security question set');
    
    const isMatch = await bcrypt.compare(answer.toLowerCase().trim(), user.security_answer);
    if (!isMatch) throw new BadRequestException('Incorrect security answer');
    
    return { success: true };
  }

  async resetWithSecurityAnswer(email: string, answer: string, newPass: string) {
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + email + '$', 'i') }).exec();
    if (!user) throw new BadRequestException('User not found');
    if (!user.security_answer) throw new BadRequestException('No security question set');
    
    const isMatch = await bcrypt.compare(answer.toLowerCase().trim(), user.security_answer);
    if (!isMatch) throw new BadRequestException('Incorrect security answer');
    
    // Validate password
    const hasLetter = /[a-zA-Z]/.test(newPass);
    const hasNumber = /[0-9]/.test(newPass);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPass);
    if (newPass.length < 8 || !hasLetter || !hasNumber || !hasSpecial) {
      throw new BadRequestException('Password must be at least 8 characters long, and contain letters, numbers, and at least one special character.');
    }

    user.password = await bcrypt.hash(newPass, 10);
    user.needs_password_change = false;
    await user.save();
    return { success: true };
  }

  async createPasswordResetRequest(email: string) {
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + email + '$', 'i') }).exec();
    if (!user) throw new BadRequestException('User not found');
    
    const existingReq = await this.pwdResetReqModel.findOne({ email: new RegExp('^' + email + '$', 'i'), status: 'pending' }).exec();
    if (existingReq) throw new BadRequestException('A password reset request is already pending for this user.');

    const req = new this.pwdResetReqModel({ email, name: user.name });
    await req.save();
    return { success: true };
  }

  async getPasswordResetRequests() {
    return this.pwdResetReqModel.find().sort({ createdAt: -1 }).exec();
  }

  async resolvePasswordResetRequest(id: string, action: 'approve' | 'deny') {
    const req = await this.pwdResetReqModel.findById(id).exec();
    if (!req) throw new BadRequestException('Request not found');
    if (req.status !== 'pending') throw new BadRequestException('Request already resolved');

    if (action === 'deny') {
      req.status = 'denied';
      await req.save();
      return { success: true, status: 'denied' };
    }

    // Approve logic
    const user = await this.employeeModel.findOne({ email: new RegExp('^' + req.email + '$', 'i') }).exec();
    if (!user) throw new BadRequestException('User not found');

    const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ23456789';
    let tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    user.password = tempPassword;
    user.needs_password_change = true;
    await user.save();

    req.status = 'approved';
    req.generated_password = tempPassword;
    await req.save();

    return { success: true, status: 'approved', generated_password: tempPassword, name: user.name };
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

  /**
   * Reindexes all employees so their IDs are sequential (1, 2, 3, ...) sorted by their
   * current numeric ID. Called after deleting an employee to close gaps.
   */
  async reindexEmployees(): Promise<{ success: boolean; count: number }> {
    const employees = await this.employeeModel
      .find()
      .sort({ employee_id: 1 })
      .exec();

    // Sort numerically in case employee_id is a string
    employees.sort((a, b) => (parseInt(a.employee_id) || 0) - (parseInt(b.employee_id) || 0));

    for (let i = 0; i < employees.length; i++) {
      const newId = String(i + 1);
      const oldId = employees[i].employee_id;
      if (newId !== oldId) {
        employees[i].employee_id = newId;
        await employees[i].save();
      }
    }

    return { success: true, count: employees.length };
  }


  async generateAttendanceExcel(): Promise<Buffer> {
    try {
      const response = await this.callN8n('post', '/gen-attendance', {});
      console.log('[generateAttendanceExcel] Successfully retrieved JSON data from n8n.');
      const responseData = response.data;
      let logs: any[] = [];
      if (responseData) {
        if (Array.isArray(responseData)) {
          logs = responseData.map(item => item.json || item);
        } else if (responseData.data && Array.isArray(responseData.data)) {
          logs = responseData.data.map(item => item.json || item);
        } else {
          logs = [responseData.json || responseData];
        }
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Attendance Report');

      sheet.columns = [
        { header: 'Employee ID', key: 'employee_id', width: 15 },
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Sign In Time', key: 'login_time', width: 25 },
        { header: 'Sign Out Time', key: 'logout_time', width: 25 },
        { header: 'Work Duration', key: 'duration', width: 20 },
      ];

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      logs.forEach(log => {
        const row = sheet.addRow({
          employee_id: log['Employee ID'] || log.employee_id || '—',
          name: log['Employee Name'] || log.name || '—',
          email: log['Email Address'] || log.email || '—',
          login_time: log['Sign In Time'] || log.login_time || '—',
          logout_time: log['Sign Out Time'] || log.logout_time || '—',
          duration: log['Work Duration'] || log.duration_minutes || '—'
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      return await workbook.xlsx.writeBuffer() as any;
    } catch (err) {
      console.warn('[generateAttendanceExcel] n8n failed, falling back to local DB/ExcelJS generation:', err.message);
      const logs = await this.sessionLogModel.find().sort({ login_time: -1 }).exec();

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Attendance Report');

      sheet.columns = [
        { header: 'Employee ID', key: 'employee_id', width: 15 },
        { header: 'Employee Name', key: 'name', width: 25 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Sign In Time', key: 'login_time', width: 25 },
        { header: 'Sign Out Time', key: 'logout_time', width: 25 },
        { header: 'Work Duration', key: 'duration', width: 20 },
      ];

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      const formatDateTime = (date: Date | string) => {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return String(date);
        const day = String(d.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day} ${month}, ${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      };

      logs.forEach(log => {
        let workDuration = 'Active Now';
        if (log.logout_time) {
          const mins = log.duration_minutes;
          if (mins !== undefined && mins !== null) {
            if (mins < 1) {
              workDuration = '< 1 min';
            } else {
              const hrs = Math.floor(mins / 60);
              const remainingMins = Math.round(mins % 60);
              workDuration = hrs > 0 ? `${hrs} hr ${remainingMins} min` : `${remainingMins} min`;
            }
          } else {
            workDuration = '—';
          }
        }

        const row = sheet.addRow({
          employee_id: log.employee_id || '—',
          name: log.name || '—',
          email: log.email || '—',
          login_time: formatDateTime(log.login_time),
          logout_time: log.logout_time ? formatDateTime(log.logout_time) : 'Active Now',
          duration: workDuration
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      return await workbook.xlsx.writeBuffer() as any;
    }
  }

  async generateStaffExcel(): Promise<Buffer> {
    try {
      const response = await this.callN8n('post', '/gen-details', {});
      console.log('[generateStaffExcel] Successfully retrieved JSON data from n8n.');
      const responseData = response.data;
      let staff: any[] = [];
      if (responseData) {
        if (Array.isArray(responseData)) {
          staff = responseData.map(item => item.json || item);
        } else if (responseData.data && Array.isArray(responseData.data)) {
          staff = responseData.data.map(item => item.json || item);
        } else {
          staff = [responseData.json || responseData];
        }
      }

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Staff Report');

      sheet.columns = [
        { header: 'Employee ID', key: 'employee_id', width: 15 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Password Changed', key: 'needs_password_change', width: 20 },
        { header: 'Security Question', key: 'security_question', width: 30 },
      ];

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      staff.forEach(emp => {
        const row = sheet.addRow({
          employee_id: emp.employee_id || '—',
          name: emp.name || '—',
          department: emp.department || '—',
          email: emp.email || '—',
          role: emp.role || 'Other',
          needs_password_change: emp.needs_password_change === false ? 'Yes' : 'No',
          security_question: emp.security_question || 'Not Set'
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      return await workbook.xlsx.writeBuffer() as any;
    } catch (err) {
      console.warn('[generateStaffExcel] n8n failed, falling back to local DB/ExcelJS generation:', err.message);
      const staff = await this.employeeModel.find().sort({ employee_id: 1 }).exec();

      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet('Staff Report');

      sheet.columns = [
        { header: 'Employee ID', key: 'employee_id', width: 15 },
        { header: 'Full Name', key: 'name', width: 25 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Email Address', key: 'email', width: 30 },
        { header: 'Role', key: 'role', width: 15 },
        { header: 'Password Changed', key: 'needs_password_change', width: 20 },
        { header: 'Security Question', key: 'security_question', width: 30 },
      ];

      sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4F81BD' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      const getRoleName = (roleNum: number) => {
        switch (roleNum) {
          case 1: return 'Admin';
          case 2: return 'HR';
          case 3: return 'IT';
          default: return 'Other';
        }
      };

      staff.forEach(emp => {
        const row = sheet.addRow({
          employee_id: emp.employee_id || '—',
          name: emp.name || '—',
          department: emp.department || '—',
          email: emp.email || '—',
          role: getRoleName(emp.role),
          needs_password_change: emp.needs_password_change ? 'No' : 'Yes',
          security_question: emp.security_question || 'Not Set'
        });

        row.eachCell((cell) => {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });

      return await workbook.xlsx.writeBuffer() as any;
    }
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
      const response = await this.callN8n('get', '/get-all-faqs');
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
      try {
        const client = this.employeeModel.db.getClient();
        const collection = client.db('FAQNEW').collection('FAQNEW');
        const dbList = await collection.find({}).toArray();
        if (Array.isArray(dbList)) {
          list = dbList;
        }
      } catch (dbErr) {
        console.error('Error fetching FAQs directly from MongoDB:', dbErr.message);
      }
    }

    if (!list || !Array.isArray(list)) {
      list = [];
    }

    return list
      .filter(item => item !== null && item !== undefined)
      .map(item => {
        const rawText = item.text || '';
        let question = item.Question || item.data?.question || '';
        let answer = item.Answer || item.data?.answer || '';
        
        // If question or answer is missing but rawText is present, parse it
        if ((!question || !answer) && rawText) {
          const match = rawText.match(/^Q:\s*([\s\S]*?)\s*\n+A:\s*([\s\S]*)/i);
          if (match) {
            if (!question) question = match[1].trim();
            if (!answer) answer = match[2].trim();
          } else {
            const parts = rawText.split(/\n\n+/);
            if (parts.length > 1) {
              if (!question) question = parts[0].trim();
              if (!answer) answer = parts.slice(1).join('\n\n').trim();
            } else {
              const singleParts = rawText.split(/\n+/);
              if (singleParts.length > 1) {
                if (!question) question = singleParts[0].trim();
                if (!answer) answer = singleParts.slice(1).join('\n').trim();
              } else {
                if (!question) question = rawText.trim();
                if (!answer) answer = rawText.trim();
              }
            }
          }
        }

        // Strip prefixes if they somehow ended up inside the fields
        if (question) {
          question = question.replace(/^Q:\s*/i, '').trim();
        }
        if (answer) {
          answer = answer.replace(/^A:\s*/i, '').trim();
        }

        // Fallback for lastUpdated: if missing, extract from Mongo ObjectId timestamp
        let dateVal = item['Last Updated'] || item.data?.lastUpdated || '';
        if (!dateVal && item._id) {
          try {
            if (typeof item._id.getTimestamp === 'function') {
              dateVal = item._id.getTimestamp().toISOString();
            } else {
              const idStr = String(item._id);
              if (idStr.length === 24) {
                const timestamp = parseInt(idStr.substring(0, 8), 16) * 1000;
                dateVal = new Date(timestamp).toISOString();
              }
            }
          } catch (e) {
            console.warn('Failed to extract timestamp from ObjectId:', e.message);
          }
        }

        return {
          _id: item.ID || item._id || (item.id !== undefined && item.id !== null ? String(item.id) : ''),
          text: item.Question ? `${item.Question}\n\n${item.Answer}` : rawText,
          data: {
            id: item.ID || item.id || item.data?.id || '',
            question: question || rawText,
            answer: answer || rawText,
            category: item.Category || item.data?.category || 'General',
            tags: item.Tags || item.data?.tags || '',
            lastUpdated: dateVal
          }
        };
      });
  }

  async updateFaq(id: string, question: string, answer: string, category: string, tags: string) {
    let numericId: any = id;
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
      const doc = await collection.findOne(filter);
      if (doc && doc.data && doc.data.id !== undefined) {
        numericId = Number(doc.data.id);
      } else if (doc && doc.id !== undefined) {
        numericId = Number(doc.id);
      } else if (doc && doc.ID !== undefined) {
        numericId = Number(doc.ID);
      }
    } catch (e) {
      console.warn('Failed to fetch FAQ document for numeric ID:', e.message);
    }

    // Self-healing: if numericId is not a number, assign the next available numeric ID
    if (typeof numericId !== 'number' || isNaN(numericId)) {
      try {
        const client = this.employeeModel.db.getClient();
        const collection = client.db('FAQNEW').collection('FAQNEW');
        const maxDoc = await collection.find({}).sort({ 'data.id': -1 }).limit(1).toArray();
        if (maxDoc.length > 0 && maxDoc[0].data && maxDoc[0].data.id) {
          numericId = Number(maxDoc[0].data.id) + 1;
        } else {
          numericId = 1;
        }
      } catch (e) {
        console.warn('Failed to self-heal numeric ID, defaulting to 1:', e.message);
        numericId = 1;
      }
    }

    const lastUpdated = new Date().toISOString();
    
    try {
      // 1. Call n8n webhook
      await this.callN8n('put', '/update-faq', {
        id: numericId,
        question,
        answer,
        category,
        tags,
        lastUpdated
      });
      console.log(`[updateFaq] Successfully updated FAQ ID ${numericId} via n8n.`);
    } catch (err) {
      console.warn('n8n update webhook failed, falling back to direct DB write:', err.message);
      // Fallback: If n8n update webhook fails, write directly to MongoDB
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
        await collection.updateOne(filter, {
          $set: {
            text,
            'data.id': numericId, // Ensure the numeric ID is written!
            'data.question': question,
            'data.answer': answer,
            'data.category': category,
            'data.tags': tags,
            'data.lastUpdated': lastUpdated,
            updatedAt: new Date()
          }
        });
      } catch (dbErr) {
        console.error('Failed to update FAQ in database:', dbErr.message);
        throw new BadRequestException('Failed to update FAQ in database.');
      }
    }

    return { success: true };
  }

  async createFaq(question: string, answer: string, category: string, tags: string) {
    let nextId = 1;
    const lastUpdated = new Date().toISOString();
    
    // Calculate next ID directly from DB
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

    try {
      // 1. Call n8n webhook
      await this.callN8n('post', '/add-faq', {
        id: nextId,
        question,
        answer,
        category,
        tags,
        lastUpdated
      });
      console.log(`[createFaq] Successfully created FAQ ID ${nextId} via n8n.`);
    } catch (err) {
      console.warn('n8n add webhook failed, falling back to direct DB write:', err.message);
      // Fallback: If n8n add webhook fails completely, write directly to MongoDB
      try {
        const client = this.employeeModel.db.getClient();
        const collection = client.db('FAQNEW').collection('FAQNEW');
        const text = `${question}\n\n${answer}`;
        await collection.updateOne({ 'data.id': nextId }, {
          $set: {
            text,
            source: 'blob',
            blobType: 'text/plain',
            'data.id': nextId,
            'data.question': question,
            'data.answer': answer,
            'data.category': category || 'General',
            'data.frequency': '',
            'data.tags': tags || '',
            'data.lastUpdated': lastUpdated,
            updatedAt: new Date()
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        }, { upsert: true });
      } catch (dbErr) {
        console.error('Failed to create FAQ in database:', dbErr.message);
        throw new BadRequestException('Failed to create FAQ in database.');
      }
    }

    return { success: true };
  }

  async reindexFaqs() {
    try {
      const client = this.employeeModel.db.getClient();
      const collection = client.db('FAQNEW').collection('FAQNEW');
      const docs = await collection.find({}).sort({ 'data.id': 1, _id: 1 }).toArray();
      
      console.log(`[reindexFaqs] Starting sequential ID re-indexing for ${docs.length} documents...`);
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        const newId = i + 1;
        if (doc.data && Number(doc.data.id) !== newId) {
          await collection.updateOne(
            { _id: doc._id },
            { $set: { 'data.id': newId } }
          );
        }
      }
      console.log(`[reindexFaqs] Re-indexing complete.`);
    } catch (err) {
      console.error('Failed to reindex FAQs:', err.message);
    }
  }

  async deleteFaq(id: string, numericId?: number) {
    // Use the numeric ID from the frontend (it knows it from the FAQ data)
    const nid = numericId ?? null;

    // If we don't have a numeric ID, try to look it up from the database
    let resolvedNumericId = nid;
    if (resolvedNumericId === null) {
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
        const doc = await collection.findOne(filter);
        if (doc?.data?.id !== undefined) {
          resolvedNumericId = Number(doc.data.id);
        }
      } catch (e) {
        console.warn('Failed to fetch FAQ for numeric ID:', e.message);
      }
    }

    // Try n8n only with a numeric ID (avoid sending the hex _id string)
    if (resolvedNumericId !== null) {
      try {
        await this.callN8n('delete', '/delete-faq', { id: resolvedNumericId });
        console.log(`[deleteFaq] Successfully deleted FAQ ID ${resolvedNumericId} via n8n.`);
        return { success: true };
      } catch (err) {
        console.warn('n8n delete webhook failed:', err.message);
      }
    }

    // Fallback: delete directly from MongoDB
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

      const result = await collection.deleteOne(filter);

      if (result.deletedCount === 0) {
        throw new BadRequestException('FAQ not found.');
      }

      await this.reindexFaqs();

      console.log(`[deleteFaq] Successfully deleted FAQ ${id} from database.`);
    } catch (dbErr) {
      if (dbErr instanceof BadRequestException) throw dbErr;
      console.error('Failed to delete FAQ from database:', dbErr.message);
      throw new BadRequestException('Failed to delete FAQ from database.');
    }

    return { success: true };
  }
}
