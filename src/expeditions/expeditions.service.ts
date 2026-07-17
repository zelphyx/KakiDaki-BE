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

    if (!user.hasCompletedAssessment) {
      throw new ForbiddenException(
        'Please complete your health assessment (BMI + medical history) before preparing an expedition',
      );
    }

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

    const forecasts = await this.weather.getForecast(
      mountain.latitude,
      mountain.longitude,
      expedition.startDate,
      expedition.endDate,
    );
    const climbDay = forecasts[0];

    const weekOutlook = await this.weather.getWeekOutlook(
      mountain.latitude,
      mountain.longitude,
      expedition.startDate,
    );

    const summitTiming = this.computeSummitSunriseTiming(
      climbDay?.sunrise ?? null,
      mountain.distanceToPeakKm,
      user.fitnessProfile?.avgPaceMinPerKm ?? null,
    );

    const aiInput = {
      user: {
        age: user.age,
        gender: user.gender,
        bmi: user.bmi,
        medicalHistory: this.buildMedicalSummary(user),
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
    const trainingPlan = await this.ai.suggestTrainingPlan(aiInput);

    const updated = await this.prisma.expedition.update({
      where: { id: expeditionId },
      data: {
        climbTempC: climbDay?.tempMeanC,
        weatherSummary: climbDay?.summary,
        readinessScore: readiness.readinessScore,
        decision: readiness.decision,
        aiRationale: readiness.rationale,
        status: 'READY',
        trainingPlan: {
          upsert: {
            create: {
              summary: trainingPlan.summary,
              tasks: {
                create: trainingPlan.tasks.map(t => ({
                  activityType: t.activityType as any,
                  targetDistanceKm: t.targetDistanceKm,
                  targetElevationM: t.targetElevationM,
                  description: t.description,
                })),
              },
            },
            update: {
              summary: trainingPlan.summary,
              tasks: {
                deleteMany: {},
                create: trainingPlan.tasks.map(t => ({
                  activityType: t.activityType as any,
                  targetDistanceKm: t.targetDistanceKm,
                  targetElevationM: t.targetElevationM,
                  description: t.description,
                })),
              },
            },
          },
        },
      },
      include: { mountain: true, logistics: true, trainingPlan: { include: { tasks: true } } },
    });

    return {
      expedition: updated,
      weatherForecast: forecasts,
      weekOutlook,
      summitTiming,
    };
  }

  /**
   * Compute the recommended departure time to reach the summit for sunrise.
   * Uses the climb-day sunrise (Open-Meteo), the mountain's distance to peak,
   * and the user's average hiking pace (from Google Fit training, min/km).
   * Falls back to a conservative 20 min/km if pace is unknown.
   */
  private computeSummitSunriseTiming(
    sunriseIso: string | null,
    distanceToPeakKm: number,
    avgPaceMinPerKm: number | null,
  ) {
    if (!sunriseIso) return null;

    const sunrise = new Date(sunriseIso);
    if (isNaN(sunrise.getTime())) return null;

    const TERRAIN_FACTOR = 2.5;
    const FALLBACK_PACE_MIN_PER_KM = 20;
    const basePace = avgPaceMinPerKm ?? FALLBACK_PACE_MIN_PER_KM;
    const effectivePace = avgPaceMinPerKm
      ? basePace * TERRAIN_FACTOR
      : FALLBACK_PACE_MIN_PER_KM;

    const ascentMinutes = Math.round(distanceToPeakKm * effectivePace);
    const bufferMinutes = 15;
    const departure = new Date(
      sunrise.getTime() - (ascentMinutes + bufferMinutes) * 60 * 1000,
    );

    return {
      sunriseAtSummit: sunrise.toISOString(),
      estimatedAscentMinutes: ascentMinutes,
      bufferMinutes,
      recommendedDeparture: departure.toISOString(),
      paceMinPerKmUsed: +effectivePace.toFixed(1),
      paceSource: avgPaceMinPerKm ? 'strava' : 'fallback',
      note: avgPaceMinPerKm
        ? 'Pace dihitung dari rata-rata latihan Strava dengan faktor medan pendakian.'
        : 'Pace default dipakai karena belum ada data latihan Strava.',
    };
  }

  /**
   * Combine detailed assessment fields into a single medical summary for the AI.
   */
  private buildMedicalSummary(user: any): string | null {
    const parts: string[] = [];
    if (user.respiratoryHeartHistory)
      parts.push(`Pernapasan/jantung: ${user.respiratoryHeartHistory}`);
    if (user.physicalInjuryHistory)
      parts.push(`Cedera fisik: ${user.physicalInjuryHistory}`);
    if (user.weatherDrugAllergy)
      parts.push(`Alergi: ${user.weatherDrugAllergy}`);
    if (parts.length === 0) return user.medicalHistory ?? null;
    return parts.join('. ');
  }

  findAll(userId: string) {
    return this.prisma.expedition.findMany({
      where: { userId },
      include: { mountain: true, trainingPlan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const expedition = await this.prisma.expedition.findFirst({
      where: { id, userId },
      include: { mountain: true, logistics: true, trainingPlan: { include: { tasks: true } } },
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

  async getWeather(userId: string, expeditionId: string) {
    const expedition = await this.getOwned(userId, expeditionId);
    const mountain = await this.prisma.mountain.findUnique({
      where: { id: expedition.mountainId },
    });
    if (!mountain) throw new NotFoundException('Mountain not found');

    const weekOutlook = await this.weather.getWeekOutlook(
      mountain.latitude,
      mountain.longitude,
      expedition.startDate,
    );

    return { weekOutlook };
  }
}
