import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface VisionResult {
  objects: { label: string; confidence: number }[];
  summary: string;
  rawResponse?: any;
}

@Injectable()
export class VisionService {
  private readonly logger = new Logger(VisionService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('openrouter.apiKey') ?? '';
    this.model =
      this.config.get<string>('openrouter.model') ??
      'google/gemini-2.5-flash';
  }

  async recognizeImage(
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<VisionResult> {
    const base64 = fileBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const body = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content:
            'You are an image recognition assistant. Identify all visible objects in the image. ' +
            'Respond ONLY with JSON in this format: ' +
            '{"objects":[{"label":"object name","confidence":0.0-1.0}],"summary":"brief description of the scene"}',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify all objects visible in this image. Return JSON only.',
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    };

    try {
      const { data } = await firstValueFrom(
        this.http.post(this.baseUrl, body, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://kakidaki.my.id',
            'X-Title': 'KakiDaki',
          },
        }),
      );

      const text: string =
        data?.choices?.[0]?.message?.content ?? '';

      return this.parseResponse(text, data);
    } catch (err) {
      this.logger.error(`OpenRouter request failed: ${err.message}`);
      throw err;
    }
  }

  private parseResponse(text: string, raw: any): VisionResult {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const parsed = JSON.parse(cleaned);

      return {
        objects: parsed.objects ?? [],
        summary: parsed.summary ?? '',
        rawResponse: raw,
      };
    } catch {
      this.logger.warn('Failed to parse OpenRouter JSON, returning raw text');
      return {
        objects: [],
        summary: text,
        rawResponse: raw,
      };
    }
  }
}