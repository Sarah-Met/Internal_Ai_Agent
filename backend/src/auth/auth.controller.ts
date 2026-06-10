import { Controller, Post, Get, Body, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() body: Record<string, string>) {
    return this.authService.login(body.email, body.password);
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(@Body() body: { session_id: string }) {
    return this.authService.logout(body.session_id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  async changePassword(@Body() body: { email: string; new_pass: string; security_question?: string; security_answer?: string }) {
    return this.authService.changePassword(body.email, body.new_pass, body.security_question, body.security_answer);
  }

  @HttpCode(HttpStatus.OK)
  @Post('security-question')
  async getSecurityQuestion(@Body() body: { email: string }) {
    return this.authService.getSecurityQuestion(body.email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-with-security-answer')
  async resetWithSecurityAnswer(@Body() body: { email: string; answer: string; new_pass: string }) {
    return this.authService.resetWithSecurityAnswer(body.email, body.answer, body.new_pass);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-request')
  async createPasswordResetRequest(@Body() body: { email: string }) {
    return this.authService.createPasswordResetRequest(body.email);
  }

  @Get('reset-requests')
  async getPasswordResetRequests() {
    return this.authService.getPasswordResetRequests();
  }

  @HttpCode(HttpStatus.OK)
  @Post('resolve-reset-request')
  async resolvePasswordResetRequest(@Body() body: { id: string; action: 'approve' | 'deny' }) {
    return this.authService.resolvePasswordResetRequest(body.id, body.action);
  }

  @Get('logs')
  async getLogs() {
    return this.authService.getSessionLogs();
  }

  @HttpCode(HttpStatus.OK)
  @Post('attendance-report')
  async getAttendanceReport(@Res() res: Response) {
    const buffer = await this.authService.generateAttendanceExcel();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Attendance_Report.xlsx');
    res.end(buffer);
  }

  @Get('metrics')
  async getMetrics() {
    return this.authService.getMetrics();
  }

  @HttpCode(HttpStatus.OK)
  @Post('log-report')
  async logReport(@Body() body: { reportType: string }) {
    return this.authService.logReport(body.reportType);
  }

  @Get('faq')
  async getFaqs() {
    return this.authService.getFaqs();
  }

  @HttpCode(HttpStatus.OK)
  @Post('faq/update')
  async updateFaq(@Body() body: { id: string; question: string; answer: string; category: string; tags: string }) {
    return this.authService.updateFaq(body.id, body.question, body.answer, body.category, body.tags);
  }

  @HttpCode(HttpStatus.OK)
  @Post('faq/create')
  async createFaq(@Body() body: { question: string; answer: string; category: string; tags: string }) {
    return this.authService.createFaq(body.question, body.answer, body.category, body.tags);
  }

  @HttpCode(HttpStatus.OK)
  @Post('faq/delete')
  async deleteFaq(@Body() body: { id: string }) {
    return this.authService.deleteFaq(body.id);
  }
}
