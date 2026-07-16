import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SearchResult {
  name: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  alreadyImported: boolean;
  suggestedDifficulty: string;
  suggestedDistanceKm: number;
  displayName: string;
}

@Injectable()
export class MountainDiscoveryService {
  private readonly logger = new Logger(MountainDiscoveryService.name);

  constructor(private httpService: HttpService) {}

  async searchPeaks(
    query: string,
    importedNames: string[],
  ): Promise<SearchResult[]> {
    // Search via OpenStreetMap Nominatim
    const nominatimUrl = 'https://nominatim.openstreetmap.org/search';
    const params = {
      q: query,
      countrycodes: 'id',
      format: 'json',
      limit: 20,
      addressdetails: 0,
      extratags: 1,
    };

    let results: any[] = [];
    try {
      const res = await firstValueFrom(
        this.httpService.get(nominatimUrl, {
          params,
          headers: {
            'User-Agent': 'KakiDaki/1.0 (contact@kakidaki.app)',
            Accept: 'application/json',
          },
        }),
      );
      results = (res.data as any[]).filter(
        (item) =>
          item.class === 'natural' &&
          ['peak', 'volcano', 'mountain_range'].includes(item.type),
      );
    } catch (err) {
      this.logger.error(`Nominatim search failed: ${err}`);
      return [];
    }

    if (results.length === 0) return [];

    // Batch fetch elevations from Open-Meteo
    const coordinates = results.map((r) => ({
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    }));
    const elevations = await this.batchElevations(coordinates);

    // Build results
    return results.map((r, i) => {
      const elevation = elevations[i] ?? 0;
      const name = r.display_name?.split(',')[0] ?? 'Unknown';
      return {
        name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
        elevationM: Math.round(elevation),
        alreadyImported: importedNames.includes(name),
        suggestedDifficulty: this.estimateDifficulty(elevation),
        suggestedDistanceKm: this.estimateDistance(elevation),
        displayName: r.display_name,
      } as SearchResult;
    });
  }

  private async batchElevations(
    coordinates: { latitude: number; longitude: number }[],
  ): Promise<number[]> {
    if (coordinates.length === 0) return [];

    const lats = coordinates.map((c) => c.latitude).join(',');
    const lons = coordinates.map((c) => c.longitude).join(',');
    const url = 'https://api.open-meteo.com/v1/elevation';

    try {
      const res = await firstValueFrom(
        this.httpService.get(url, {
          params: { latitude: lats, longitude: lons },
        }),
      );
      return (res.data as any).elevation ?? [];
    } catch (err) {
      this.logger.error(`Elevation fetch failed: ${err}`);
      return coordinates.map(() => 0);
    }
  }

  estimateDifficulty(elevationM: number): string {
    if (elevationM < 2000) return 'EASY';
    if (elevationM < 2800) return 'MODERATE';
    if (elevationM < 3500) return 'HARD';
    return 'EXTREME';
  }

  estimateDistance(elevationM: number): number {
    return Math.round((elevationM / 350) * 10) / 10;
  }
}