import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface WeatherForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  tempMean: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  summary: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly baseUrl: string;

  constructor(
    private httpService: HttpService,
    private config: ConfigService,
  ) {
    this.baseUrl = this.config.get<string>(
      'OPENMETEO_BASE_URL',
      'https://api.open-meteo.com/v1/forecast',
    );
  }

  async getForecast(
    latitude: number,
    longitude: number,
    days = 7,
  ): Promise<WeatherForecast[]> {
    const params = {
      latitude,
      longitude,
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'temperature_2m_mean',
        'precipitation_sum',
        'wind_speed_10m_max',
        'weather_code',
      ].join(','),
      timezone: 'auto',
      forecast_days: days,
    };

    try {
      const res = await firstValueFrom(
        this.httpService.get(this.baseUrl, { params }),
      );
      const daily = res.data.daily;
      const forecasts: WeatherForecast[] = [];

      for (let i = 0; i < daily.time.length; i++) {
        forecasts.push({
          date: daily.time[i],
          tempMax: daily.temperature_2m_max[i],
          tempMin: daily.temperature_2m_min[i],
          tempMean: daily.temperature_2m_mean[i],
          precipitation: daily.precipitation_sum[i],
          windSpeed: daily.wind_speed_10m_max[i],
          weatherCode: daily.weather_code[i],
          summary: this.mapWeatherCode(daily.weather_code[i]),
        });
      }

      return forecasts;
    } catch (err) {
      this.logger.error(`Weather fetch failed: ${err}`);
      return [];
    }
  }

  async getElevation(
    latitude: number,
    longitude: number,
  ): Promise<number | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get('https://api.open-meteo.com/v1/elevation', {
          params: { latitude, longitude },
        }),
      );
      return res.data.elevation?.[0] ?? null;
    } catch (err) {
      this.logger.error(`Elevation fetch failed: ${err}`);
      return null;
    }
  }

  private mapWeatherCode(code: number): string {
    const map: Record<number, string> = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Fog',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      56: 'Light freezing drizzle',
      57: 'Dense freezing drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      66: 'Light freezing rain',
      67: 'Heavy freezing rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      77: 'Snow grains',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      85: 'Slight snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail',
    };
    return map[code] ?? 'Unknown';
  }
}