import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.useStaticAssets(path.join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({ origin: '*' });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('KakiDaki API')
    .setDescription(
      'Backend API for KakiDaki - mountain climbing preparation platform. ' +
        'Features: AI readiness scoring, logistics suggestions, go/no-go decisions, ' +
        'Google Fit sync, weather forecasts, and Pro credit payments via Midtrans.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth')
    .addTag('Users')
    .addTag('Mountains')
    .addTag('Expeditions')
    .addTag('Logistics')
    .addTag('Google Fit')
    .addTag('Comments')
    .addTag('Payments')
    .addTag('Vision')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`KakiDaki API running on https://api.kakidaki.my.id/api/v1`);
  console.log(`Swagger docs at https://api.kakidaki.my.id/api/docs`);
}
bootstrap();
