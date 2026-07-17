import { Injectable } from '@nestjs/common';
import { GeminiService } from './gemini.service';

export interface ReadinessInput {
  user: {
    age?: number | null;
    gender?: string | null;
    bmi?: number | null;
    medicalHistory?: string | null;
    capabilityScore?: number | null;
    weeklyDistanceKm?: number | null;
    weeklyElevationM?: number | null;
    longestHikeKm?: number | null;
  };
  mountain: {
    name: string;
    elevationM: number;
    difficulty: string;
    distanceToPeakKm: number;
  };
  weather: {
    tempMeanC?: number | null;
    precipitationMm?: number | null;
    windSpeedMax?: number | null;
    summary?: string | null;
  };
  memberCount: number;
}

export interface ReadinessResult {
  readinessScore: number; // 0-100
  decision: 'GO' | 'CAUTION' | 'NO_GO';
  rationale: string;
}

export interface LogisticSuggestion {
  itemName: string;
  amount: string;
  category: string;
  isMandatory: boolean;
  note?: string;
}

@Injectable()
export class AiReadinessService {
  constructor(private gemini: GeminiService) {}

  async assessReadiness(input: ReadinessInput): Promise<ReadinessResult> {
    const prompt = this.buildReadinessPrompt(input);
    const result = await this.gemini.generateJson<ReadinessResult>(prompt);
    if (result && typeof result.readinessScore === 'number') {
      return result;
    }
    return this.fallbackReadiness(input);
  }

  async suggestLogistics(
    input: ReadinessInput,
  ): Promise<LogisticSuggestion[]> {
    const prompt = this.buildLogisticsPrompt(input);
    const result = await this.gemini.generateJson<{
      items: LogisticSuggestion[];
    }>(prompt);
    if (result?.items?.length) return result.items;
    return this.fallbackLogistics(input);
  }

  async suggestTrainingPlan(input: ReadinessInput) {
    const prompt = this.buildTrainingPlanPrompt(input);
    const result = await this.gemini.generateJson<{
      summary: string;
      tasks: {
        activityType: string;
        targetDistanceKm: number;
        targetElevationM: number;
        description: string;
      }[];
    }>(prompt);
    
    if (result?.summary && result?.tasks?.length) {
      // Validate activity types
      result.tasks = result.tasks.map(t => ({
        ...t,
        activityType: ['RUN', 'RIDE', 'HIKE', 'WALK', 'TRAIL_RUN', 'WORKOUT'].includes(t.activityType) 
          ? t.activityType 
          : 'OTHER'
      }));
      return result;
    }
    return this.fallbackTrainingPlan(input);
  }

  private buildReadinessPrompt(input: ReadinessInput): string {
    return `You are a mountaineering safety expert for Indonesian mountains.
Analyze the climber's readiness and return ONLY JSON.

Climber:
- Age: ${input.user.age ?? 'unknown'}
- Gender: ${input.user.gender ?? 'unknown'}
- BMI: ${input.user.bmi ?? 'unknown'}
- Medical history: ${input.user.medicalHistory ?? 'none provided'}
- Fitness capability score (0-100): ${input.user.capabilityScore ?? 'unknown'}
- Weekly distance: ${input.user.weeklyDistanceKm ?? 'unknown'} km
- Weekly elevation gain: ${input.user.weeklyElevationM ?? 'unknown'} m
- Longest recent hike: ${input.user.longestHikeKm ?? 'unknown'} km

Mountain:
- Name: ${input.mountain.name}
- Elevation: ${input.mountain.elevationM} m
- Difficulty: ${input.mountain.difficulty}
- Distance to peak: ${input.mountain.distanceToPeakKm} km

Weather on climb day:
- Mean temp: ${input.weather.tempMeanC ?? 'unknown'} C
- Precipitation: ${input.weather.precipitationMm ?? 'unknown'} mm
- Max wind: ${input.weather.windSpeedMax ?? 'unknown'} km/h
- Summary: ${input.weather.summary ?? 'unknown'}

Group size: ${input.memberCount}

Return JSON exactly in this shape:
{
  "readinessScore": <number 0-100>,
  "decision": "GO" | "CAUTION" | "NO_GO",
  "rationale": "<2-3 sentence explanation in Indonesian>"
}`;
  }

  private buildLogisticsPrompt(input: ReadinessInput): string {
    return `You are a mountaineering logistics expert for Indonesian mountains.
Generate a packing list tailored to the climber and conditions. Return ONLY JSON.

Mountain: ${input.mountain.name}, ${input.mountain.elevationM} m, difficulty ${input.mountain.difficulty}, ${input.mountain.distanceToPeakKm} km to peak.
Weather: mean ${input.weather.tempMeanC ?? '?'} C, precipitation ${input.weather.precipitationMm ?? '?'} mm, ${input.weather.summary ?? ''}.
Group size: ${input.memberCount}.
Climber medical notes: ${input.user.medicalHistory ?? 'none'}.

Categories allowed: CLOTHING, FOOD, WATER, NAVIGATION, SHELTER, MEDICAL, TOOLS, DOCUMENTS, OTHER.
Mark life-critical/safety items as isMandatory true.

Return JSON exactly:
{
  "items": [
    { "itemName": "<string>", "amount": "<string>", "category": "<CATEGORY>", "isMandatory": <boolean>, "note": "<optional string>" }
  ]
}`;
  }

