import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface ReadinessInput {
  age?: number;
  bmi?: number;
  medicalHistory?: string;
  capabilityScore?: number;
  weeklyDistanceKm?: number;
  weeklyElevationM?: number;
  longestHikeKm?: number;
  experienceLevel?: string;
  mountainName: string;
  elevationM: number;
  difficulty: string;
  distanceToPeakKm: number;
  tempMean?: number;
  precipitation?: number;
  windSpeed?: number;
  weatherSummary?: string;
  memberCount: number;
}

export interface ReadinessResult {
  readinessScore: number;
  decision: 'GO' | 'CAUTION' | 'NO_GO';
  rationale: string;
}

export interface LogisticsSuggestion {
  itemName: string;
  amount: string;
  category: string;
  isMandatory: boolean;
  note?: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    private httpService: HttpService,
    private config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.model = this.config.get<string>('GEMINI_MODEL', 'gemini-1.5-flash');
  }

  async assessReadiness(input: ReadinessInput): Promise<ReadinessResult> {
    if (!this.apiKey) {
      this.logger.warn('No GEMINI_API_KEY, using fallback heuristic');
      return this.fallbackReadiness(input);
    }

    const prompt = this.buildReadinessPrompt(input);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await firstValueFrom(
        this.httpService.post(url, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      );

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        this.logger.warn('Gemini returned empty, using fallback');
        return this.fallbackReadiness(input);
      }

      const parsed = JSON.parse(text);
      return {
        readinessScore: Math.round(parsed.readinessScore),
        decision: parsed.decision,
        rationale: parsed.rationale,
      };
    } catch (err) {
      this.logger.error(`Gemini readiness failed: ${err}`);
      return this.fallbackReadiness(input);
    }
  }

  async suggestLogistics(input: {
    mountainName: string;
    elevationM: number;
    difficulty: string;
    tempMean?: number;
    precipitation?: number;
    weatherSummary?: string;
    medicalHistory?: string;
    memberCount: number;
  }): Promise<LogisticsSuggestion[]> {
    if (!this.apiKey) {
      this.logger.warn('No GEMINI_API_KEY, using fallback logistics');
      return this.fallbackLogistics(input);
    }

    const prompt = this.buildLogisticsPrompt(input);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
      const res = await firstValueFrom(
        this.httpService.post(url, {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      );

      const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        this.logger.warn('Gemini returned empty, using fallback logistics');
        return this.fallbackLogistics(input);
      }

      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : parsed.items ?? [];
    } catch (err) {
      this.logger.error(`Gemini logistics failed: ${err}`);
      return this.fallbackLogistics(input);
    }
  }

  private buildReadinessPrompt(input: ReadinessInput): string {
    return `You are a mountain climbing safety expert. Analyze the following climber and mountain data, then return a JSON object with readinessScore (0-100), decision (GO/CAUTION/NO_GO), and rationale (string explanation).

Climber profile:
- Age: ${input.age ?? 'unknown'}
- BMI: ${input.bmi ?? 'unknown'}
- Medical history: ${input.medicalHistory ?? 'none'}
- Capability score: ${input.capabilityScore ?? 'unknown'}/100
- Weekly distance: ${input.weeklyDistanceKm ?? 'unknown'} km
- Weekly elevation: ${input.weeklyElevationM ?? 'unknown'} m
- Longest hike: ${input.longestHikeKm ?? 'unknown'} km
- Experience: ${input.experienceLevel ?? 'unknown'}

Mountain:
- Name: ${input.mountainName}
- Elevation: ${input.elevationM}m
- Difficulty: ${input.difficulty}
- Distance to peak: ${input.distanceToPeakKm} km

Weather forecast:
- Mean temp: ${input.tempMean ?? 'unknown'}°C
- Precipitation: ${input.precipitation ?? 'unknown'}mm
- Wind speed: ${input.windSpeed ?? 'unknown'} km/h
- Summary: ${input.weatherSummary ?? 'unknown'}

Group size: ${input.memberCount}

Return JSON: {"readinessScore": number, "decision": "GO"|"CAUTION"|"NO_GO", "rationale": "string"}`;
  }

  private buildLogisticsPrompt(input: {
    mountainName: string;
    elevationM: number;
    difficulty: string;
    tempMean?: number;
    precipitation?: number;
    weatherSummary?: string;
    medicalHistory?: string;
    memberCount: number;
  }): string {
    return `You are a mountain climbing packing expert. Generate a packing list for the following expedition. Return a JSON array of items.

Mountain: ${input.mountainName} (${input.elevationM}m, ${input.difficulty})
Weather: ${input.weatherSummary ?? 'unknown'}, ${input.tempMean ?? 'unknown'}°C, ${input.precipitation ?? 'unknown'}mm precipitation
Medical concerns: ${input.medicalHistory ?? 'none'}
Group size: ${input.memberCount}

Categories: CLOTHING, FOOD, WATER, NAVIGATION, SHELTER, MEDICAL, TOOLS, DOCUMENTS, OTHER

Return JSON array: [{"itemName": "string", "amount": "string", "category": "CLOTHING|FOOD|WATER|NAVIGATION|SHELTER|MEDICAL|TOOLS|DOCUMENTS|OTHER", "isMandatory": boolean, "note": "string?"}]`;
  }

  private fallbackReadiness(input: ReadinessInput): ReadinessResult {
    let score = 0.6 * (input.capabilityScore ?? 50) + 40;

    if (input.difficulty === 'HARD') score -= 10;
    if (input.difficulty === 'EXTREME') score -= 20;
    if (input.precipitation && input.precipitation > 20) score -= 10;
    if (input.bmi && input.bmi >= 30) score -= 10;

    score = Math.max(0, Math.min(100, Math.round(score)));

    let decision: 'GO' | 'CAUTION' | 'NO_GO';
    if (score < 40) decision = 'NO_GO';
    else if (score < 65) decision = 'CAUTION';
    else decision = 'GO';

    return {
      readinessScore: score,
      decision,
      rationale: `Heuristic assessment based on capability score (${input.capabilityScore ?? 'unknown'}), difficulty (${input.difficulty}), precipitation (${input.precipitation ?? 'unknown'}mm), and BMI (${input.bmi ?? 'unknown'}).`,
    };
  }

  private fallbackLogistics(input: {
    mountainName: string;
    elevationM: number;
    difficulty: string;
    tempMean?: number;
    memberCount: number;
  }): LogisticsSuggestion[] {
    const items: LogisticsSuggestion[] = [
      { itemName: 'Hiking boots', amount: '1 pair', category: 'CLOTHING', isMandatory: true },
      { itemName: 'Rain jacket', amount: '1 pcs', category: 'CLOTHING', isMandatory: true },
      { itemName: 'Fleece jacket', amount: '1 pcs', category: 'CLOTHING', isMandatory: true },
      { itemName: 'Trekking pants', amount: '1 pcs', category: 'CLOTHING', isMandatory: true },
      { itemName: 'Headlamp', amount: '1 pcs', category: 'TOOLS', isMandatory: true },
      { itemName: 'Tent', amount: `${Math.ceil(input.memberCount / 2)} pcs`, category: 'SHELTER', isMandatory: true },
      { itemName: 'Sleeping bag', amount: '1 pcs', category: 'SHELTER', isMandatory: true },
      { itemName: 'Trail food', amount: '2000 kcal/day', category: 'FOOD', isMandatory: true },
      { itemName: 'Water bottles', amount: '2 liters', category: 'WATER', isMandatory: true },
      { itemName: 'First aid kit', amount: '1 set', category: 'MEDICAL', isMandatory: true },
      { itemName: 'Map and compass', amount: '1 set', category: 'NAVIGATION', isMandatory: true },
      { itemName: 'ID card', amount: '1 pcs', category: 'DOCUMENTS', isMandatory: true },
    ];

    if (input.tempMean !== undefined && input.tempMean < 10) {
      items.push(
        { itemName: 'Thermal base layer', amount: '1 set', category: 'CLOTHING', isMandatory: true, note: 'Cold weather gear' },
        { itemName: 'Warm gloves', amount: '1 pair', category: 'CLOTHING', isMandatory: true, note: 'Cold weather gear' },
        { itemName: 'Beanie', amount: '1 pcs', category: 'CLOTHING', isMandatory: true, note: 'Cold weather gear' },
      );
    }

    return items;
  }
}