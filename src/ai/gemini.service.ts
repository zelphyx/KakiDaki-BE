import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    private http: HttpService,
    private config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('gemini.apiKey') ?? '';
    this.model =
      this.config.get<string>('gemini.model') ?? 'gemini-1.5-flash';
  }

  /**
   * Calls Gemini with a prompt and asks for JSON output.
   * Returns parsed JSON or null on failure.
   */
  async generateJson<T = any>(prompt: string): Promise<T | null> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    };

    try {
      const { data } = await firstValueFrom(this.http.post(url, body));
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return this.safeParse<T>(text);
    } catch (err) {
      this.logger.error(`Gemini request failed: ${err.message}`);
      return null;
    }
  }

  private safeParse<T>(text: string): T | null {
    try {
      const cleaned = text
        .replace(/^```json\s*/i, '')
        .replace(/```$/i, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch {
      this.logger.warn('Failed to parse Gemini JSON response');
      return null;
    }
  }
}
