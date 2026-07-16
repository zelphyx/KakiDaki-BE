import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface WeatherForecast {
  date: string;
  tempMaxC: number;
  tempMinC: number;
  tempMeanC: number;
  precipitationMm: number;
  windSpeedMax: number;
  weatherCode: number;
  summary: string;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly baseUrl: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    this.baseUrl =
      this.config.get<string>('openMeteo.baseUrl') ??
      'https://api.open-meteo.com/v1/forecast';
  }

  async getForecast(
    latitude: number,
    longitude: number,
    startDate: Date,
    endDate: Date,
  ): Promise<WeatherForecast[]> {
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];

    const params = {
      latitude,
      longitude,
      daily:
        'temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,wind_speed_10m_max,weather_code',
      timezone: 'auto',
      start_date: start,
      end_date: end,
    };

    try {
      const { data } = await firstValueFrom(
        this.http.get(this.baseUrl, { params }),
      );
      return this.mapDaily(data.daily);
    } catch (err) {
      this.logger.error(`Open-Meteo request failed: ${err.message}`);
      return [];
    }
  }

  private mapDaily(daily: any): WeatherForecast[] {
    if (!daily?.time) return [];
    return daily.time.map((date: string, i: number) => {
      const code = daily.weather_code[i];
      return {
        date,
        tempMaxC: daily.temperature_2m_max[i],
        tempMinC: daily.temperature_2m_min[i],
        tempMeanC: daily.temperature_2m_mean[i],
        precipitationMm: daily.precipitation_sum[i],
        windSpeedMax: daily.wind_speed_10m_max[i],
        weatherCode: code,
        summary: this.describe(code),
      };
    });
  }

  private describe(code: number): string {
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
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail',
    };
    return map[code] || 'Unknown';
  }
}
