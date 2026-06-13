import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { ItTasksModule } from './it-tasks/it-tasks.module';

process.loadEnvFile();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  throw new Error('MONGODB_URI is not set');
}

@Module({
  imports: [
    MongooseModule.forRoot(mongoUri),
    ChatModule,
    AuthModule,
    ItTasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
