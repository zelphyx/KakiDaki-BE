import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class GoogleFitService {
  private readonly logger = new Logger(GoogleFitService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.clientId = this.config.get<string>('googleFit.clientId') ?? '';
    this.clientSecret = this.config.get<string>('googleFit.clientSecret') ?? '';
    this.redirectUri = this.config.get<string>('googleFit.redirectUri') ?? '';
  }

  getAuthUrl(userId: string): string {
    const scope = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.location.read',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope,
      access_type: 'offline',
      prompt: 'consent',
      state: userId,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleCallback(code: string, userId: string) {
    const { data } = await firstValueFrom(
      this.http.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleFitAccessToken: data.access_token,
        googleFitRefreshToken: data.refresh_token,
        googleFitTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return { message: 'Google Fit connected successfully' };
  }

  private async ensureValidToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleFitAccessToken) {
      throw new BadRequestException('Google Fit not connected');
    }

    const isExpired =
      user.googleFitTokenExpiry && user.googleFitTokenExpiry.getTime() < Date.now();
    if (!isExpired) return user.googleFitAccessToken;

    const { data } = await firstValueFrom(
      this.http.post('https://oauth2.googleapis.com/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: user.googleFitRefreshToken,
      }),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleFitAccessToken: data.access_token,
        googleFitTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
      },
    });

    return data.access_token;
  }

  async syncActivities(userId: string) {
    const token = await this.ensureValidToken(userId);
    const endTimeMillis = Date.now();
    const startTimeMillis = endTimeMillis - 28 * 24 * 60 * 60 * 1000;

    const { data } = await firstValueFrom(
      this.http.get('https://www.googleapis.com/fitness/v1/users/me/sessions', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startTime: new Date(startTimeMillis).toISOString(),
          endTime: new Date(endTimeMillis).toISOString(),
        },
      }),
    );

    let synced = 0;
    for (const session of data.session || []) {
      const activityType = this.mapActivityType(session.activityType);
      const startedAt = new Date(parseInt(session.startTimeMillis));
      const movingTimeSec = Math.round(
        (parseInt(session.endTimeMillis) - parseInt(session.startTimeMillis)) / 1000,
      );

      const { distanceKm, elevationGainM } = await this.getSessionMetrics(
        token,
        session.startTimeMillis,
        session.endTimeMillis,
      );

      const avgPace =
        distanceKm > 0 ? +(movingTimeSec / 60 / distanceKm).toFixed(2) : null;
      const externalId = session.id || `gfit-${session.startTimeMillis}`;

      await this.prisma.trainingLog.upsert({
        where: { externalActivityId: externalId },
        create: {
          userId,
          externalActivityId: externalId,
          activityType,
          distanceKm: +distanceKm.toFixed(2),
          elevationGainM: +elevationGainM.toFixed(0),
          movingTimeSec,
          avgPaceMinPerKm: avgPace,
          startedAt,
        },
        update: {
          distanceKm: +distanceKm.toFixed(2),
          elevationGainM: +elevationGainM.toFixed(0),
          movingTimeSec,
          avgPaceMinPerKm: avgPace,
        },
      });
      synced++;
    }

    await this.deriveFitnessProfile(userId);
    await this.matchTrainingTasks(userId);
    return { synced };
  }

  private async matchTrainingTasks(userId: string) {
    const incompleteTasks = await this.prisma.trainingTask.findMany({
      where: {
        isCompleted: false,
        trainingPlan: {
          expedition: {
            userId,
            status: { in: ['DRAFT', 'READY'] }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    if (incompleteTasks.length === 0) return;

    const allMatchedTasks = await this.prisma.trainingTask.findMany({
      where: {
        isCompleted: true,
        matchedLogId: { not: null },
        trainingPlan: { expedition: { userId } }
      },
      select: { matchedLogId: true }
    });
    const usedLogIds = allMatchedTasks.map(t => t.matchedLogId).filter(Boolean) as string[];

    for (const task of incompleteTasks) {
      const targetDist = task.targetDistanceKm ?? 0;
      const targetElev = task.targetElevationM ?? 0;

      const matchedLog = await this.prisma.trainingLog.findFirst({
        where: {
          userId,
          activityType: task.activityType,
          startedAt: { gte: task.createdAt },
          distanceKm: { gte: targetDist },
          elevationGainM: { gte: targetElev },
          id: { notIn: usedLogIds }
        },
        orderBy: { startedAt: 'asc' }
      });

      if (matchedLog) {
        await this.prisma.trainingTask.update({
          where: { id: task.id },
          data: { isCompleted: true, matchedLogId: matchedLog.id }
        });
        usedLogIds.push(matchedLog.id);
      }
    }
  }

  private async getSessionMetrics(
    token: string,
    startTimeMillis: string,
    endTimeMillis: string,
  ): Promise<{ distanceKm: number; elevationGainM: number }> {
    try {
      const body = {
        aggregateBy: [
          { dataTypeName: 'com.google.distance.delta' },
          { dataTypeName: 'com.google.height.delta' },
        ],
        startTimeMillis: parseInt(startTimeMillis),
        endTimeMillis: parseInt(endTimeMillis),
      };

      const { data } = await firstValueFrom(
        this.http.post(
          'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
          body,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      );

      let distanceM = 0;
      let elevationM = 0;
      for (const bucket of data.bucket || []) {
        for (const dataset of bucket.dataset || []) {
          for (const point of dataset.point || []) {
            if (point.dataTypeName === 'com.google.distance.delta') {
              distanceM += point.value?.[0]?.fpVal || 0;
            }
            if (point.dataTypeName === 'com.google.height.delta') {
              elevationM += point.value?.[0]?.fpVal || 0;
            }
          }
        }
      }
      return { distanceKm: distanceM / 1000, elevationGainM: elevationM };
    } catch {
      return { distanceKm: 0, elevationGainM: 0 };
    }
  }

  private mapActivityType(type: number): ActivityType {
    if (type === 8) return ActivityType.RUN;
    if (type === 1) return ActivityType.RIDE;
    if (type === 35) return ActivityType.HIKE;
    if (type === 7) return ActivityType.WALK;
    if (type === 36) return ActivityType.TRAIL_RUN;
    if ([80, 9, 10, 11, 12].includes(type)) return ActivityType.WORKOUT;
    return ActivityType.OTHER;
  }

  private async deriveFitnessProfile(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 28);

    const logs = await this.prisma.trainingLog.findMany({
      where: { userId, startedAt: { gte: since } },
    });
    if (logs.length === 0) return;

    const totalDist = logs.reduce((s, l) => s + l.distanceKm, 0);
    const totalElev = logs.reduce((s, l) => s + l.elevationGainM, 0);
    const longestHike = Math.max(...logs.map((l) => l.distanceKm));
    const paces = logs
      .map((l) => l.avgPaceMinPerKm)
      .filter((p): p is number => p != null);
    const avgPace = paces.length
      ? +(paces.reduce((s, p) => s + p, 0) / paces.length).toFixed(2)
      : null;

    const weeklyDist = totalDist / 4;
    const weeklyElev = totalElev / 4;
    const capabilityScore = this.computeCapability(weeklyDist, weeklyElev, longestHike);

    await this.prisma.fitnessProfile.upsert({
      where: { userId },
      create: {
        userId,
        source: 'GOOGLE_FIT',
        weeklyDistanceKm: +weeklyDist.toFixed(1),
        weeklyElevationM: +weeklyElev.toFixed(0),
        longestHikeKm: +longestHike.toFixed(1),
        avgPaceMinPerKm: avgPace,
        capabilityScore,
      },
      update: {
        source: 'GOOGLE_FIT',
        weeklyDistanceKm: +weeklyDist.toFixed(1),
        weeklyElevationM: +weeklyElev.toFixed(0),
        longestHikeKm: +longestHike.toFixed(1),
        avgPaceMinPerKm: avgPace,
        capabilityScore,
      },
    });
  }

  private computeCapability(
    weeklyDist: number,
    weeklyElev: number,
    longestHike: number,
  ): number {
    const distScore = Math.min(weeklyDist / 40, 1) * 40;
    const elevScore = Math.min(weeklyElev / 2000, 1) * 35;
    const hikeScore = Math.min(longestHike / 20, 1) * 25;
    return +(distScore + elevScore + hikeScore).toFixed(1);
  }

  getTrainingLogs(userId: string) {
    return this.prisma.trainingLog.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
  }
}