  private buildTrainingPlanPrompt(input: ReadinessInput): string {
    return `You are a sports science and mountaineering expert for Indonesian mountains.
Generate a physical training plan for a climber to prepare for a mountain expedition. Return ONLY JSON.

Climber:
- Age: ${input.user.age ?? 'unknown'}
- BMI: ${input.user.bmi ?? 'unknown'}
- Fitness capability score (0-100): ${input.user.capabilityScore ?? 'unknown'}

Mountain:
- Name: ${input.mountain.name}
- Elevation: ${input.mountain.elevationM} m
- Difficulty: ${input.mountain.difficulty}
- Distance to peak: ${input.mountain.distanceToPeakKm} km

Requirements:
- "summary": A brief 2-3 sentence overview in Indonesian of why this training is needed.
- "tasks": An array of training tasks. Activity types must be exactly one of: RUN, RIDE, HIKE, WALK, TRAIL_RUN, WORKOUT. 
- Target distance and elevation should be numbers (in km and m). Use 0 for elevation if not applicable.

Return JSON exactly:
{
  "summary": "<string in Indonesian>",
  "tasks": [
    {
      "activityType": "<RUN|RIDE|HIKE|WALK|TRAIL_RUN|WORKOUT>",
      "targetDistanceKm": <number>,
      "targetElevationM": <number>,
      "description": "<string in Indonesian>"
    }
  ]
}`;
  }

  private fallbackReadiness(input: ReadinessInput): ReadinessResult {
    let score = 60;
    const cap = input.user.capabilityScore;
    if (typeof cap === 'number') score = 0.6 * cap + 40;

    const gender = input.user.gender;
    const elev = input.mountain.elevationM;
    if (gender === 'FEMALE' && elev > 3500) {
      score -= Math.min((elev - 3500) / 500, 3) * 3; // -3 to -9
    }
    if (gender === 'MALE' && (input.user.bmi ?? 22) >= 27) {
      score -= 5;
    }

    if (input.mountain.difficulty === 'HARD') score -= 10;
    if (input.mountain.difficulty === 'EXTREME') score -= 20;
    if ((input.weather.precipitationMm ?? 0) > 20) score -= 10;
    if ((input.user.bmi ?? 22) >= 30) score -= 10;

    score = Math.max(0, Math.min(100, +score.toFixed(1)));

    let decision: ReadinessResult['decision'] = 'GO';
    if (score < 40) decision = 'NO_GO';
    else if (score < 65) decision = 'CAUTION';

    return {
      readinessScore: score,
      decision,
      rationale:
        'Skor dihitung dari heuristik cadangan karena layanan AI tidak tersedia. Pertimbangkan kondisi fisik, cuaca, dan tingkat kesulitan gunung.',
    };
  }

  private fallbackLogistics(input: ReadinessInput): LogisticSuggestion[] {
    const cold = (input.weather.tempMeanC ?? 15) < 10;
    const base: LogisticSuggestion[] = [
      { itemName: 'Tenda', amount: '1 unit', category: 'SHELTER', isMandatory: true },
      { itemName: 'Sleeping bag', amount: '1 pcs', category: 'SHELTER', isMandatory: true },
      { itemName: 'Air minum', amount: '3 liter', category: 'WATER', isMandatory: true },
      { itemName: 'Jas hujan', amount: '1 pcs', category: 'CLOTHING', isMandatory: true },
      { itemName: 'Headlamp + baterai', amount: '1 set', category: 'NAVIGATION', isMandatory: true },
      { itemName: 'P3K', amount: '1 kit', category: 'MEDICAL', isMandatory: true },
      { itemName: 'Makanan tinggi kalori', amount: '3 hari', category: 'FOOD', isMandatory: true },
      { itemName: 'Kartu identitas', amount: '1 pcs', category: 'DOCUMENTS', isMandatory: true },
    ];
    if (cold) {
      base.push({
        itemName: 'Jaket down / thermal',
        amount: '1 pcs',
        category: 'CLOTHING',
        isMandatory: true,
        note: 'Suhu dingin diprediksi',
      });
    }
    return base;
  }

  private fallbackTrainingPlan(input: ReadinessInput) {
    return {
      summary: 'Kondisi fisik dasar perlu disiapkan sebelum pendakian. Lakukan latihan kardio ringan secara rutin.',
      tasks: [
        {
          activityType: 'RUN',
          targetDistanceKm: 3,
          targetElevationM: 0,
          description: 'Lari santai 3km untuk membiasakan detak jantung (kardio dasar).',
        },
        {
          activityType: 'WALK',
          targetDistanceKm: 5,
          targetElevationM: 0,
          description: 'Jalan cepat sejauh 5km untuk ketahanan otot kaki.',
        },
      ],
    };
  }
}
