import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityType } from '@prisma/client';

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.clientId = this.config.get<string>('strava.clientId') ?? '';
    this.clientSecret = this.config.get<string>('strava.clientSecret') ?? '';
    this.redirectUri = this.config.get<string>('strava.redirectUri') ?? '';
  }

  getAuthUrl(userId: string): string {
    const scope = 'read,activity:read_all';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope,
      state: userId,
    });
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, userId: string) {
    const { data } = await firstValueFrom(
      this.http.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stravaAthleteId: String(data.athlete?.id),
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiry: new Date(data.expires_at * 1000),
      },
    });

    return { message: 'Strava connected successfully' };
  }

  private async ensureValidToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.stravaAccessToken) {
      throw new BadRequestException('Strava not connected');
    }

    const isExpired =
      user.stravaTokenExpiry && user.stravaTokenExpiry.getTime() < Date.now();
    if (!isExpired) return user.stravaAccessToken;

    const { data } = await firstValueFrom(
      this.http.post('https://www.strava.com/oauth/token', {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: user.stravaRefreshToken,
      }),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        stravaAccessToken: data.access_token,
        stravaRefreshToken: data.refresh_token,
        stravaTokenExpiry: new Date(data.expires_at * 1000),
      },
    });

    return data.access_token;
  }

  async syncActivities(userId: string, perPage = 30) {
    const token = await this.ensureValidToken(userId);
    const { data } = await firstValueFrom(
      this.http.get('https://www.strava.com/api/v3/athlete/activities', {
        headers: { Authorization: `Bearer ${token}` },
        params: { per_page: perPage },
      }),
    );

    let synced = 0;
    for (const act of data) {
      const distanceKm = (act.distance || 0) / 1000;
      const movingTimeSec = act.moving_time || 0;
      const avgPace =
        distanceKm > 0 ? +(movingTimeSec / 60 / distanceKm).toFixed(2) : null;

      await this.prisma.trainingLog.upsert({
        where: { stravaActivityId: String(act.id) },
        create: {
          userId,
          stravaActivityId: String(act.id),
          activityType: this.mapType(act.type),
          distanceKm: +distanceKm.toFixed(2),
          elevationGainM: act.total_elevation_gain || 0,
          movingTimeSec,
          avgPaceMinPerKm: avgPace,
          startedAt: new Date(act.start_date),
        },
        update: {
          distanceKm: +distanceKm.toFixed(2),
          elevationGainM: act.total_elevation_gain || 0,
          movingTimeSec,
          avgPaceMinPerKm: avgPace,
        },
      });
      synced++;
    }

    await this.deriveFitnessFromStrava(userId);
    return { synced };
  }

  private mapType(type: string): ActivityType {
    const t = (type || '').toLowerCase();
    if (t === 'run') return ActivityType.RUN;
    if (t === 'ride') return ActivityType.RIDE;
    if (t === 'hike') return ActivityType.HIKE;
    if (t === 'walk') return ActivityType.WALK;
    if (t === 'trailrun') return ActivityType.TRAIL_RUN;
    if (t === 'workout') return ActivityType.WORKOUT;
    return ActivityType.OTHER;
  }

  private async deriveFitnessFromStrava(userId: string) {
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
        source: 'STRAVA',
        weeklyDistanceKm: +weeklyDist.toFixed(1),
        weeklyElevationM: +weeklyElev.toFixed(0),
        longestHikeKm: +longestHike.toFixed(1),
        avgPaceMinPerKm: avgPace,
        capabilityScore,
      },
      update: {
        source: 'STRAVA',
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
