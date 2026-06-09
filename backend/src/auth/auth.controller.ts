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
}
