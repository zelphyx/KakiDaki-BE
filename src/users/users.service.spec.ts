import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock: any = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    fitnessProfile: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  describe('submitAssessment', () => {
    it('computes BMI and category correctly', async () => {
      prismaMock.user.update.mockResolvedValue({
        id: 'u1',
        heightCm: 170,
        weightKg: 65,
        bmi: 22.5,
        passwordHash: 'x',
      });

      const result = await service.submitAssessment('u1', {
        heightCm: 170,
        weightKg: 65,
        medicalHistory: 'none',
      });

      // 65 / (1.7^2) = 22.49 -> 22.5, category Normal
      expect(prismaMock.user.update).toHaveBeenCalled();
      const updateArg = prismaMock.user.update.mock.calls[0][0];
      expect(updateArg.data.bmi).toBeCloseTo(22.5, 1);
      expect(updateArg.data.hasCompletedAssessment).toBe(true);
      expect(result.bmiCategory).toBe('Normal');
    });

    it('does not leak passwordHash', async () => {
      prismaMock.user.update.mockResolvedValue({
        id: 'u1',
        bmi: 22.5,
        passwordHash: 'secret',
      });
      const result: any = await service.submitAssessment('u1', {
        heightCm: 170,
        weightKg: 65,
        medicalHistory: 'none',
      });
      expect(result.passwordHash).toBeUndefined();
    });
  });

  describe('upsertFitnessProfile', () => {
    it('computes a bounded capability score', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.fitnessProfile.upsert.mockImplementation((args: any) =>
        Promise.resolve(args.create),
      );

      const result: any = await service.upsertFitnessProfile('u1', {
        weeklyDistanceKm: 40,
        weeklyElevationM: 2000,
        longestHikeKm: 20,
        experienceLevel: 'advanced',
      });

      // Max: 35 + 30 + 20 + 15 = 100
      expect(result.capabilityScore).toBeCloseTo(100, 0);
      expect(result.source).toBe('MANUAL');
    });

    it('handles missing metrics as zero', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.fitnessProfile.upsert.mockImplementation((args: any) =>
        Promise.resolve(args.create),
      );

      const result: any = await service.upsertFitnessProfile('u1', {});
      expect(result.capabilityScore).toBe(0);
    });
  });
});
