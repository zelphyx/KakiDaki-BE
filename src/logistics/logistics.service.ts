import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiReadinessService } from '../ai/ai-readiness.service';
import { WeatherService } from '../weather/weather.service';
import { CreateLogisticDto, UpdateLogisticDto } from './dto/logistic.dto';
import { LogisticCategory } from '@prisma/client';

@Injectable()
export class LogisticsService {
  constructor(
    private prisma: PrismaService,
    private ai: AiReadinessService,
    private weather: WeatherService,
  ) {}

  async listByExpedition(userId: string, expeditionId: string) {
    await this.assertOwnership(userId, expeditionId);
    return this.prisma.logistic.findMany({
      where: { expeditionId },
      orderBy: [{ isMandatory: 'desc' }, { category: 'asc' }],
    });
  }

  async addItem(
    userId: string,
    expeditionId: string,
    dto: CreateLogisticDto,
  ) {
    await this.assertOwnership(userId, expeditionId);
    return this.prisma.logistic.create({
      data: { expeditionId, ...dto },
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateLogisticDto) {
    const item = await this.prisma.logistic.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Logistic item not found');
    await this.assertOwnership(userId, item.expeditionId);
    return this.prisma.logistic.update({ where: { id: itemId }, data: dto });
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.prisma.logistic.findUnique({
      where: { id: itemId },
    });
    if (!item) throw new NotFoundException('Logistic item not found');
    await this.assertOwnership(userId, item.expeditionId);
    await this.prisma.logistic.delete({ where: { id: itemId } });
    return { message: 'Item removed' };
  }

  /**
   * Generate AI-suggested packing list for the expedition and persist it.
   */
  async generateSuggestions(userId: string, expeditionId: string) {
    const expedition = await this.prisma.expedition.findFirst({
      where: { id: expeditionId, userId },
      include: { mountain: true },
    });
    if (!expedition) throw new NotFoundException('Expedition not found');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    const forecasts = await this.weather.getForecast(
      expedition.mountain.latitude,
      expedition.mountain.longitude,
      expedition.startDate,
      expedition.endDate,
    );
    const climbDay = forecasts[0];

    const suggestions = await this.ai.suggestLogistics({
      user: { medicalHistory: user?.medicalHistory },
      mountain: {
        name: expedition.mountain.name,
        elevationM: expedition.mountain.elevationM,
        difficulty: expedition.mountain.difficulty,
        distanceToPeakKm: expedition.mountain.distanceToPeakKm,
      },
      weather: {
        tempMeanC: climbDay?.tempMeanC,
        precipitationMm: climbDay?.precipitationMm,
        windSpeedMax: climbDay?.windSpeedMax,
        summary: climbDay?.summary,
      },
      memberCount: expedition.memberCount,
    });

    // Replace existing AI-generated set: clear then insert
    await this.prisma.logistic.deleteMany({ where: { expeditionId } });

    const created = await this.prisma.$transaction(
      suggestions.map((s) =>
        this.prisma.logistic.create({
          data: {
            expeditionId,
            itemName: s.itemName,
            amount: s.amount,
            category: this.mapCategory(s.category),
            isMandatory: !!s.isMandatory,
            note: s.note,
          },
        }),
      ),
    );

    return created;
  }

  private mapCategory(value: string): LogisticCategory {
    const upper = (value || '').toUpperCase();
    if (upper in LogisticCategory) {
      return LogisticCategory[upper as keyof typeof LogisticCategory];
    }
    return LogisticCategory.OTHER;
  }

  private async assertOwnership(userId: string, expeditionId: string) {
    const expedition = await this.prisma.expedition.findFirst({
      where: { id: expeditionId, userId },
    });
    if (!expedition) {
      throw new ForbiddenException('You do not own this expedition');
    }
  }
}
