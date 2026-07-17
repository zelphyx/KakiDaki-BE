import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Difficulty } from '@prisma/client';

export interface ExternalPeak {
  externalId: string;
  name: string;
  elevationM: number | null;
  latitude: number;
  longitude: number;
  source: 'openstreetmap';
}

@Injectable()
export class MountainDiscoveryService {
  private readonly logger = new Logger(MountainDiscoveryService.name);
  private readonly nominatimUrl =
    'https://nominatim.openstreetmap.org/search';
  private readonly elevationUrl =
    'https://api.open-meteo.com/v1/elevation';

  constructor(private http: HttpService) {}

  /**
   * Search Indonesian peaks by name using Nominatim (indexed, fast),
   * then enrich with elevation from Open-Meteo.
   */
  async searchPeaks(query: string, limit = 10): Promise<ExternalPeak[]> {
    const safe = (query || '').trim();
    if (!safe) return [];

    try {
      const { data } = await firstValueFrom(
        this.http.get(this.nominatimUrl, {
          params: {
            q: safe,
            countrycodes: 'id',
            format: 'json',
            limit,
          },
          headers: { 'User-Agent': 'KakiDaki/1.0 (mountain-prep)' },
        }),
      );

      const peaks = this.mapResults(data ?? []);
      return this.enrichElevation(peaks);
    } catch (err) {
      this.logger.error(`Nominatim search failed: ${err.message}`);
      return [];
    }
  }

  private mapResults(results: any[]): ExternalPeak[] {
    return results
      .filter(
        (r) =>
          r.class === 'natural' &&
          ['peak', 'volcano', 'mountain_range'].includes(r.type) &&
          r.name,
      )
      .map((r) => ({
        externalId: `osm:${r.osm_type?.[0] ?? 'n'}${r.osm_id}`,
        name: r.name,
        elevationM: null as number | null,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        source: 'openstreetmap' as const,
      }));
  }

  /**
   * Batch-fetch elevation for peaks from Open-Meteo.
   */
  private async enrichElevation(
    peaks: ExternalPeak[],
  ): Promise<ExternalPeak[]> {
    if (peaks.length === 0) return peaks;
    try {
      const latitudes = peaks.map((p) => p.latitude).join(',');
      const longitudes = peaks.map((p) => p.longitude).join(',');
      const { data } = await firstValueFrom(
        this.http.get(this.elevationUrl, {
          params: { latitude: latitudes, longitude: longitudes },
        }),
      );
      const elevations: number[] = data?.elevation ?? [];
      return peaks.map((p, i) => ({
        ...p,
        elevationM: elevations[i] ?? null,
      }));
    } catch (err) {
      this.logger.warn(`Elevation enrichment failed: ${err.message}`);
      return peaks;
    }
  }

  /**
   * Estimate difficulty from elevation (user can override on import).
   */
  estimateDifficulty(elevationM: number | null): Difficulty {
    const e = elevationM ?? 0;
    if (e < 2000) return Difficulty.EASY;
    if (e < 2800) return Difficulty.MODERATE;
    if (e < 3500) return Difficulty.HARD;
    return Difficulty.EXTREME;
  }

  /**
   * Rough trail-distance estimate (km) from elevation. Override recommended.
   */
  estimateDistanceKm(elevationM: number | null): number {
    const e = elevationM ?? 1500;
    return +(e / 350).toFixed(1);
  }
}
