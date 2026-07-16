import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WeatherService } from '../weather/weather.service';
import { AiReadinessService } from '../ai/ai-readiness.service';
import { CreateExpeditionDto } from './dto/expedition.dto';

@Injectable()
export class ExpeditionsService {
  constructor(
    private prisma: PrismaService,
    private weather: WeatherService,
    private ai: AiReadinessService,
  ) {}

  async create(userId: string, dto: CreateExpeditionDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('User not found');

    // Mandatory assessment gate
    if (!user.hasCompletedAssessment) {
      throw new ForbiddenException(
        'Please complete your health assessment (BMI + medical history) before preparing an expedition',
      );
    }

    // Pro / credit gate
    if (user.prepCredits <= 0) {
      throw new ForbiddenException(
        'You have used your free preparation. Upgrade to Pro to prepare more expeditions.',
      );
    }

    const mountain = await this.prisma.mountain.findUnique({
      where: { id: dto.mountainId },
    });
    if (!mountain) throw new NotFoundException('Mountain not found');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    // Create expedition draft + decrement credit atomically
    const expedition = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expedition.create({
        data: {
          userId,
          mountainId: dto.mountainId,
          startDate: start,
          endDate: end,
          memberCount: dto.memberCount,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { prepCredits: { decrement: 1 } },
      });
      return created;
    });

    // Run AI analysis immediately
    return this.analyze(userId, expedition.id);
  }

  async analyze(userId: string, expeditionId: string) {
    const expedition = await this.getOwned(userId, expeditionId);
    const [user, mountain] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { fitnessProfile: true },
      }),
      this.prisma.mountain.findUnique({
        where: { id: expedition.mountainId },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!mountain) throw new NotFoundException('Mountain not found');

    // Weather for climb day
    const forecasts = await this.weather.getForecast(
      mountain.latitude,
      mountain.longitude,
      expedition.startDate,
      expedition.endDate,
    );
    const climbDay = forecasts[0];

    const aiInput = {
      user: {
        age: user.age,
        bmi: user.bmi,
        medicalHistory: user.medicalHistory,
        capabilityScore: user.fitnessProfile?.capabilityScore,
        weeklyDistanceKm: user.fitnessProfile?.weeklyDistanceKm,
        weeklyElevationM: user.fitnessProfile?.weeklyElevationM,
        longestHikeKm: user.fitnessProfile?.longestHikeKm,
      },
      mountain: {
        name: mountain.name,
        elevationM: mountain.elevationM,
        difficulty: mountain.difficulty,
        distanceToPeakKm: mountain.distanceToPeakKm,
      },
      weather: {
        tempMeanC: climbDay?.tempMeanC,
        precipitationMm: climbDay?.precipitationMm,
        windSpeedMax: climbDay?.windSpeedMax,
        summary: climbDay?.summary,
      },
      memberCount: expedition.memberCount,
    };

    const readiness = await this.ai.assessReadiness(aiInput);

    const updated = await this.prisma.expedition.update({
      where: { id: expeditionId },
      data: {
        climbTempC: climbDay?.tempMeanC,
        weatherSummary: climbDay?.summary,
        readinessScore: readiness.readinessScore,
        decision: readiness.decision,
        aiRationale: readiness.rationale,
        status: 'READY',
      },
      include: { mountain: true, logistics: true },
    });

    return { expedition: updated, weatherForecast: forecasts };
  }

  findAll(userId: string) {
    return this.prisma.expedition.findMany({
      where: { userId },
      include: { mountain: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const expedition = await this.prisma.expedition.findFirst({
      where: { id, userId },
      include: { mountain: true, logistics: true },
    });
    if (!expedition) throw new NotFoundException('Expedition not found');
    return expedition;
  }

  private async getOwned(userId: string, id: string) {
    const expedition = await this.prisma.expedition.findFirst({
      where: { id, userId },
    });
    if (!expedition) throw new NotFoundException('Expedition not found');
    return expedition;
  }
}
