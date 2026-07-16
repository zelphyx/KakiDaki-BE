import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AssessmentDto } from './dto/assessment.dto';
import { FitnessProfileDto } from './dto/fitness-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { fitnessProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { ...dto },
      include: { fitnessProfile: true },
    });
    return this.sanitize(user);
  }

  async submitAssessment(userId: string, dto: AssessmentDto) {
    const bmi = this.computeBmi(dto.heightCm, dto.weightKg);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        bmi,
        medicalHistory: dto.medicalHistory,
        hasCompletedAssessment: true,
      },
      include: { fitnessProfile: true },
    });
    return this.sanitize(user);
  }

  async getFitnessProfile(userId: string) {
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { userId },
    });
    if (!profile) throw new NotFoundException('Fitness profile not found');
    return profile;
  }

  async upsertFitnessProfile(userId: string, dto: FitnessProfileDto) {
    const capabilityScore = this.computeCapabilityScore(dto);
    const profile = await this.prisma.fitnessProfile.upsert({
      where: { userId },
      create: {
        userId,
        source: 'MANUAL',
        ...dto,
        capabilityScore,
      },
      update: {
        ...dto,
        capabilityScore,
      },
    });
    return profile;
  }

  private computeBmi(heightCm: number, weightKg: number): number {
    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
  }

  getBmiCategory(bmi: number): string {
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
  }

  private computeCapabilityScore(dto: FitnessProfileDto): number {
    let score = 0;

    if (dto.weeklyDistanceKm) {
      score += Math.min(dto.weeklyDistanceKm / 40, 1) * 35;
    }
    if (dto.weeklyElevationM) {
      score += Math.min(dto.weeklyElevationM / 2000, 1) * 30;
    }
    if (dto.longestHikeKm) {
      score += Math.min(dto.longestHikeKm / 20, 1) * 20;
    }
    if (dto.experienceLevel) {
      const expMap: Record<string, number> = {
        beginner: 5,
        intermediate: 10,
        advanced: 15,
      };
      score += expMap[dto.experienceLevel] ?? 0;
    }

    return Math.round(Math.min(score, 100) * 100) / 100;
  }

  sanitize(user: any) {
    const {
      passwordHash,
      stravaAccessToken,
      stravaRefreshToken,
      ...rest
    } = user;
    return rest;
  }
}