import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockCommentDto, AdminCreateMountainDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isPro: true,
        prepCredits: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async blockComment(commentId: string, dto: BlockCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isBlocked: true,
        blockReason: dto.blockReason,
        blockedAt: new Date(),
      },
    });
  }

  async createMountain(dto: AdminCreateMountainDto) {
    const existing = await this.prisma.mountain.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(`Mountain with name ${dto.name} already exists`);
    }

    return this.prisma.mountain.create({
      data: {
        name: dto.name,
        elevationM: dto.elevationM,
        difficulty: dto.difficulty,
        distanceToPeakKm: dto.distanceToPeakKm,
        latitude: dto.latitude ?? 0,
        longitude: dto.longitude ?? 0,
        baseTempC: dto.baseTempC,
        description: dto.description,
        imageUrl: dto.imageUrl,
      },
    });
  }
}
