import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { BadRequestException } from '@nestjs/common';
import { GoogleFitService } from './google-fit.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

describe('GoogleFitService', () => {
  let service: GoogleFitService;

  const configMock = {
    get: (key: string) => {
      const map: Record<string, any> = {
        'googleFit.clientId': 'test-client-id',
        'googleFit.clientSecret': 'test-client-secret',
        'googleFit.redirectUri': 'https://api.kakidaki.my.id/api/v1/google-fit/callback',
      };
      return map[key];
    },
  };

  const httpPostMock = jest.fn();
  const httpGetMock = jest.fn();
  const httpMock = {
    post: httpPostMock,
    get: httpGetMock,
  } as any as HttpService;

  const prismaMock: any = {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    trainingLog: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    fitnessProfile: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        GoogleFitService,
        { provide: ConfigService, useValue: configMock },
        { provide: HttpService, useValue: httpMock },
        { provide: PrismaService, useValue: prismaMock as any },
      ],
    }).compile();

    service = moduleRef.get(GoogleFitService);
  });

  describe('getAuthUrl', () => {
    it('should return a valid Google OAuth URL with correct params', () => {
      const url = service.getAuthUrl('user-123');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
      expect(url).toContain('state=user-123');
      expect(url).toContain('fitness.activity.read');
      expect(url).toContain('fitness.location.read');
    });
  });

  describe('handleCallback', () => {
    it('should exchange code for tokens and update user', async () => {
      httpPostMock.mockReturnValue(
        of({
          data: {
            access_token: 'access-123',
            refresh_token: 'refresh-123',
            expires_in: 3600,
          },
        }),
      );

      const result = await service.handleCallback('auth-code', 'user-123');

      expect(httpPostMock).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'auth-code',
          grant_type: 'authorization_code',
        }),
      );
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          googleFitAccessToken: 'access-123',
          googleFitRefreshToken: 'refresh-123',
        }),
      });
      expect(result).toEqual({ message: 'Google Fit connected successfully' });
    });
  });

  describe('syncActivities', () => {
    const validUser = {
      id: 'user-123',
      googleFitAccessToken: 'valid-token',
      googleFitRefreshToken: 'refresh-token',
      googleFitTokenExpiry: new Date(Date.now() + 3600 * 1000),
    };

    const mockSessions = {
      session: [
        {
          id: 'session-1',
          activityType: 8,
          startTimeMillis: String(Date.now() - 3 * 24 * 60 * 60 * 1000),
          endTimeMillis: String(Date.now() - 3 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
        },
        {
          id: 'session-2',
          activityType: 35,
          startTimeMillis: String(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endTimeMillis: String(Date.now() - 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        },
      ],
    };

    const mockAggregate = {
      bucket: [
        {
          dataset: [
            {
              point: [
                {
                  dataTypeName: 'com.google.distance.delta',
                  value: [{ fpVal: 5000 }],
                },
                {
                  dataTypeName: 'com.google.height.delta',
                  value: [{ fpVal: 300 }],
                },
              ],
            },
          ],
        },
      ],
    };

    it('should sync sessions and derive fitness profile', async () => {
      prismaMock.user.findUnique.mockResolvedValue(validUser);
      httpGetMock.mockReturnValue(of({ data: mockSessions }));
      httpPostMock.mockReturnValue(of({ data: mockAggregate }));

      prismaMock.trainingLog.upsert.mockResolvedValue({});
      prismaMock.trainingLog.findMany.mockResolvedValue([
        { distanceKm: 5, elevationGainM: 300, avgPaceMinPerKm: 6 },
        { distanceKm: 5, elevationGainM: 300, avgPaceMinPerKm: 6 },
      ]);
      prismaMock.fitnessProfile.upsert.mockResolvedValue({});

      const result = await service.syncActivities('user-123');

      expect(result).toEqual({ synced: 2 });
      expect(prismaMock.trainingLog.upsert).toHaveBeenCalledTimes(2);
      expect(prismaMock.fitnessProfile.upsert).toHaveBeenCalledTimes(1);

      const firstCall = prismaMock.trainingLog.upsert.mock.calls[0][0];
      expect(firstCall.create.activityType).toBe(ActivityType.RUN);
      expect(firstCall.create.distanceKm).toBe(5);
      expect(firstCall.create.elevationGainM).toBe(300);

      const secondCall = prismaMock.trainingLog.upsert.mock.calls[1][0];
      expect(secondCall.create.activityType).toBe(ActivityType.HIKE);
    });

    it('should throw BadRequestException if Google Fit not connected', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'user-123',
        googleFitAccessToken: null,
      });

      await expect(service.syncActivities('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle empty sessions gracefully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(validUser);
      httpGetMock.mockReturnValue(of({ data: { session: [] } }));
      prismaMock.trainingLog.findMany.mockResolvedValue([]);

      const result = await service.syncActivities('user-123');

      expect(result).toEqual({ synced: 0 });
      expect(prismaMock.trainingLog.upsert).not.toHaveBeenCalled();
      expect(prismaMock.fitnessProfile.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getTrainingLogs', () => {
    it('should return training logs ordered by startedAt desc', async () => {
      const mockLogs = [
        { id: 'log-1', distanceKm: 5, startedAt: new Date() },
      ];
      prismaMock.trainingLog.findMany.mockResolvedValue(mockLogs);

      const result = await service.getTrainingLogs('user-123');

      expect(result).toEqual(mockLogs);
      expect(prismaMock.trainingLog.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { startedAt: 'desc' },
      });
    });
  });
});