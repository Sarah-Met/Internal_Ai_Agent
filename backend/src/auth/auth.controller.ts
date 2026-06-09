import { Controller, Post, Get, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
  async changePassword(@Body() body: { email: string; new_pass: string }) {
    return this.authService.changePassword(body.email, body.new_pass);
  }

  @Get('logs')
  async getLogs() {
    return this.authService.getSessionLogs();
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
