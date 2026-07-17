import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MountainsModule } from './mountains/mountains.module';
import { WeatherModule } from './weather/weather.module';
import { GoogleFitModule } from './google-fit/google-fit.module';
import { AiModule } from './ai/ai.module';
import { ExpeditionsModule } from './expeditions/expeditions.module';
import { LogisticsModule } from './logistics/logistics.module';
import { CommentsModule } from './comments/comments.module';
import { PaymentsModule } from './payments/payments.module';
import { VisionModule } from './vision/vision.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    WeatherModule,
    GoogleFitModule,
    AiModule,
    AuthModule,
    UsersModule,
    MountainsModule,
    ExpeditionsModule,
    LogisticsModule,
    CommentsModule,
    PaymentsModule,
    VisionModule,
    AdminModule,
  ],
})
export class AppModule {}