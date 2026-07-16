import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMountainDto, UpdateMountainDto } from './dto/mountain.dto';
import { MountainDiscoveryService } from './mountain-discovery.service';
import { ImportMountainDto } from './dto/discovery.dto';

@Injectable()
export class MountainsService {
  constructor(
    private prisma: PrismaService,
    private discovery: MountainDiscoveryService,
  ) {}

  create(dto: CreateMountainDto) {
    return this.prisma.mountain.create({ data: dto });
  }

  /**
   * Search public peaks (OpenStreetMap). Flags which are already imported.
   */
  async searchExternal(query: string) {
    const peaks = await this.discovery.searchPeaks(query);
    const names = peaks.map((p) => p.name);
    const existing = await this.prisma.mountain.findMany({
      where: { name: { in: names } },
      select: { name: true },
    });
    const existingSet = new Set(existing.map((e) => e.name));

    return peaks.map((p) => ({
      ...p,
      suggestedDifficulty: this.discovery.estimateDifficulty(p.elevationM),
      suggestedDistanceKm: this.discovery.estimateDistanceKm(p.elevationM),
      alreadyImported: existingSet.has(p.name),
    }));
  }

  /**
   * Import a peak from search results into the mountains table.
   */
  async importMountain(dto: ImportMountainDto) {
    const existing = await this.prisma.mountain.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Mountain already exists');
    }

    return this.prisma.mountain.create({
      data: {
        name: dto.name,
        elevationM: dto.elevationM,
        latitude: dto.latitude,
        longitude: dto.longitude,
        difficulty:
          dto.difficulty ?? this.discovery.estimateDifficulty(dto.elevationM),
        distanceToPeakKm:
          dto.distanceToPeakKm ??
          this.discovery.estimateDistanceKm(dto.elevationM),
        description: dto.description,
      },
    });
  }

  findAll() {
    return this.prisma.mountain.findMany({ orderBy: { name: 'asc' } });
  }

  async findOne(id: string) {
    const mountain = await this.prisma.mountain.findUnique({
      where: { id },
    });
    if (!mountain) throw new NotFoundException('Mountain not found');
    return mountain;
  }

  async update(id: string, dto: UpdateMountainDto) {
    await this.findOne(id);
    return this.prisma.mountain.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.mountain.delete({ where: { id } });
    return { message: 'Mountain deleted' };
  }
}
