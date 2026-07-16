import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, AssessmentDto } from './dto/user.dto';
import { UpsertFitnessProfileDto } from './dto/fitness.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { fitnessProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
    return this.sanitize(user);
  }

  async submitAssessment(userId: string, dto: AssessmentDto) {
    const heightM = dto.heightCm / 100;
    const bmi = +(dto.weightKg / (heightM * heightM)).toFixed(1);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        bmi,
        medicalHistory: dto.medicalHistory,
        respiratoryHeartHistory: dto.respiratoryHeartHistory,
        physicalInjuryHistory: dto.physicalInjuryHistory,
        weatherDrugAllergy: dto.weatherDrugAllergy,
        hasCompletedAssessment: true,
      },
    });
    return { ...this.sanitize(user), bmiCategory: this.bmiCategory(bmi) };
  }

  async upsertFitnessProfile(userId: string, dto: UpsertFitnessProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const capabilityScore = this.computeCapability(
      dto.weeklyDistanceKm,
      dto.weeklyElevationM,
      dto.longestHikeKm,
      dto.experienceLevel,
    );

    return this.prisma.fitnessProfile.upsert({
      where: { userId },
      create: {
        userId,
        source: 'MANUAL',
        weeklyDistanceKm: dto.weeklyDistanceKm,
        weeklyElevationM: dto.weeklyElevationM,
        longestHikeKm: dto.longestHikeKm,
        avgPaceMinPerKm: dto.avgPaceMinPerKm,
        restingHeartRate: dto.restingHeartRate,
        experienceLevel: dto.experienceLevel,
        capabilityScore,
      },
      update: {
        source: 'MANUAL',
        weeklyDistanceKm: dto.weeklyDistanceKm,
        weeklyElevationM: dto.weeklyElevationM,
        longestHikeKm: dto.longestHikeKm,
        avgPaceMinPerKm: dto.avgPaceMinPerKm,
        restingHeartRate: dto.restingHeartRate,
        experienceLevel: dto.experienceLevel,
        capabilityScore,
      },
    });
  }

  async getFitnessProfile(userId: string) {
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Fitness profile not set');
    return profile;
  }

  private computeCapability(
    weeklyDist?: number,
    weeklyElev?: number,
    longestHike?: number,
    experience?: string,
  ): number {
    const distScore = Math.min((weeklyDist ?? 0) / 40, 1) * 35;
    const elevScore = Math.min((weeklyElev ?? 0) / 2000, 1) * 30;
    const hikeScore = Math.min((longestHike ?? 0) / 20, 1) * 20;
    const expMap: Record<string, number> = {
      beginner: 5,
      intermediate: 10,
      advanced: 15,
    };
    const expScore = expMap[experience ?? ''] ?? 0;
    return +(distScore + elevScore + hikeScore + expScore).toFixed(1);
  }

  private bmiCategory(bmi: number): string {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  private sanitize(user: any) {
    const { passwordHash, stravaAccessToken, stravaRefreshToken, ...rest } =
      user;
    return rest;
  }
}
