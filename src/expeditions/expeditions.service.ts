import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { AiService } from '../ai/ai.service';
import { CreateExpeditionDto } from './dto/create-expedition.dto';

@Injectable()
export class ExpeditionsService {
  constructor(
    private prisma: PrismaService,
    private weatherService: WeatherService,
    private aiService: AiService,
  ) {}

  async create(userId: string, dto: CreateExpeditionDto) {
    // Check assessment
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.hasCompletedAssessment) {
      throw new BadRequestException(
        'You must complete the health assessment before creating an expedition',
      );
    }

    // Check credits
    if (user.prepCredits <= 0) {
      throw new BadRequestException(
        'No prep credits remaining. Purchase more to continue.',
      );
    }

    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }
    if (startDate < new Date()) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Check mountain exists
    const mountain = await this.prisma.mountain.findUnique({
      where: { id: dto.mountainId },
    });
    if (!mountain) throw new NotFoundException('Mountain not found');

    // Atomically decrement credit and create expedition
    const expedition = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { prepCredits: { decrement: 1 } },
      });

      return tx.expedition.create({
        data: {
          userId,
          mountainId: dto.mountainId,
          startDate,
          endDate,
          memberCount: dto.memberCount,
          status: 'DRAFT',
        },
        include: { mountain: true },
      });
    });

    // Run AI readiness + weather analysis (async, non-blocking)
    await this.analyze(expedition.id);

    return this.findOne(userId, expedition.id);
  }

  async findAll(userId: string) {
    return this.prisma.expedition.findMany({
      where: { userId },
      include: { mountain: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const expedition = await this.prisma.expedition.findUnique({
      where: { id },
      include: { mountain: true },
    });
    if (!expedition) throw new NotFoundException('Expedition not found');
    if (expedition.userId !== userId) {
      throw new ForbiddenException('You do not own this expedition');
    }
    return expedition;
  }

  async reanalyze(userId: string, id: string) {
    const expedition = await this.findOne(userId, id);
    await this.analyze(expedition.id);
    return this.findOne(userId, expedition.id);
  }

  private async analyze(expeditionId: string) {
    const expedition = await this.prisma.expedition.findUnique({
      where: { id: expeditionId },
      include: {
        mountain: true,
        user: { include: { fitnessProfile: true } },
      },
    });
    if (!expedition) return;

    // Fetch weather
    const forecasts = await this.weatherService.getForecast(
      expedition.mountain.latitude,
      expedition.mountain.longitude,
      7,
    );

    // Find forecast closest to start date
    const startDate = expedition.startDate.toISOString().split('T')[0];
    const forecast = forecasts.find((f) => f.date === startDate) ??
      forecasts[0] ??
      null;

    const climbTempC = forecast?.tempMean ?? null;
    const weatherSummary = forecast
      ? `${forecast.summary}, ${forecast.tempMin}-${forecast.tempMax}°C, ${forecast.precipitation}mm rain, ${forecast.windSpeed}km/h wind`
      : null;

    // Run AI readiness assessment
    const readiness = await this.aiService.assessReadiness({
      age: expedition.user.age ?? undefined,
      bmi: expedition.user.bmi ?? undefined,
      medicalHistory: expedition.user.medicalHistory ?? undefined,
      capabilityScore: expedition.user.fitnessProfile?.capabilityScore ?? undefined,
      weeklyDistanceKm: expedition.user.fitnessProfile?.weeklyDistanceKm ?? undefined,
      weeklyElevationM: expedition.user.fitnessProfile?.weeklyElevationM ?? undefined,
      longestHikeKm: expedition.user.fitnessProfile?.longestHikeKm ?? undefined,
      experienceLevel: expedition.user.fitnessProfile?.experienceLevel ?? undefined,
      mountainName: expedition.mountain.name,
      elevationM: expedition.mountain.elevationM,
      difficulty: expedition.mountain.difficulty,
      distanceToPeakKm: expedition.mountain.distanceToPeakKm,
      tempMean: forecast?.tempMean,
      precipitation: forecast?.precipitation,
      windSpeed: forecast?.windSpeed,
      weatherSummary: weatherSummary ?? undefined,
      memberCount: expedition.memberCount,
    });

    // Update expedition with results
    await this.prisma.expedition.update({
      where: { id: expeditionId },
      data: {
        climbTempC,
        weatherSummary,
        readinessScore: readiness.readinessScore,
        decision: readiness.decision,
        aiRationale: readiness.rationale,
        status: 'READY',
      },
    });
  }
}