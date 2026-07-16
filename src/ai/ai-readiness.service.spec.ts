import { Test } from '@nestjs/testing';
import { AiReadinessService } from './ai-readiness.service';
import { GeminiService } from './gemini.service';

describe('AiReadinessService', () => {
  let service: AiReadinessService;

  const geminiMock = {
    generateJson: jest.fn(),
  };

  const baseInput = {
    user: { age: 28, bmi: 22, capabilityScore: 70 },
    mountain: {
      name: 'Gunung Test',
      elevationM: 3000,
      difficulty: 'MODERATE',
      distanceToPeakKm: 8,
    },
    weather: { tempMeanC: 12, precipitationMm: 5 },
    memberCount: 2,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AiReadinessService,
        { provide: GeminiService, useValue: geminiMock },
      ],
    }).compile();

    service = moduleRef.get(AiReadinessService);
  });

  describe('assessReadiness', () => {
    it('uses Gemini result when available', async () => {
      geminiMock.generateJson.mockResolvedValue({
        readinessScore: 88,
        decision: 'GO',
        rationale: 'ok',
      });
      const result = await service.assessReadiness(baseInput as any);
      expect(result.readinessScore).toBe(88);
      expect(result.decision).toBe('GO');
    });

    it('falls back to heuristic when Gemini returns null', async () => {
      geminiMock.generateJson.mockResolvedValue(null);
      const result = await service.assessReadiness(baseInput as any);
      expect(result.readinessScore).toBeGreaterThanOrEqual(0);
      expect(result.readinessScore).toBeLessThanOrEqual(100);
      expect(['GO', 'CAUTION', 'NO_GO']).toContain(result.decision);
    });

    it('fallback returns NO_GO for very low capability + extreme mountain', async () => {
      geminiMock.generateJson.mockResolvedValue(null);
      const result = await service.assessReadiness({
        ...baseInput,
        user: { age: 50, bmi: 32, capabilityScore: 5 },
        mountain: { ...baseInput.mountain, difficulty: 'EXTREME' },
        weather: { tempMeanC: 5, precipitationMm: 40 },
      } as any);
      expect(result.decision).toBe('NO_GO');
    });
  });

  describe('suggestLogistics', () => {
    it('falls back to base packing list when Gemini fails', async () => {
      geminiMock.generateJson.mockResolvedValue(null);
      const items = await service.suggestLogistics(baseInput as any);
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((i) => i.itemName && i.category)).toBe(true);
    });
  });
});
