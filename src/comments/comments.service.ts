import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateCommentDto) {
    const mountain = await this.prisma.mountain.findUnique({
      where: { id: dto.mountainId },
    });
    if (!mountain) throw new NotFoundException('Mountain not found');

    return this.prisma.comment.create({
      data: {
        userId,
        mountainId: dto.mountainId,
        trailName: dto.trailName,
        text: dto.text,
        imageUrl: dto.imageUrl,
      },
      include: {
        user: { select: { id: true, name: true } },
        mountain: { select: { id: true, name: true } },
      },
    });
  }

  listByMountain(mountainId: string) {
    // Public listing hides blocked comments
    return this.prisma.comment.findMany({
      where: { mountainId, isBlocked: false },
      include: {
        user: { select: { id: true, name: true } },
        mountain: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async vote(id: string, vote: 'up' | 'down') {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id },
      data:
        vote === 'up'
          ? { upvote: { increment: 1 } }
          : { downvote: { increment: 1 } },
    });
  }

  async remove(userId: string, id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) {
      throw new NotFoundException('Comment not found');
    }
    await this.prisma.comment.delete({ where: { id } });
    return { message: 'Comment deleted' };
  }

  // ===== Admin moderation =====

  /**
   * List all comments for a mountain including blocked ones (admin view).
   */
  listForAdmin(mountainId?: string) {
    return this.prisma.comment.findMany({
      where: mountainId ? { mountainId } : undefined,
      include: {
        user: { select: { id: true, name: true, email: true } },
        mountain: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async block(id: string, reason?: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id },
      data: {
        isBlocked: true,
        blockReason: reason ?? null,
        blockedAt: new Date(),
      },
    });
  }

  async unblock(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    return this.prisma.comment.update({
      where: { id },
      data: { isBlocked: false, blockReason: null, blockedAt: null },
    });
  }
}
