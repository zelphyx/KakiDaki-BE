import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MountainDiscoveryService } from './mountain-discovery.service';
import { CreateMountainDto } from './dto/create-mountain.dto';
import { UpdateMountainDto } from './dto/update-mountain.dto';
import { ImportMountainDto } from './dto/import-mountain.dto';

@Injectable()
export class MountainsService {
  constructor(
    private prisma: PrismaService,
    private discoveryService: MountainDiscoveryService,
  ) {}

  async findAll() {
    return this.prisma.mountain.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const mountain = await this.prisma.mountain.findUnique({ where: { id } });
    if (!mountain) throw new NotFoundException('Mountain not found');
    return mountain;
  }

  async create(dto: CreateMountainDto) {
    const existing = await this.prisma.mountain.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Mountain name already exists');

    return this.prisma.mountain.create({ data: { ...dto } });
  }

  async update(id: string, dto: UpdateMountainDto) {
    const mountain = await this.prisma.mountain.findUnique({ where: { id } });
    if (!mountain) throw new NotFoundException('Mountain not found');

    if (dto.name && dto.name !== mountain.name) {
      const existing = await this.prisma.mountain.findUnique({
        where: { name: dto.name },
      });
      if (existing) throw new ConflictException('Mountain name already exists');
    }

    return this.prisma.mountain.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string) {
    const mountain = await this.prisma.mountain.findUnique({ where: { id } });
    if (!mountain) throw new NotFoundException('Mountain not found');
    return this.prisma.mountain.delete({ where: { id } });
  }

  async search(query: string) {
    const imported = await this.prisma.mountain.findMany({
      select: { name: true },
    });
    const importedNames = imported.map((m) => m.name);
    return this.discoveryService.searchPeaks(query, importedNames);
  }

  async import(dto: ImportMountainDto) {
    const existing = await this.prisma.mountain.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Mountain already imported');

    // Auto-estimate difficulty and distance if not provided
    const difficulty = dto.difficulty
      ? dto.difficulty
      : this.discoveryService.estimateDifficulty(dto.elevationM);
    const distanceToPeakKm = dto.distanceToPeakKm
      ? dto.distanceToPeakKm
      : this.discoveryService.estimateDistance(dto.elevationM);

    return this.prisma.mountain.create({
      data: {
        name: dto.name,
        elevationM: dto.elevationM,
        difficulty: difficulty as any,
        distanceToPeakKm,
        latitude: dto.latitude,
        longitude: dto.longitude,
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
    });
  }
}