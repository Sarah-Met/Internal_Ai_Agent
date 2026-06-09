import { Controller, Post, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthService } from './auth/auth.service';

@Controller('chat')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService,
  ) { }

  @Post()
  async chat(@Body('question') question: string) {
    this.authService.logQuery(question).catch(err => console.error('Error logging query:', err));
    return this.appService.askAi(question);
  }
}